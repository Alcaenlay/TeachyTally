
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { Loader2, PlusCircle, Trash2, CalendarPlus } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const timeSlotSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  dayOfWeek: z.string().min(1, "Select a day."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm format."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm format."),
});

const scheduleFormSchema = z.object({
  group: z.string().min(1, "Please select a class."),
  lateAfterMinutes: z.coerce.number().int().min(0, "Must be a positive number."),
  timeSlots: z.array(timeSlotSchema).min(1, "Please add at least one time slot."),
});

type AddScheduleDialogProps = {
  studentGroups: string[];
};

export function AddScheduleDialog({ studentGroups }: AddScheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      group: "",
      lateAfterMinutes: 15,
      timeSlots: [{ subject: "", dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "timeSlots",
  });

  const onSubmit = async (values: z.infer<typeof scheduleFormSchema>) => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    setIsLoading(true);

    try {
      const [grade, section] = values.group.split(" - ");
      const schedulesRef = collection(firestore, "schedules");
      const batch = writeBatch(firestore);

      values.timeSlots.forEach((slot) => {
        const newScheduleRef = doc(schedulesRef);
        const newSchedule = {
          id: newScheduleRef.id,
          teacherId: user.uid,
          grade,
          section,
          subject: slot.subject,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lateAfterMinutes: values.lateAfterMinutes,
        };
        batch.set(newScheduleRef, newSchedule);
      });

      await batch.commit();

      toast({
        title: "Schedules Added",
        description: `Added ${values.timeSlots.length} new schedule(s) for ${values.group}.`,
      });
      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add schedules." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <DialogDescription>
            Set the recurring weekly schedule for one of your class groups.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 px-1 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Group</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a grade and section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {studentGroups.map((group) => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lateAfterMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Late After (mins)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Time Slots & Subjects</FormLabel>
                <ScrollArea className="h-[250px] mt-2 w-full pr-3">
                  <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-3 p-3 bg-muted/50 rounded-lg relative">
                       <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-7 w-7 shrink-0 absolute top-2 right-2 sm:static sm:self-end"
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <FormField
                          control={form.control}
                          name={`timeSlots.${index}.subject`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Subject</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Mathematics" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                        <FormField
                          control={form.control}
                          name={`timeSlots.${index}.dayOfWeek`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Day</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Day" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {daysOfWeek.map((day) => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex w-full sm:w-auto items-end gap-2">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.startTime`}
                            render={({ field }) => (
                              <FormItem className="flex-1 sm:flex-shrink-0 sm:w-28">
                                <FormLabel className="text-xs">Start</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.endTime`}
                            render={({ field }) => (
                              <FormItem className="flex-1 sm:flex-shrink-0 sm:w-28">
                                <FormLabel className="text-xs">End</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </ScrollArea>
                 <FormMessage>
                  {form.formState.errors.timeSlots && !form.formState.errors.timeSlots.root && form.formState.errors.timeSlots.message}
                </FormMessage>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ subject: "", dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' })}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add Time Slot
              </Button>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Schedule
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
