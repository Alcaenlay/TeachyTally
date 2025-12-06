
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { Loader2, PlusCircle } from "lucide-react";
import type { Teacher } from "@/lib/mock-data";

const studentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  grade: z.string().min(1, { message: "Grade is required." }),
  section: z.string().min(1, { message: "Section is required." }),
});

type AddStudentDialogProps = {
  teacher: Teacher | null;
};

export default function AddStudentDialog({ teacher }: AddStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      grade: "",
      section: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof studentFormSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to add a student.",
      });
      return;
    }
    setIsLoading(true);

    try {
      const studentsRef = collection(firestore, "students");
      const newStudentDocRef = doc(studentsRef); // Generate a new reference with a unique ID

      const batch = writeBatch(firestore);

      // Set the document with its own ID as the qrCode
      batch.set(newStudentDocRef, {
        ...values,
        id: newStudentDocRef.id,
        teacherIds: [user.uid],
        qrCode: newStudentDocRef.id, // Use the generated ID for the QR code
        schoolName: teacher?.schoolName || "",
      });
      
      await batch.commit();

      toast({
        title: "Student Added",
        description: `${values.name} has been added to your roster.`,
      });
      form.reset();
      setIsOpen(false);

    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add student. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Student</DialogTitle>
          <DialogDescription>
            Enter the student's details below. A unique QR code will be generated for them.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 10th" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Student
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    