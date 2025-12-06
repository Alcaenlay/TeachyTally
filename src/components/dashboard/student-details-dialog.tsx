
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Student, AttendanceRecord, Schedule, Grade } from "@/lib/mock-data";
import { format, isBefore, startOfDay, eachDayOfInterval, getYear, subYears } from "date-fns";
import { StudentQrCode } from "./student-qr-code";
import { GraduationCap } from "lucide-react";

type StudentDetailsDialogProps = {
    student: Student | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
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

export function StudentDetailsDialog({ student, isOpen, onOpenChange }: StudentDetailsDialogProps) {
  const { firestore, user } = useFirebase();

  const allTeacherAttendanceQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(firestore, "attendance"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user]);

  const { data: allTeacherAttendance, isLoading: isLoadingAllAttendance } = useCollection<AttendanceRecord>(allTeacherAttendanceQuery);

  const schedulesQuery = useMemoFirebase(() => {
    if (!user?.uid || !student) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid),
      where("grade", "==", student.grade),
      where("section", "==", student.section)
    );
  }, [firestore, user, student]);

  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<Schedule>(schedulesQuery);
  
  const allStudentsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(firestore, "students"), 
      where("teacherIds", "array-contains", user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection<Student>(allStudentsQuery);

  const studentGradesQuery = useMemoFirebase(() => {
    if (!user?.uid || !student?.id) return null;
    return query(
      collection(firestore, "grades"),
      where("teacherId", "==", user.uid),
      where("studentId", "==", student.id),
      orderBy("date", "desc")
    );
  }, [firestore, user, student]);
  
  const { data: studentGrades, isLoading: isLoadingGrades } = useCollection<Grade>(studentGradesQuery);

  const isLoading = isLoadingAllAttendance || isLoadingSchedules || isLoadingAllStudents || isLoadingGrades;

  const allRecords = useMemo(() => {
    if (isLoading || !schedules || !student || !allTeacherAttendance || !allStudents) return [];

    const studentMap = new Map(allStudents.map(s => [s.id, s]));
    
    const classAttendanceByDate = new Map<string, Set<string>>();
    for (const record of allTeacherAttendance) {
        const studentData = studentMap.get(record.studentId);
        if (studentData) {
            const classKey = `${studentData.grade}-${studentData.section}-${record.subject}`;
            if (!classAttendanceByDate.has(record.date)) {
                classAttendanceByDate.set(record.date, new Set());
            }
            classAttendanceByDate.get(record.date)!.add(classKey);
        }
    }

    const studentAttendanceRecords = allTeacherAttendance.filter(rec => rec.studentId === student.id);
    const attendedDateAndSubject = new Set(studentAttendanceRecords.map(r => `${r.date}|${r.subject}`));
    const absentRecords: AttendanceRecord[] = [];

    if (schedules.length > 0) {
        const schoolYearStart = subYears(new Date(), 1);
        schoolYearStart.setMonth(7); schoolYearStart.setDate(1); // Start from Aug 1st of last year

        const daysToCheck = eachDayOfInterval({ start: schoolYearStart, end: startOfDay(new Date()) });

        for (const day of daysToCheck) {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayOfWeek = format(day, 'EEEE') as Schedule['dayOfWeek'];
            
            const studentSchedulesForDay = schedules.filter(s => s.dayOfWeek === dayOfWeek);

            for (const schedule of studentSchedulesForDay) {
                const studentClassKey = `${schedule.grade}-${schedule.section}-${schedule.subject}`;
                
                // 1. Did the class/subject have attendance on this day?
                const classHadAttendance = classAttendanceByDate.get(dateString)?.has(studentClassKey) ?? false;
                if (!classHadAttendance) continue;
                
                // 2. Did the student NOT attend this specific subject on this day?
                const studentAttended = attendedDateAndSubject.has(`${dateString}|${schedule.subject}`);
                if (studentAttended) continue;

                // If conditions met, they were absent for this subject.
                absentRecords.push({
                    id: `${dateString}-${student.id}-${schedule.subject}-absent`,
                    studentId: student.id,
                    studentName: student.name,
                    date: dateString,
                    status: "Absent",
                    teacherId: user!.uid,
                    subject: schedule.subject,
                    createdAt: null,
                });
            }
        }
    }
    
    return [...studentAttendanceRecords, ...absentRecords].sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.subject.localeCompare(b.subject);
    });
}, [isLoading, schedules, student, allTeacherAttendance, allStudents, user]);


  const stats = useMemo(() => {
    if (!allRecords) return { present: 0, late: 0, absent: 0, total: 0 };
    return {
        present: allRecords.filter(r => r.status === 'Present').length,
        late: allRecords.filter(r => r.status === 'Late').length,
        absent: allRecords.filter(r => r.status === 'Absent').length,
        total: allRecords.length
    }
  }, [allRecords]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-[calc(100%-2rem)] max-w-4xl rounded-lg">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            {student && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">{student.name}</DialogTitle>
                  <DialogDescription>
                    {student.grade} - {student.section}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col md:grid md:grid-cols-2 gap-8 py-4">
                    <div className="order-last md:order-first">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Attendance History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4 text-center">
                                    <div className="p-2 bg-muted/50 rounded-md">
                                        <div className="text-xs text-muted-foreground">Total Days</div>
                                        {isLoading ? <Skeleton className="h-6 w-8 mx-auto mt-1"/> : <div className="text-xl font-bold">{stats.total}</div>}
                                    </div>
                                    <div className="p-2 bg-green-100/50 dark:bg-green-900/20 rounded-md">
                                        <div className="text-xs text-green-700 dark:text-green-300">Present</div>
                                        {isLoading ? <Skeleton className="h-6 w-8 mx-auto mt-1"/> : <div className="text-xl font-bold text-green-600">{stats.present}</div>}
                                    </div>
                                    <div className="p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-md">
                                        <div className="text-xs text-yellow-700 dark:text-yellow-300">Late</div>
                                        {isLoading ? <Skeleton className="h-6 w-8 mx-auto mt-1"/> : <div className="text-xl font-bold text-yellow-600">{stats.late}</div>}
                                    </div>
                                    <div className="p-2 bg-red-100/50 dark:bg-red-900/20 rounded-md">
                                        <div className="text-xs text-red-700 dark:text-red-300">Absent</div>
                                        {isLoading ? <Skeleton className="h-6 w-8 mx-auto mt-1"/> : <div className="text-xl font-bold text-red-600">{stats.absent}</div>}
                                    </div>
                                </div>
                                <ScrollArea className="h-64">
                                    {isLoading ? (
                                        <div className="space-y-4">
                                            <Skeleton className="h-10 w-full" />
                                            <Skeleton className="h-10 w-full" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    ) : allRecords.length > 0 ? (
                                        <div className="space-y-2">
                                        {allRecords.map(record => (
                                            <div key={record.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                                <div className="flex-1">
                                                <div className="font-medium">{format(new Date(record.date.replace(/-/g, '/')), "PPP")}</div>
                                                <div className="text-xs text-muted-foreground">{record.subject}</div>
                                                </div>
                                                <Badge className={getBadgeVariant(record.status)} variant={record.status === 'Absent' ? 'destructive' : 'secondary'}>{record.status}</Badge>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-10">
                                            <p>No attendance records found.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-lg">Grade History</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <ScrollArea className="h-64">
                                    {isLoading ? (
                                        <div className="space-y-4">
                                            <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                                        </div>
                                    ) : studentGrades && studentGrades.length > 0 ? (
                                        <div className="space-y-2">
                                            {studentGrades.map(grade => (
                                                <div key={grade.id} className="flex items-center p-3 bg-muted/50 rounded-md">
                                                    <div className="mr-4 bg-primary/10 text-primary p-2 rounded-full">
                                                        <GraduationCap className="h-5 w-5"/>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold">{grade.title}</p>
                                                        <p className="text-sm text-muted-foreground">{grade.subject} &middot; {format(new Date(grade.date.replace(/-/g, '/')), "PPP")}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xl font-bold text-right">{grade.score}<span className="text-sm font-normal text-muted-foreground">/{grade.perfectScore}</span></p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                         <div className="text-center text-muted-foreground py-10">
                                            <p>No grade records found.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="order-first md:order-last">
                        <StudentQrCode student={student} />
                    </div>
                </div>
              </>
            )}
            {!student && (
              <div className="text-center py-10">
                <p>Select a student to view their details.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

    

    