
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, QrCode, Users, BarChart3 } from "lucide-react";
import { BrandCheck } from "@/components/icons";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Student } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { format } from 'date-fns';

type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName?: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  teacherId: string;
};

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [todayString, setTodayString] = useState('');

  useEffect(() => {
    // Use date-fns to format in a timezone-agnostic way
    setTodayString(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const studentsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "students"), 
      where("teacherIds", "array-contains", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const attendanceQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !todayString) return null;
    return query(
      collection(firestore, "attendance"),
      where("teacherId", "==", user.uid),
      where("date", "==", todayString)
    );
  }, [firestore, user?.uid, todayString, isUserLoading]);

  const { data: attendanceData, isLoading: attendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const isLoading = isUserLoading || studentsLoading || attendanceLoading;

  const totalStudents = students?.length ?? 0;
  const presentStudents = attendanceData?.filter(a => a.status === 'Present' || a.status === 'Late').length ?? 0;
  const absentStudents = totalStudents - presentStudents;
  const attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

  if (isLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, here's a summary of your class today.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/dashboard/scan">
              <QrCode className="mr-2 h-4 w-4" />
              Scan Attendance
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Managed in your classes</p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <BrandCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentStudents}</div>
            <p className="text-xs text-muted-foreground">{absentStudents} absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">For today's sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Links</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Link href="/dashboard/students" className="text-sm font-medium hover:underline text-primary">Manage Students</Link>
            <Link href="/dashboard/reports" className="text-sm font-medium hover:underline text-primary">View Reports</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>A log of recent attendance scans.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceData && attendanceData.length > 0 ? (
              attendanceData.slice(0, 5).map(record => (
                <div key={record.id} className="flex items-center">
                  <div className={`h-2.5 w-2.5 rounded-full mr-3 ${record.status === 'Present' || record.status === 'Late' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">{record.studentName || 'Unknown Student'}</p>
                    <p className="text-sm text-muted-foreground">Marked as {record.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No attendance records for today.</p>
            )}
          </div>
        </CardContent>
      </Card>

    </main>
  );
}
