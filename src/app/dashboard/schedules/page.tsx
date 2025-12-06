
"use client";

import { useMemo } from "react";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Schedule, Student } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { AddScheduleDialog } from "@/components/dashboard/add-schedule-dialog";
import { ScheduleCard } from "@/components/dashboard/schedule-card";

type GroupedSchedules = {
  [key: string]: Schedule[];
};

export default function SchedulesPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const schedulesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: schedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);
  
  const studentsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "students"), 
      where("teacherIds", "array-contains", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);
  
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  
  const isLoading = isUserLoading || schedulesLoading || studentsLoading;

  const groupedSchedules = useMemo(() => {
    if (!schedules) return {};
    return schedules.reduce((acc, schedule) => {
      const key = `${schedule.grade} - ${schedule.section}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(schedule);
      return acc;
    }, {} as GroupedSchedules);
  }, [schedules]);
  
  const studentGroups = useMemo(() => {
    if (!students) return [];
    const uniqueGroups = new Set(students.map(s => `${s.grade} - ${s.section}`));
    return Array.from(uniqueGroups).sort();
  }, [students]);

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Class Schedules</h1>
          <p className="text-muted-foreground">Manage the weekly schedule for your classes and subjects.</p>
        </div>
        <AddScheduleDialog studentGroups={studentGroups} />
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : Object.keys(groupedSchedules).length > 0 ? (
          Object.entries(groupedSchedules).map(([group, schedules]) => (
            <ScheduleCard key={group} groupName={group} schedules={schedules} />
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <h3 className="text-xl font-semibold">No Schedules Found</h3>
            <p className="text-muted-foreground mt-2">Click "Add Schedule" to create your first class schedule.</p>
          </div>
        )}
      </div>
    </main>
  );
}
