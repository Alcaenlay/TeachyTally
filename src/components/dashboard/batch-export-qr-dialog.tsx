
"use client";

import { useState, useRef } from "react";
import JSZip from "jszip";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, QrCode } from "lucide-react";
import type { Student } from "@/lib/mock-data";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";

type BatchExportQrDialogProps = {
  studentGroups: string[];
  students: Student[];
};

export function BatchExportQrDialog({ studentGroups, students }: BatchExportQrDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQrImage = async (student: Student, canvas: HTMLCanvasElement): Promise<Blob | null> => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const qrSize = 256;
      const padding = 20;
      const textLineHeight = 24;
      const nameFontSize = 20;
      const detailsFontSize = 16;
      const totalHeight = qrSize + padding * 3 + textLineHeight * 2;
      
      canvas.width = qrSize + padding * 2;
      canvas.height = totalHeight;

      // Background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR Code
      const qrDataUrl = await QRCode.toDataURL(student.qrCode, { width: qrSize, margin: 0 });
      const qrImage = new window.Image();
      
      const imageLoaded = new Promise<void>((resolve, reject) => {
        qrImage.onload = () => resolve();
        qrImage.onerror = reject;
        qrImage.src = qrDataUrl;
      });

      await imageLoaded;
      ctx.drawImage(qrImage, padding, padding);

      // Draw Text
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.font = `bold ${nameFontSize}px sans-serif`;
      ctx.fillText(student.name, canvas.width / 2, qrSize + padding * 2 + nameFontSize);
      ctx.font = `${detailsFontSize}px sans-serif`;
      ctx.fillStyle = "#555";
      ctx.fillText(
        `${student.grade} - ${student.section}`,
        canvas.width / 2,
        qrSize + padding * 2 + nameFontSize + textLineHeight
      );
      
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };


  const handleExport = async () => {
    if (!selectedGroup) {
      toast({ variant: "destructive", title: "No Class Selected", description: "Please select a class to export." });
      return;
    }
    if (!canvasRef.current) {
        toast({ variant: "destructive", title: "Error", description: "Canvas element not ready." });
        return;
    }

    setIsLoading(true);
    setProgress(0);

    const [grade, section] = selectedGroup.split(" - ");
    const studentsToExport = students.filter(s => s.grade === grade && s.section === section);

    if (studentsToExport.length === 0) {
        toast({ variant: "destructive", title: "No students in class", description: `There are no students in ${selectedGroup} to export.` });
        setIsLoading(false);
        return;
    }

    const zip = new JSZip();
    const canvas = canvasRef.current;

    try {
        for (let i = 0; i < studentsToExport.length; i++) {
            const student = studentsToExport[i];
            const blob = await generateQrImage(student, canvas);
            if (blob) {
                const fileName = `${student.name.replace(/\s/g, '_')}_${student.grade}-${student.section}.png`;
                zip.file(fileName, blob);
            }
            setProgress(((i + 1) / studentsToExport.length) * 100);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, `qrcodes_${grade}_${section}.zip`);

        toast({
            title: "Export Successful",
            description: `Generated a ZIP file with ${studentsToExport.length} QR codes.`,
        });
        resetState();
    } catch (error) {
        console.error("Failed to generate ZIP", error);
        toast({ variant: "destructive", title: "Export Failed", description: "Could not generate the ZIP file." });
    } finally {
        setIsLoading(false);
        setProgress(0);
    }
  };

  const resetState = () => {
    setIsOpen(false);
    setSelectedGroup("");
    setProgress(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode className="mr-2 h-4 w-4" />
          Export QR Codes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Export QR Codes</DialogTitle>
          <DialogDescription>
            Download a ZIP file containing all QR codes for a selected class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                        {studentGroups.map((group) => (
                            <SelectItem key={group} value={group}>
                            {group}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {isLoading && (
                <div className="space-y-2 pt-2">
                    <Label>Generating...</Label>
                    <Progress value={progress} />
                    <p className="text-sm text-center text-muted-foreground">{Math.round(progress)}%</p>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetState} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExport} disabled={isLoading || !selectedGroup}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download ZIP
          </Button>
        </DialogFooter>
         <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
}
