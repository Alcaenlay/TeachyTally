
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
        <CardTitle>Daily Log</CardTitle>
        <CardDescription>
          Showing attendance for the selected date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
            <TooltipProvider>
              <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                       <TableCell>{record.subject}</TableCell>
                      <TableCell>
                          <Badge variant={record.status === 'Absent' ? 'destructive' : 'secondary'} className={getBadgeVariant(record.status)}>
                            {record.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatTime(record.createdAt)}</TableCell>
                      </TableRow>
                  ))
                  ) : (
                  <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                      No attendance records for this date.
                      </TableCell>
                  </TableRow>
                  )}
              </TableBody>
              </Table>
            </TooltipProvider>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
