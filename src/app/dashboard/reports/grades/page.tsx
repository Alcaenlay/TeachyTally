
"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Grade, Student, Schedule } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExportGradesDialog } from "@/components/dashboard/export-grades-dialog";

type GroupedGrades = {
  [studentId: string]: {
    studentName: string;
    grades: { [title: string]: Grade };
  };
};

type Assessment = {
  title: string;
  type: "quiz" | "activity" | "test";
  perfectScore: number;
};

export default function GradesReportPage() {
  const { firestore, user } = useFirebase();
  const { isUserLoading } = useUser();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const gradesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    let q = query(
        collection(firestore, "grades"), 
        where("teacherId", "==", user.uid)
    );
    if (selectedSubject && selectedSubject !== 'all') {
        q = query(q, where("subject", "==", selectedSubject));
    }
    if (selectedGroup && selectedGroup !== 'all') {
        const [grade, section] = selectedGroup.split(' - ');
        q = query(q, where("grade", "==", grade), where("section", "==", section));
    }
    return q;
  }, [firestore, user?.uid, isUserLoading, selectedGroup, selectedSubject]);

  const { data: grades, isLoading: gradesLoading } = useCollection<Grade>(gradesQuery);
  
  const schedulesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
     return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);
  
  const { data: schedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);

  const isLoading = isUserLoading || gradesLoading || schedulesLoading;

  const { studentGroups, subjects } = useMemo(() => {
    if (!schedules) return { studentGroups: [], subjects: [] };

    const groups = new Set<string>();
    const subjectsList = new Set<string>();

    schedules.forEach(schedule => {
      groups.add(`${schedule.grade} - ${schedule.section}`);
      subjectsList.add(schedule.subject);
    });

    return { 
      studentGroups: Array.from(groups).sort(), 
      subjects: Array.from(subjectsList).sort()
    };
  }, [schedules]);

  const { gradebookData, assessments } = useMemo(() => {
    if (!grades) return { gradebookData: {}, assessments: [] };

    const assessmentMap = new Map<string, Assessment>();
    const data: GroupedGrades = {};

    grades.forEach(grade => {
      // Aggregate assessments
      const assessmentKey = `${grade.type}-${grade.title}`;
      if (!assessmentMap.has(assessmentKey)) {
        assessmentMap.set(assessmentKey, {
          title: grade.title,
          type: grade.type,
          perfectScore: grade.perfectScore,
        });
      }

      // Group grades by student
      if (!data[grade.studentId]) {
        data[grade.studentId] = {
          studentName: grade.studentName,
          grades: {},
        };
      }
      data[grade.studentId].grades[assessmentKey] = grade;
    });

    const sortedAssessments = Array.from(assessmentMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    return { gradebookData: data, assessments: sortedAssessments };
  }, [grades]);
  
  const getScoreBadge = (score: number, perfectScore: number) => {
    const percentage = (score / perfectScore) * 100;
    if (percentage >= 90) return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
    if (percentage >= 75) return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
  };

  const renderAssessmentCategory = (type: 'quiz' | 'activity' | 'test') => {
    const filteredAssessments = assessments.filter(a => a.type === type);
    if (filteredAssessments.length === 0) return null;

    return (
      <>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead colSpan={1 + filteredAssessments.length} className="font-bold uppercase text-foreground">
            {type}s
          </TableHead>
        </TableRow>
        <TableRow>
          <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
          {filteredAssessments.map(assessment => (
            <TableHead key={assessment.title} className="text-center">
              {assessment.title}
              <span className="font-normal text-muted-foreground text-xs block">
                /{assessment.perfectScore}
              </span>
            </TableHead>
          ))}
        </TableRow>
        {Object.keys(gradebookData).map(studentId => (
          <TableRow key={studentId}>
            <TableCell className="font-medium sticky left-0 bg-background z-10">{gradebookData[studentId].studentName}</TableCell>
            {filteredAssessments.map(assessment => {
              const grade = gradebookData[studentId].grades[`${assessment.type}-${assessment.title}`];
              return (
                <TableCell key={assessment.title} className="text-center">
                  {grade ? (
                     <Badge className={getScoreBadge(grade.score, grade.perfectScore)}>
                        {grade.score}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </>
    );
  };


  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Gradebook Report</h1>
          <p className="text-sm md:text-base text-muted-foreground">Review student scores in a gradebook format.</p>
        </div>
        <ExportGradesDialog 
            grades={grades || []}
            schedules={schedules || []}
            studentGroups={studentGroups}
            subjects={subjects}
          />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter Grades</CardTitle>
          <CardDescription>Drill down into specific classes or subjects.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-10 w-[240px]" />
              <Skeleton className="h-10 w-[240px]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {studentGroups.map(group => <SelectItem key={group} value={group}>{group}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <CardTitle className="text-lg md:text-xl">Gradebook View</CardTitle>
            <CardDescription className="text-xs md:text-sm">Showing records for the selected filters.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="w-full h-[400px] md:h-[600px] border rounded-md">
                {isLoading ? (
                    <div className="p-4">
                        <Skeleton className="h-10 w-full mb-2" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : grades && grades.length > 0 ? (
                    <Table>
                        <TableHeader>
                            {renderAssessmentCategory('quiz')}
                            {renderAssessmentCategory('activity')}
                            {renderAssessmentCategory('test')}
                        </TableHeader>
                    </Table>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">No grade records found for the selected filters.</p>
                    </div>
                )}
            </ScrollArea>
        </CardContent>
       </Card>
    </main>
  );
}
