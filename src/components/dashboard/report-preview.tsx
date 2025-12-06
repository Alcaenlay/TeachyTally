
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ArrowLeft } from "lucide-react";
import { Badge } from "../ui/badge";

export type PreviewData = {
  headers: string[];
  rows: any[];
  groupName: string;
};

type ReportPreviewProps = {
  data: PreviewData;
  onBack: () => void;
  onDownload: (data: any[], groupName: string) => void;
};

export function ReportPreview({ data, onBack, onDownload }: ReportPreviewProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const getStatusBadge = (status: 'p' | 'l' | 'a') => {
    switch(status) {
      case 'p': return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">P</Badge>;
      case 'l': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">L</Badge>;
      case 'a': return <Badge variant="destructive">A</Badge>;
      default: return status;
    }
  }

  return (
    <div className="flex flex-col h-[75vh]">
      <DialogHeader>
        <DialogTitle>Report Preview: {data.groupName}</DialogTitle>
        <DialogDescription>
          Review the attendance data below. You can download it as an Excel file.
          (P = Present, L = Late, A = Absent)
        </DialogDescription>
      </DialogHeader>

      <div className="flex-grow py-4 overflow-hidden">
        <ScrollArea className="h-full">
            <div ref={componentRef}>
                <Table>
                    <TableHeader>
                    <TableRow>
                        {data.headers.map((header) => (
                        <TableHead key={header} className={header === 'Student Name' ? 'text-left sticky left-0 bg-background' : 'text-center'}>
                            {header.includes('-') ? header.substring(5) : header}
                        </TableHead>
                        ))}
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {data.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                        {data.headers.map((header, colIndex) => (
                            <TableCell
                            key={colIndex}
                            className={header === 'Student Name' ? 'font-medium text-left sticky left-0 bg-background' : 'text-center'}
                            >
                            {header === 'Student Name' || header === 'Grade' || header === 'Section' ? row[header] : getStatusBadge(row[header])}
                            </TableCell>
                        ))}
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
      </div>

      <DialogFooter className="pt-4 border-t no-print">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-grow" />
        <Button onClick={() => onDownload(data.rows, data.groupName)}>
          <Download className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </DialogFooter>
    </div>
  );
}
