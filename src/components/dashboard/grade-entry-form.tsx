
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Student, Grade } from "@/lib/mock-data";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, writeBatch, doc } from "firebase/firestore";
import { Loader2, Save } from "lucide-react";
import { format } from "date-fns";

type GradebookTableProps = {
  students: Student[];
  assessment: {
    title: string;
    type: "quiz" | "activity" | "test";
    perfectScore: number;
  };
  existingGrades: Grade[];
  subject: string;
  grade: string;
  section: string;
  onSaveSuccess?: () => void;
};

type GradeInput = {
  [studentId: string]: {
    score: string; // Use string for input flexibility
    gradeId?: string; // To know if we update or create
  };
};

export function GradebookTable({ students, assessment, existingGrades, subject, grade, section, onSaveSuccess }: GradebookTableProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grades, setGrades] = useState<GradeInput>({});
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    // Pre-populate grades from existing data
    const initialGrades: GradeInput = {};
    students.forEach(student => {
      const existingGrade = existingGrades.find(g => g.studentId === student.id);
      initialGrades[student.id] = {
        score: existingGrade?.score.toString() || "",
        gradeId: existingGrade?.id,
      };
    });
    setGrades(initialGrades);
  }, [students, existingGrades]);
  
  const handleGradeChange = (studentId: string, score: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], score },
    }));
  };

  const handleSubmit = async () => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated." });
      return;
    }

    setIsSubmitting(true);
    let updatedCount = 0;
    let createdCount = 0;

    try {
      const batch = writeBatch(firestore);
      const gradesRef = collection(firestore, "grades");
      const dateString = format(new Date(), "yyyy-MM-dd");

      for (const student of students) {
        const studentId = student.id;
        const gradeInfo = grades[studentId];

        if (gradeInfo && gradeInfo.score !== "") {
          const score = parseFloat(gradeInfo.score);
          if (isNaN(score) || score < 0 || score > assessment.perfectScore) {
             toast({
                variant: "destructive",
                title: "Invalid Score",
                description: `Score for ${student.name} is invalid. It must be between 0 and ${assessment.perfectScore}.`,
             });
             setIsSubmitting(false);
             return;
          }

          const gradeData = {
            studentId,
            studentName: student.name,
            teacherId: user.uid,
            subject,
            title: assessment.title,
            score,
            perfectScore: assessment.perfectScore,
            type: assessment.type,
            date: dateString,
            grade,
            section,
          };
          
          if (gradeInfo.gradeId) {
            // Update existing grade
            const gradeRef = doc(gradesRef, gradeInfo.gradeId);
            batch.update(gradeRef, { score });
            updatedCount++;
          } else {
            // Create new grade
            const newGradeRef = doc(gradesRef);
            batch.set(newGradeRef, { ...gradeData, id: newGradeRef.id });
            createdCount++;
          }
        }
      }

      await batch.commit();
      toast({
        title: "Grades Saved",
        description: `Successfully created ${createdCount} and updated ${updatedCount} grade records.`,
      });
      onSaveSuccess?.();
    } catch (error) {
      console.error("Error saving grades:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save grades." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">Enter Grades for "{assessment.title}"</CardTitle>
        <CardDescription>
            Enter scores for each student below. The perfect score is <span className="font-bold text-foreground">{assessment.perfectScore}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-24 sm:w-40 text-right">Score</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {students.length > 0 ? (
                    students.map((student) => (
                    <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-right">
                        <Input
                            type="number"
                            placeholder="-"
                            value={grades[student.id]?.score || ""}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            max={assessment.perfectScore}
                            min={0}
                            className="text-right w-full"
                        />
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                        No students in this class.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
            Save All Grades
        </Button>
      </CardFooter>
    </Card>
  );
}
