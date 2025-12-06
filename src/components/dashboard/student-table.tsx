
"use client";

import type { Student } from "@/lib/mock-data";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StudentDetailsDialog } from "./student-details-dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Eye, Trash2, Loader2, MoreHorizontal } from "lucide-react";
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
import { useFirebase } from "@/firebase";
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type StudentTableProps = {
  students: Student[];
};

export default function StudentTable({ students }: StudentTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };
  
  const handleDeleteStudent = async (student: Student) => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "Firestore not available." });
      return;
    }

    setIsDeleting(student.id);

    try {
      // Also delete grades associated with the student
      const attendanceQuery = query(
        collection(firestore, "attendance"),
        where("studentId", "==", student.id)
      );
      const gradesQuery = query(
        collection(firestore, "grades"),
        where("studentId", "==", student.id)
      );

      const [attendanceSnapshot, gradesSnapshot] = await Promise.all([
        getDocs(attendanceQuery),
        getDocs(gradesQuery),
      ]);

      const batch = writeBatch(firestore);

      attendanceSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      gradesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const studentRef = doc(firestore, "students", student.id);
      batch.delete(studentRef);

      await batch.commit();

      toast({
        title: "Student Deleted",
        description: `${student.name} and all their attendance and grade records have been removed.`,
      });

    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "An error occurred while deleting the student.",
      });
    } finally {
      setIsDeleting(null);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Grade</TableHead>
                  <TableHead className="hidden md:table-cell">Section</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{student.grade}</TableCell>
                      <TableCell className="hidden md:table-cell">{student.section}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRowClick(student)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Student</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isDeleting === student.id}
                              >
                                {isDeleting === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                <span className="sr-only">Delete Student</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the student <span className="font-semibold">{student.name}</span> and all of their associated attendance and grade records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteStudent(student)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No students found. Add students to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </>
  );
}
