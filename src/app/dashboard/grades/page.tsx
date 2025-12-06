
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Student, Schedule, Grade } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { GradebookTable } from "@/components/dashboard/grade-entry-form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { AssessmentCard, type AssessmentCardProps } from "@/components/dashboard/assessment-card";
import { Label } from "@/components/ui/label";

const assessmentSchema = z.object({
    title: z.string().min(1, "Title is required."),
    type: z.enum(["quiz", "activity", "test"], { required_error: "Please select a type." }),
    perfectScore: z.coerce.number().min(1, "Perfect score must be at least 1."),
});
type Assessment = z.infer<typeof assessmentSchema>;

type GroupedAssessments = {
  [key: string]: {
    assessment: {
      title: string;
      type: Grade['type'];
      perfectScore: number;
      subject: string;
      grade: string;
      section: string;
    };
    grades: Grade[];
  };
};

export default function GradesPage() {
  const { firestore, user } = useFirebase();
  const { isUserLoading } = useUser();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const gradeEntryRef = useRef<HTMLDivElement>(null);
  
  // State for filtering existing assessments
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");


  const form = useForm<Assessment>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: "",
      type: "quiz",
      perfectScore: 10,
    },
  });
  
  useEffect(() => {
    if (currentAssessment && gradeEntryRef.current) {
      // This effect ensures scrolling happens if currentAssessment is set from an edit action
      gradeEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentAssessment]);

  const studentsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "students"),
      where("teacherIds", "array-contains", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const schedulesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: schedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);
  
  const allGradesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "grades"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: allGrades, isLoading: gradesLoading } = useCollection<Grade>(allGradesQuery);
  
  const isLoading = isUserLoading || studentsLoading || schedulesLoading || gradesLoading;
  
  const studentCountByGroup = useMemo(() => {
    if (!students) return {};
    return students.reduce((acc, student) => {
        const groupKey = `${student.grade} - ${student.section}`;
        if (!acc[groupKey]) {
            acc[groupKey] = 0;
        }
        acc[groupKey]++;
        return acc;
    }, {} as {[key: string]: number});
  }, [students]);

  const { studentGroups, subjectsByGroup, allSubjects } = useMemo(() => {
    if (!schedules) return { studentGroups: [], subjectsByGroup: {}, allSubjects: [] };

    const groups: { [key: string]: Set<string> } = {};
    const subjects = new Set<string>();
    schedules.forEach((schedule) => {
      const groupKey = `${schedule.grade} - ${schedule.section}`;
      if (!groups[groupKey]) {
        groups[groupKey] = new Set();
      }
      groups[groupKey].add(schedule.subject);
      subjects.add(schedule.subject);
    });

    const sortedGroups = Object.keys(groups).sort();
    const subjectsMap: { [key: string]: string[] } = {};
    for (const group of sortedGroups) {
      subjectsMap[group] = Array.from(groups[group]).sort();
    }

    return { studentGroups: sortedGroups, subjectsByGroup: subjectsMap, allSubjects: Array.from(subjects).sort() };
  }, [schedules]);

  const groupedAssessments = useMemo(() => {
    if (!allGrades) return {};
    return allGrades.reduce((acc, grade) => {
      const key = `${grade.title}-${grade.type}-${grade.subject}-${grade.grade}-${grade.section}`;
      if (!acc[key]) {
        acc[key] = {
          assessment: {
            title: grade.title,
            type: grade.type,
            perfectScore: grade.perfectScore,
            subject: grade.subject,
            grade: grade.grade,
            section: grade.section,
          },
          grades: [],
        };
      }
      acc[key].grades.push(grade);
      return acc;
    }, {} as GroupedAssessments);
  }, [allGrades]);
  
  const filteredAssessments = useMemo(() => {
    return Object.fromEntries(
      Object.entries(groupedAssessments).filter(([, data]) => {
        const { assessment } = data;
        const groupKey = `${assessment.grade} - ${assessment.section}`;
        
        const groupMatch = filterGroup === 'all' || groupKey === filterGroup;
        const subjectMatch = filterSubject === 'all' || assessment.subject === subjectMatch;
        
        return groupMatch && subjectMatch;
      })
    );
  }, [groupedAssessments, filterGroup, filterSubject]);

  const filteredStudents = useMemo(() => {
    if (!students || !selectedGroup) return [];
    const [grade, section] = selectedGroup.split(" - ");
    return students.filter(
      (student) => student.grade === grade && student.section === section
    );
  }, [students, selectedGroup]);
  
  const existingGradesForAssessment = useMemo(() => {
    if (!allGrades || !currentAssessment || !selectedSubject || !selectedGroup) return [];
    const [grade, section] = selectedGroup.split(" - ");
    return allGrades.filter(g => 
        g.title === currentAssessment.title && 
        g.type === currentAssessment.type && 
        g.subject === selectedSubject &&
        g.grade === grade &&
        g.section === section
    );
  }, [allGrades, currentAssessment, selectedSubject, selectedGroup]);

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    setSelectedSubject("");
    setCurrentAssessment(null);
    form.reset();
  };
  
  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    setCurrentAssessment(null);
    form.reset();
    setTimeout(() => handleScrollToGradeEntry(), 0);
  };
  
  const handleScrollToGradeEntry = () => {
     if (gradeEntryRef.current) {
      gradeEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const handleCreateAssessment = (values: Assessment) => {
    setCurrentAssessment(values);
    // Explicitly scroll after setting the state
    setTimeout(() => handleScrollToGradeEntry(), 0);
  };
  
  const handleEditAssessment = (data: AssessmentCardProps["assessmentData"]) => {
    const { assessment } = data;
    const group = `${assessment.grade} - ${assessment.section}`;
    
    setSelectedGroup(group);
    setSelectedSubject(assessment.subject);
    setCurrentAssessment({
        title: assessment.title,
        type: assessment.type,
        perfectScore: assessment.perfectScore,
    });
    form.reset({
        title: assessment.title,
        type: assessment.type,
        perfectScore: assessment.perfectScore,
    });
    handleScrollToGradeEntry();
  }

  const handleBackToAssessment = () => {
    setCurrentAssessment(null);
    form.reset();
  }
  
  const handleSaveSuccess = () => {
    setCurrentAssessment(null);
    form.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Grades</h1>
          <p className="text-muted-foreground">Manage existing assessments or create a new one to grade.</p>
        </div>
        <div className="flex items-center gap-2">
            {currentAssessment && (
                <Button variant="outline" onClick={handleBackToAssessment}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to List
                </Button>
            )}
             <Button onClick={handleScrollToGradeEntry}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Create New Assessment
            </Button>
        </div>
      </div>

       <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight font-headline">Existing Assessments</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="grid w-full sm:w-auto gap-1.5">
                <Label htmlFor="filter-group">Filter by Class</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                    <SelectTrigger id="filter-group" className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Select a Class" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {studentGroups.map((group) => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid w-full sm:w-auto gap-1.5">
                <Label htmlFor="filter-subject">Filter by Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger id="filter-subject" className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Select a Subject" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {allSubjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

         <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
          {isLoading ? (
            <>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </>
          ) : Object.keys(filteredAssessments).length > 0 ? (
            Object.entries(filteredAssessments).map(([key, data]) => {
              const groupKey = `${data.assessment.grade} - ${data.assessment.section}`;
              const totalStudents = studentCountByGroup[groupKey] || 0;
              return <AssessmentCard key={key} assessmentData={data} totalStudents={totalStudents} onEdit={handleEditAssessment} />
            })
          ) : (
            <div className="col-span-full text-center py-16 bg-muted/20 rounded-lg">
              <h3 className="text-xl font-semibold">No Graded Assessments Found</h3>
              <p className="text-muted-foreground mt-2">Adjust your filters or create a new assessment below.</p>
            </div>
          )}
        </div>
       </div>

      <div className="grid gap-8 pt-8 border-t" ref={gradeEntryRef}>
        <h2 className="text-2xl font-semibold tracking-tight font-headline">Enter New Grades</h2>
          {!currentAssessment ? (
            <>
            <Card>
                <CardHeader>
                <CardTitle>Step 1: Select Class & Subject</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedGroup} onValueChange={handleGroupChange}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Select a Class" />
                    </SelectTrigger>
                    <SelectContent>
                        {studentGroups.map((group) => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <Select
                    value={selectedSubject}
                    onValueChange={handleSubjectChange}
                    disabled={!selectedGroup}
                    >
                    <SelectTrigger className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Select a Subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {(subjectsByGroup[selectedGroup] || []).map((subject) => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                </CardContent>
            </Card>
            
            {selectedGroup && selectedSubject && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 2: Define New Assessment</CardTitle>
                        <CardDescription>Create a new quiz, activity, or test to grade.</CardDescription>
                    </CardHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateAssessment)}>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                        <Input placeholder="e.g. Chapter 1 Quiz" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Select a grade type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="quiz">Quiz</SelectItem>
                                                <SelectItem value="activity">Activity</SelectItem>
                                                <SelectItem value="test">Test</SelectItem>
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="perfectScore"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Perfect Score</FormLabel>
                                            <FormControl>
                                            <Input type="number" placeholder="10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit">Define Assessment & Proceed</Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            )}
            </>
          ) : (
             <GradebookTable
                students={filteredStudents}
                assessment={currentAssessment}
                existingGrades={existingGradesForAssessment}
                subject={selectedSubject}
                grade={selectedGroup.split(' - ')[0]}
                section={selectedGroup.split(' - ')[1]}
                onSaveSuccess={handleSaveSuccess}
              />
          )}
        </div>
    </main>
  );
}
