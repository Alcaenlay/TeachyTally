
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import StudentTable from "@/components/dashboard/student-table";
import { useCollection, useFirebase, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Student, Teacher } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import AddStudentDialog from "@/components/dashboard/add-student-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UploadStudentsDialog } from "@/components/dashboard/upload-students-dialog";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BatchExportQrDialog } from "@/components/dashboard/batch-export-qr-dialog";


export default function StudentsPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get("group");
  
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup || "all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const studentsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "students"), 
      where("teacherIds", "array-contains", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  
  const teacherRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "teachers", user.uid);
  }, [firestore, user]);

  const { data: teacherData, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);
  
  const isLoading = isUserLoading || studentsLoading || isTeacherLoading;
  
  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam) {
      setSelectedGroup(groupParam);
    }
  }, [searchParams]);

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

  const filteredAndSortedStudents = useMemo(() => {
    let studentsToFilter = [];
    if (selectedGroup === "all" || !students) {
      studentsToFilter = students || [];
    } else {
      studentsToFilter = groupedStudents[selectedGroup] || [];
    }

    return [...studentsToFilter].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
  }, [selectedGroup, students, groupedStudents, sortOrder]);
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Students</h1>
          <p className="text-muted-foreground">Manage your student roster and generate QR codes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BatchExportQrDialog studentGroups={sortedGroups} students={students || []} />
          <UploadStudentsDialog teacher={teacherData}/>
          <AddStudentDialog teacher={teacherData} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Filter & Sort:</h3>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-auto sm:w-[220px] bg-primary/20 border-primary text-primary-foreground focus:ring-primary">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students ({students?.length ?? 0})</SelectItem>
            {sortedGroups.map((group) => (
              <SelectItem key={group} value={group}>
                {group} ({groupedStudents[group].length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={toggleSortOrder}>
          {sortOrder === 'asc' ? <ArrowDownAZ className="mr-2 h-4 w-4" /> : <ArrowUpAZ className="mr-2 h-4 w-4" />}
          Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </Button>
      </div>
      
      {isLoading ? (
        <Card>
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <StudentTable students={filteredAndSortedStudents} />
      )}
    </main>
  );
}
