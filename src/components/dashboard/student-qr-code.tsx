
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Student } from "@/lib/mock-data";
import { Loader2, QrCode, AlertTriangle, Download } from "lucide-react";
import QRCode from "qrcode";

type StudentQrCodeProps = {
  student: Student | null;
};

export function StudentQrCode({ student }: StudentQrCodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateCombinedImage = async (qrCodeValue: string) => {
      if (!student) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas not available");
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

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
      const qrDataUrl = await QRCode.toDataURL(qrCodeValue, { width: qrSize, margin: 0 });
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
      
      return canvas.toDataURL("image/png");
    };

    const handleGenerate = async () => {
      if (!student || !student.qrCode) {
        setError("Student data is missing the required QR code value.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setQrCodeDataUri(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        const dataUri = await generateCombinedImage(student.qrCode);
        setQrCodeDataUri(dataUri);
      } catch (e) {
        setError("An unexpected error occurred while generating the QR code.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    handleGenerate();

  }, [student]);

  const handleSave = () => {
    if (qrCodeDataUri && student) {
      const link = document.createElement("a");
      link.href = qrCodeDataUri;
      link.download = `${student.name.replace(/\s+/g, '_').toLowerCase()}_qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!student) return null;

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col items-center text-center gap-4">
        {isLoading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating QR Code...</p>
            <Skeleton className="h-[340px] w-full max-w-[296px] rounded-lg" />
          </>
        ) : qrCodeDataUri ? (
          <div className="space-y-4">
             <div className="w-full max-w-[296px] mx-auto">
                 <Image
                    src={qrCodeDataUri}
                    alt={`QR Code for ${student.name}`}
                    width={296}
                    height={340}
                    className="rounded-lg shadow-md w-full h-auto"
                    sizes="(max-width: 640px) 100vw, 296px"
                />
            </div>
             <Button onClick={handleSave} disabled={!qrCodeDataUri || isLoading} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Save Image
            </Button>
          </div>
        ) : (
            <div
            className="w-full max-w-[296px] mx-auto h-[340px] bg-muted/50 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4"
          >
            <QrCode className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-semibold">Could not generate QR Code</p>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
