
"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { Loader2, Upload, FileText } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import type { Teacher } from "@/lib/mock-data";

type StudentData = {
  name: string;
  grade: string;
  section: string;
};

type UploadStudentsDialogProps = {
  teacher: Teacher | null;
};

export function UploadStudentsDialog({ teacher }: UploadStudentsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const parsedStudents = json.map((row) => ({
          name: String(row.Name || row.name || ""),
          grade: String(row.Grade || row.grade || ""),
          section: String(row.Section || row.section || ""),
        })).filter(s => s.name && s.grade && s.section);

        if(parsedStudents.length === 0) {
            toast({
                variant: "destructive",
                title: "File Error",
                description: "No valid students found. Ensure columns are named 'Name', 'Grade', and 'Section'.",
            });
        }
        setStudents(parsedStudents);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          variant: "destructive",
          title: "File Error",
          description: "Could not parse the uploaded file. Please check the format.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        setIsLoading(false);
         toast({
          variant: "destructive",
          title: "File Error",
          description: "Could not read the uploaded file.",
        });
    }
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to import students." });
      return;
    }
    if (students.length === 0) {
      toast({ variant: "destructive", title: "No Students", description: "No students to import." });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    
    try {
        const batch = writeBatch(firestore);
        const studentsRef = collection(firestore, "students");

        for (const student of students) {
            const newStudentDocRef = doc(studentsRef); // Create a new doc reference with a unique ID
            batch.set(newStudentDocRef, {
                ...student,
                id: newStudentDocRef.id,
                teacherIds: [user.uid],
                qrCode: newStudentDocRef.id, // Set the QR code to the document's own ID
                schoolName: teacher?.schoolName || "",
            });
            successCount++;
        }
        
        await batch.commit();

        toast({
            title: "Import Successful",
            description: `${successCount} of ${students.length} students have been added.`,
        });
        resetState();

    } catch (error) {
         console.error("Error importing students:", error);
         toast({
            variant: "destructive",
            title: "Import Error",
            description: "An error occurred while importing students.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const resetState = () => {
    setIsOpen(false);
    setFileName(null);
    setStudents([]);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Student Roster</DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx) or CSV file with "Name", "Grade", and "Section" columns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div 
                className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 py-10 text-center hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
            >
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                <p className="mt-2 text-sm text-muted-foreground">
                    {fileName ? `File: ${fileName}` : "Click or drag file to upload"}
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    disabled={isLoading}
                />
            </div>
          {students.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">{students.length} students found:</h4>
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                    {students.map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-background rounded">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground">{s.grade} - {s.section}</span>
                        </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetState}>Cancel</Button>
          <Button onClick={handleImport} disabled={isLoading || students.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import {students.length > 0 ? students.length : ''} Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    