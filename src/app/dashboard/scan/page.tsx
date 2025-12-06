
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, XCircle, Info } from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import type { Student, Schedule } from "@/lib/mock-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Html5Qrcode, Html5QrcodeError, Html5QrcodeResult } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { format, addMinutes, parse, isWithinInterval } from "date-fns";

type ScanStatus = "idle" | "scanning" | "error" | "stopped";
type CameraDevice = {
    id: string;
    label: string;
};

// Function to play a beep sound
const playBeep = (success = true) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = success ? 'sine' : 'sawtooth';
  oscillator.frequency.setValueAtTime(success ? 880 : 440, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
};

export default function ScanPage() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTime = useRef(0);
  const isHandlingScan = useRef(false);

  const dayOfWeek = format(new Date(), 'EEEE');

  const schedulesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid),
      where("dayOfWeek", "==", dayOfWeek)
    );
  }, [firestore, user?.uid, dayOfWeek]);

  const { data: schedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        Html5Qrcode.getCameras().then(devices => {
          if (devices && devices.length) {
            setCameras(devices);
            setSelectedCameraId(devices[0].id);
          }
        }).catch(err => {
          console.error("Error getting cameras", err);
          toast({ variant: "destructive", title: "Camera Error", description: "Could not list available cameras." });
        });

        stream.getTracks().forEach(track => track.stop());

      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
  }, [toast]);
  

  const startScanner = () => {
    if (!selectedCameraId || !hasCameraPermission) {
        toast({ variant: "destructive", title: "Camera Error", description: "Camera not available or permission denied." });
        return;
    }
    
    setLastScannedStudent(null);
    setStatus("scanning"); 

    const onScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
        const now = Date.now();
        if (now - lastScanTime.current < 3000 || isHandlingScan.current) { // Increased throttle
            return; 
        }
        lastScanTime.current = now;
        isHandlingScan.current = true;
        handleScan(decodedText);
    };

    const onScanError = (error: string | Html5QrcodeError) => {
       // This callback is required but we can leave it empty to avoid spamming the console.
    };
    
    const qrCode = new Html5Qrcode("reader", false);
    html5QrcodeRef.current = qrCode;

    qrCode.start(
        selectedCameraId,
        { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.8);
              return { width: qrboxSize, height: qrboxSize };
            }
        },
        onScanSuccess,
        onScanError
    ).catch((err) => {
        console.error("Error starting scanner", err);
        toast({ variant: "destructive", title: "Scanner Failed", description: "Could not start the QR code scanner." });
        setStatus("error");
    });
  }

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => {
        setStatus("stopped");
      }).catch(error => {
          console.error("Failed to stop html5QrcodeScanner.", error);
      });
    } else {
        setStatus("stopped");
    }
  }

  useEffect(() => {
    return () => {
        if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().catch(error => {
                console.error("Failed to clear html5QrcodeScanner on unmount.", error);
            });
        }
    };
  }, []);

  const handleScan = async (scannedValue: string) => {
    if (!user || !firestore || !schedules) {
      isHandlingScan.current = false;
      return;
    }
  
    try {
      const studentsRef = collection(firestore, 'students');
      const studentQuery = query(studentsRef, where('qrCode', '==', scannedValue));
      const studentSnapshot = await getDocs(studentQuery);
  
      if (studentSnapshot.empty) {
        playBeep(false);
        toast({ variant: "destructive", title: "Invalid QR Code", description: "Student not found." });
        setLastScannedStudent(null);
        return;
      }
  
      const studentDoc = studentSnapshot.docs[0];
      const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
  
      if (!studentData.teacherIds.includes(user.uid)) {
        playBeep(false);
        toast({ variant: "destructive", title: "Access Denied", description: `You are not a teacher for ${studentData.name}.` });
        setLastScannedStudent(null);
        return;
      }
      
      const now = new Date();
      const todayString = format(now, 'yyyy-MM-dd');
      
      const currentSchedules = schedules.filter(s => {
        const startTime = parse(s.startTime, "HH:mm", now);
        const endTime = parse(s.endTime, "HH:mm", now);
        return s.grade === studentData.grade && s.section === studentData.section && isWithinInterval(now, { start: startTime, end: endTime });
      });

      if (currentSchedules.length === 0) {
        playBeep(false);
        toast({ variant: "destructive", title: "No Active Class", description: `${studentData.name} does not have a class scheduled right now.` });
        return;
      }

      // In case of multiple overlapping schedules, we'll just take the first one.
      const studentSchedule = currentSchedules[0];
      
      const startTime = parse(studentSchedule.startTime, "HH:mm", now);
      const lateTime = addMinutes(startTime, studentSchedule.lateAfterMinutes);

      let status: "Present" | "Late" = now <= lateTime ? "Present" : "Late";
      
      const attendanceRef = collection(firestore, "attendance");
      const attendanceQuery = query(
        attendanceRef,
        where('studentId', '==', studentData.id),
        where('date', '==', todayString),
        where('teacherId', '==', user.uid),
        where('subject', '==', studentSchedule.subject)
      );
  
      const attendanceSnapshot = await getDocs(attendanceQuery);
  
      if (!attendanceSnapshot.empty) {
        playBeep();
        toast({
          title: "Already Logged",
          description: `${studentData.name} has already been marked as ${attendanceSnapshot.docs[0].data().status} for ${studentSchedule.subject} today.`,
        });
        setLastScannedStudent(studentData);
        return;
      }
      
      const newRecord = {
        studentId: studentData.id,
        studentName: studentData.name,
        teacherId: user.uid,
        date: todayString,
        status: status,
        subject: studentSchedule.subject,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, "attendance"), newRecord)
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: attendanceRef.path,
                operation: 'create',
                requestResourceData: newRecord,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw new Error("Could not log attendance. Check permissions.");
        });

      playBeep();
      const statusMessage = status === "Present" ? "Present" : `Late for ${studentSchedule.subject}`;
      toast({
        title: status === "Present" ? "Success" : "Marked as Late",
        description: `${studentData.name}'s attendance has been logged as ${statusMessage}.`,
        className: status === 'Present' ? "bg-green-100 dark:bg-green-900" : "bg-yellow-100 dark:bg-yellow-900",
      });
      setLastScannedStudent(studentData);
  
    } catch (err: any) {
      playBeep(false);
      console.error('Error during scan handling:', err);
      toast({
        variant: "destructive",
        title: "Scan Error",
        description: err.message || 'An unexpected error occurred.',
      });
      setLastScannedStudent(null);
    } finally {
      isHandlingScan.current = false;
    }
  };
  
  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Scan Attendance</h1>
          <p className="text-muted-foreground">Use your device's camera to take daily attendance.</p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>QR Code Scanner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col items-center">
            
            <div className="w-full max-w-md aspect-square bg-muted rounded-lg flex items-center justify-center text-center border-2 border-dashed relative overflow-hidden">
                <div id="reader" className="w-full h-full" />
                {status !== 'scanning' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted p-4">
                        <Camera className="h-16 w-16 mx-auto mb-4" />
                        <p className="font-semibold text-center">Camera is off</p>
                    </div>
                )}
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="camera-select">Select Camera</Label>
                 <Select value={selectedCameraId} onValueChange={setSelectedCameraId} disabled={status === 'scanning' || cameras.length === 0 || !hasCameraPermission}>
                    <SelectTrigger id="camera-select">
                        <SelectValue placeholder="Select a camera" />
                    </SelectTrigger>
                    <SelectContent>
                        {cameras.map(camera => (
                            <SelectItem key={camera.id} value={camera.id}>{camera.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                  {status !== 'scanning' ? (
                      <Button onClick={startScanner} size="lg" disabled={!hasCameraPermission || cameras.length === 0}>Start Scan</Button>
                  ) : (
                      <Button onClick={stopScanner} variant="destructive" size="lg">Stop Scan</Button>
                  )}
              </div>
            </div>


            <div className="w-full max-w-md h-16 text-center">
              {!hasCameraPermission && status !== 'error' && (
                  <Alert variant="destructive">
                      <AlertTitle>Camera Access Required</AlertTitle>
                      <AlertDescription>
                          Please allow camera access to use this feature.
                      </AlertDescription>
                  </Alert>
              )}
              {lastScannedStudent && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">Last Scan:</p>
                  <p className="font-semibold text-lg">{lastScannedStudent.name}</p>
                </div>
              )}
              {status === 'error' && (
                  <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                          Could not start scanner. Please ensure permissions are enabled.
                      </AlertDescription>
                  </Alert>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </main>
  );
}
