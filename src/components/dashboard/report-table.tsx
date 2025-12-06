
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

type CombinedRecord = {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  subject: string;
  createdAt: any; // Firestore Timestamp
};


type ReportTableProps = {
  attendanceRecords: CombinedRecord[];
};

export default function ReportTable({ attendanceRecords }: ReportTableProps) {
  const formatTime = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) {
      return "—";
    }
    return format(timestamp.toDate(), "p"); // e.g., "8:32 AM"
  };

  const getBadgeVariant = (status: "Present" | "Absent" | "Late") => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      case "Absent":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
      case "Late":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
      default:
        return "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Daily Log</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Attendance for the selected date.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="w-full overflow-x-auto">
          <div className="min-w-max md:min-w-full">
            <TooltipProvider>
              <Table className="text-xs md:text-sm">
              <TableHeader>
                  <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[110px] px-1 py-2">Student</TableHead>
                  <TableHead className="min-w-[80px] px-1 py-2">Subject</TableHead>
                  <TableHead className="min-w-[65px] px-1 py-2">Status</TableHead>
                  <TableHead className="text-right min-w-[60px] px-1 py-2">Time</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs px-1 py-2">{record.studentName}</TableCell>
                       <TableCell className="text-xs px-1 py-2">{record.subject}</TableCell>
                      <TableCell className="px-1 py-2">
                          <Badge variant={record.status === 'Absent' ? 'destructive' : 'secondary'} className={`${getBadgeVariant(record.status)} text-xs px-1 py-0`}>
                            {record.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs px-1 py-2">{formatTime(record.createdAt)}</TableCell>
                      </TableRow>
                  ))
                  ) : (
                  <TableRow>
                      <TableCell colSpan={4} className="h-16 text-center text-xs">
                      No records.
                      </TableCell>
                  </TableRow>
                  )}
              </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
