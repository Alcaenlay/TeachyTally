
"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReportTable from "@/components/dashboard/report-table";
import AiSummary from "@/components/dashboard/ai-summary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { AttendanceRecord, Student, Schedule } from "@/lib/mock-data";
import { useState, useMemo } from "react";
import { addMinutes, format, parse, set } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportAttendanceDialog } from "@/components/dashboard/export-attendance-dialog";

type CombinedRecord = {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  grade: string;
  section: string;
  subject: string;
  createdAt: any;
};

export default function AttendanceReportsPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const dateString = format(selectedDate, "yyyy-MM-dd");
  const dayOfWeek = format(selectedDate, "EEEE"); // e.g., "Monday"

  const attendanceQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "attendance"),
      where("teacherId", "==", user.uid),
      where("date", "==", dateString)
    );
  }, [firestore, user?.uid, dateString, isUserLoading]);

  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

  const studentsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "students"),
      where("teacherIds", "array-contains", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
  
  const dailySchedulesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid),
      where("dayOfWeek", "==", dayOfWeek)
    );
  }, [firestore, user?.uid, dayOfWeek, isUserLoading]);
  
  const { data: dailySchedules, isLoading: isLoadingDailySchedules } = useCollection<Schedule>(dailySchedulesQuery);

  const allSchedulesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: allSchedules, isLoading: isLoadingAllSchedules } = useCollection<Schedule>(allSchedulesQuery);


  const isLoading = isUserLoading || isLoadingAttendance || isLoadingStudents || isLoadingDailySchedules || isLoadingAllSchedules;

  const combinedRecords = useMemo((): CombinedRecord[] => {
    if (isLoading || !students || !dailySchedules || !attendanceRecords) return [];
  
    // Map student ID to student object for quick lookup
    const studentMap = new Map(students.map(s => [s.id, s]));
  
    // Map schedule to a unique key: 'grade-section-subject'
    const scheduleSet = new Set(dailySchedules.map(s => `${s.grade}-${s.section}-${s.subject}`));
  
    const presentAndLateRecords: CombinedRecord[] = attendanceRecords.map(ar => {
      const student = studentMap.get(ar.studentId);
      return {
        ...ar,
        studentName: ar.studentName || student?.name || 'Unknown',
        grade: student?.grade || 'N/A',
        section: student?.section || 'N/A',
        subject: ar.subject || 'N/A',
      }
    });
  
    const absentRecords: CombinedRecord[] = [];
    const presentStudentIdsForSubject = new Map<string, Set<string>>(); // key: subject, value: Set<studentId>
  
    // Populate the map of who was present for which subject
    for (const record of presentAndLateRecords) {
      if (!presentStudentIdsForSubject.has(record.subject)) {
        presentStudentIdsForSubject.set(record.subject, new Set());
      }
      presentStudentIdsForSubject.get(record.subject)!.add(record.studentId);
    }
  
    // For each scheduled class, determine who was absent
    for (const schedule of dailySchedules) {
      const scheduleKey = `${schedule.grade}-${schedule.section}-${schedule.subject}`;
      if (scheduleSet.has(scheduleKey)) {
        const studentsInClass = students.filter(s => s.grade === schedule.grade && s.section === schedule.section);
        const presentIds = presentStudentIdsForSubject.get(schedule.subject) || new Set();
  
        const absentStudents = studentsInClass
          .filter(student => !presentIds.has(student.id))
          .map(student => ({
            id: `${dateString}-${student.id}-${schedule.subject}`,
            studentId: student.id,
            studentName: student.name,
            date: dateString,
            status: "Absent" as const,
            grade: student.grade,
            section: student.section,
            subject: schedule.subject,
            createdAt: null,
          }));
        absentRecords.push(...absentStudents);
      }
    }
  
    return [...presentAndLateRecords, ...absentRecords].sort((a, b) => 
      a.studentName.localeCompare(b.studentName) || a.subject.localeCompare(b.subject)
    );
  }, [students, attendanceRecords, dailySchedules, isLoading, dateString]);
  
  const groupedStudents = useMemo(() => {
    if (!students) return {};
    return students.reduce((acc: { [key: string]: Student[] }, student) => {
      const key = `${student.grade} - ${student.section}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(student);
      return acc;
    }, {});
  }, [students]);

  const sortedGroups = useMemo(() => {
    return Object.keys(groupedStudents).sort();
  }, [groupedStudents]);

  const filteredRecords = useMemo(() => {
    if (selectedGroup === 'all') {
      return combinedRecords;
    }
    const [grade, section] = selectedGroup.split(' - ');
    return combinedRecords.filter(r => r.grade === grade && r.section === section);
  }, [selectedGroup, combinedRecords]);

  const filteredAttendanceDataString = useMemo(() => {
    if (isLoading || !filteredRecords) return "[]";
    return JSON.stringify(filteredRecords, null, 2);
  }, [filteredRecords, isLoading]);

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Attendance Reports</h1>
          <p className="text-muted-foreground">Review attendance records and generate insights.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
           <ExportAttendanceDialog 
            students={students || []} 
            schedules={allSchedules || []}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full sm:w-auto justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{format(selectedDate, "PPP")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
          <div className="space-y-8">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                 <div>
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-full max-w-sm mt-2" />
                </div>
                <Skeleton className="h-10 w-44" />
              </CardHeader>
              <CardContent><Skeleton className="h-10 w-full" /></CardContent>
            </Card>
            <div className="flex flex-wrap items-center gap-2 pb-2">
               <Skeleton className="h-10 w-32" />
               <Skeleton className="h-10 w-24" />
               <Skeleton className="h-10 w-28" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            </Card>
          </div>
      ) : (
        <>
          <AiSummary 
            attendanceData={filteredAttendanceDataString} 
            teacherId={user?.uid} 
            teacherName={user?.displayName} 
          />
          
          <div className="flex items-center gap-2 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Filter by Class:</h3>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-auto sm:w-[220px] bg-primary/20 border-primary text-primary-foreground focus:ring-primary">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students ({combinedRecords.length})</SelectItem>
                {sortedGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group} ({groupedStudents[group].length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ReportTable attendanceRecords={filteredRecords} />
        </>
      )}
    </main>
  );
}
