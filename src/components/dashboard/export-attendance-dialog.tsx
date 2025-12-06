
"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, Download, Eye } from "lucide-react";
import type { Student, Schedule, AttendanceRecord } from "@/lib/mock-data";
import { format, eachDayOfInterval } from "date-fns";
import { Label } from "../ui/label";
import { ReportPreview, type PreviewData } from "./report-preview";

type ExportAttendanceDialogProps = {
  students: Student[];
  schedules: Schedule[];
};

export function ExportAttendanceDialog({ students, schedules }: ExportAttendanceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date | null; to?: Date | null } | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const studentGroups = useMemo(() => {
    if (!schedules) return [];
    const uniqueGroups = new Set(schedules.map(s => `${s.grade} - ${s.section}`));
    return Array.from(uniqueGroups).sort();
  }, [schedules]);

  const handleGeneratePreview = async () => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    if (!selectedGroup) {
      toast({ variant: "destructive", title: "No Class Selected", description: "Please select a class to export." });
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
        toast({ variant: "destructive", title: "Invalid Range", description: "Please select a start and end date." });
        return;
    }
    if (!schedules) {
        toast({ title: "No Schedules", description: "Schedules are not loaded yet, please try again in a moment." });
        return;
    }

    setIsLoading(true);
    setPreviewData(null);
    
    try {
      const [grade, section] = selectedGroup.split(" - ");
      const studentsToExport = students.filter(s => s.grade === grade && s.section === section) || [];

      if (studentsToExport.length === 0) {
        toast({ variant: "destructive", title: "No Students", description: "There are no students to export for the selected class." });
        setIsLoading(false);
        return;
      }

      const relevantSchedules = schedules.filter(s => s.grade === grade && s.section === section);
      const interval = { start: dateRange.from, end: dateRange.to };
      const allDays = eachDayOfInterval(interval);

      const scheduledDates = allDays
        .filter(day => {
          const dayOfWeek = format(day, "EEEE");
          return relevantSchedules.some(s => s.dayOfWeek === dayOfWeek);
        })
        .map(day => ({ key: format(day, "yyyy-MM-dd"), label: format(day, "MM/dd/yyyy") }))
        .sort((a, b) => a.key.localeCompare(b.key));

      if (scheduledDates.length === 0) {
        toast({ title: "No Scheduled Classes", description: "No scheduled classes found for the selected group in this date range." });
        setIsLoading(false);
        return;
      }
      
      const q = query(
        collection(firestore, "attendance"),
        where("teacherId", "==", user.uid),
        where("date", ">=", format(interval.start, "yyyy-MM-dd")),
        where("date", "<=", format(interval.end, "yyyy-MM-dd"))
      );
      
      const attendanceSnapshot = await getDocs(q);
      const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);

      const dataForSheet = studentsToExport.map(student => {
        const row: { [key: string]: string } = { "Student Name": student.name, "Grade": student.grade, "Section": student.section };
        
        scheduledDates.forEach(d => {
          const record = attendanceRecords.find(
            ar => ar.studentId === student.id && ar.date === d.key
          );
          let statusAbbreviation: "p" | "l" | "a" = "a";
          if (record) {
             switch (record.status) {
              case "Present": statusAbbreviation = "p"; break;
              case "Late": statusAbbreviation = "l"; break;
              default: statusAbbreviation = "a";
             }
          }
          row[d.label] = statusAbbreviation;
        });
        return row;
      });

      if (dataForSheet.length === 0) {
        toast({ title: "No Data", description: "No attendance data could be generated for the selected criteria." });
        setIsLoading(false);
        return;
      }

      setPreviewData({
        headers: ["Student Name", ...scheduledDates.map(d => d.label)],
        rows: dataForSheet,
        groupName: selectedGroup,
      });

    } catch (error: any) {
      console.error("Export failed", error);
      toast({ variant: "destructive", title: "Export Failed", description: `An error occurred: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (dataToExport: any[], groupName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance_report_${groupName.replace(' - ','_')}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const resetState = () => {
    setIsOpen(false);
    setSelectedGroup("");
    setDateRange(undefined);
    setPreviewData(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </DialogTrigger>
      <DialogContent className={previewData ? "max-w-4xl" : "sm:max-w-md"}>
        {!previewData ? (
          <>
            <DialogHeader>
              <DialogTitle>Export Attendance Report</DialogTitle>
              <DialogDescription>
                Select a class and date range to export attendance records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
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
              
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="sr-only">From</Label>
                      <Input
                        type="date"
                        value={dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDateRange(prev => ({ ...(prev || {}), from: val ? new Date(val) : null }));
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="sr-only">To</Label>
                      <Input
                        type="date"
                        value={dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDateRange(prev => ({ ...(prev || {}), to: val ? new Date(val) : null }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mt-2">
                    {dateRange?.from ? format(dateRange.from, "MM/dd/yyyy") : "MM/DD/YYYY"}
                    {dateRange?.from && dateRange?.to ? ` - ${format(dateRange.to, "MM/dd/yyyy")}` : ""}
                  </div>
                </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={resetState}>Cancel</Button>
              <Button onClick={handleGeneratePreview} disabled={isLoading || !selectedGroup}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Generate Preview
              </Button>
            </DialogFooter>
          </>
        ) : (
           <ReportPreview
            data={previewData}
            onBack={() => setPreviewData(null)}
            onDownload={handleDownload}
           />
        )}
      </DialogContent>
    </Dialog>
  );
}
