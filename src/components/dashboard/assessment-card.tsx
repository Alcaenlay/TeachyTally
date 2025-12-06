
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Users } from "lucide-react";
import { BrandCheck } from "@/components/icons";
import type { Grade } from "@/lib/mock-data";
import { useFirebase } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type AssessmentCardProps = {
  assessmentData: {
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
  totalStudents: number;
  onEdit: (assessmentData: AssessmentCardProps['assessmentData']) => void;
};


export function AssessmentCard({ assessmentData, totalStudents, onEdit }: AssessmentCardProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { assessment, grades } = assessmentData;
  const groupName = `${assessment.grade} - ${assessment.section}`;

  const handleDelete = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    grades.forEach(grade => {
      const gradeRef = doc(firestore, "grades", grade.id);
      batch.delete(gradeRef);
    });
    
    try {
      await batch.commit();
      toast({
        title: "Assessment Deleted",
        description: `The assessment "${assessment.title}" and all its grades have been removed.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete assessment.",
      });
      console.error("Error deleting assessment:", error);
    }
  };


  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <span className="break-all">{assessment.title}</span>
           <Badge variant="outline" className="capitalize font-medium shrink-0 ml-2">{assessment.type}</Badge>
        </CardTitle>
        <CardDescription>{groupName} &middot; {assessment.subject}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between space-y-4">
        <div>
            <div className="flex justify-between items-center text-sm p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-2"><BrandCheck className="h-4 w-4"/> Perfect Score</span>
                <span className="font-bold text-lg">{assessment.perfectScore}</span>
            </div>
            <div className="flex justify-between items-center text-sm p-3 bg-muted/50 rounded-lg mt-2">
                <span className="text-muted-foreground flex items-center gap-2"><Users/> Students Graded</span>
                <span className="font-bold text-lg">{grades.length}/{totalStudents}</span>
            </div>
        </div>
         <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => onEdit(assessmentData)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Scores
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete the assessment <span className="font-semibold">"{assessment.title}"</span> and all {grades.length} of its grade entries. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
