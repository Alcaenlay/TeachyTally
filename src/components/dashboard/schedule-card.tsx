
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Save, X } from "lucide-react";
import type { Schedule } from "@/lib/mock-data";
import { useFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "../ui/label";

type ScheduleCardProps = {
  groupName: string;
  schedules: Schedule[];
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function EditableScheduleItem({ schedule, onSave, onCancel }: { schedule: Schedule, onSave: (updatedSchedule: Partial<Schedule>) => void, onCancel: () => void }) {
  const [editedSchedule, setEditedSchedule] = useState(schedule);

  const handleSave = () => {
    // Only pass the changed fields
    const changes: Partial<Schedule> = {};
    if (editedSchedule.subject !== schedule.subject) changes.subject = editedSchedule.subject;
    if (editedSchedule.dayOfWeek !== schedule.dayOfWeek) changes.dayOfWeek = editedSchedule.dayOfWeek;
    if (editedSchedule.startTime !== schedule.startTime) changes.startTime = editedSchedule.startTime;
    if (editedSchedule.endTime !== schedule.endTime) changes.endTime = editedSchedule.endTime;
    if (editedSchedule.lateAfterMinutes !== schedule.lateAfterMinutes) changes.lateAfterMinutes = editedSchedule.lateAfterMinutes;
    
    if (Object.keys(changes).length > 0) {
      onSave(changes);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 bg-muted rounded-lg">
       <div className="space-y-1">
          <Label htmlFor={`subject-${schedule.id}`} className="text-xs">Subject</Label>
          <Input 
            id={`subject-${schedule.id}`} 
            type="text" 
            value={editedSchedule.subject} 
            onChange={e => setEditedSchedule(prev => ({...prev, subject: e.target.value}))}
          />
        </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`day-${schedule.id}`} className="text-xs">Day</Label>
          <Select
            value={editedSchedule.dayOfWeek}
            onValueChange={(value) => setEditedSchedule(prev => ({...prev, dayOfWeek: value as Schedule['dayOfWeek']}))}
          >
            <SelectTrigger id={`day-${schedule.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {daysOfWeek.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`late-${schedule.id}`} className="text-xs">Late After (mins)</Label>
          <Input 
            id={`late-${schedule.id}`} 
            type="number" 
            value={editedSchedule.lateAfterMinutes} 
            onChange={e => setEditedSchedule(prev => ({...prev, lateAfterMinutes: Number(e.target.value)}))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`start-${schedule.id}`} className="text-xs">Start Time</Label>
          <Input 
            id={`start-${schedule.id}`} 
            type="time" 
            value={editedSchedule.startTime} 
            onChange={e => setEditedSchedule(prev => ({...prev, startTime: e.target.value}))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`end-${schedule.id}`} className="text-xs">End Time</Label>
          <Input 
            id={`end-${schedule.id}`} 
            type="time" 
            value={editedSchedule.endTime} 
            onChange={e => setEditedSchedule(prev => ({...prev, endTime: e.target.value}))}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
        <Button size="sm" onClick={handleSave}><Save className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

export function ScheduleCard({ groupName, schedules }: ScheduleCardProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedSchedules = [...schedules].sort((a, b) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayCompare = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
    if (dayCompare !== 0) return dayCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  const handleDelete = (scheduleId: string, scheduleDesc: string) => {
    if (!firestore) return;
    const scheduleRef = doc(firestore, "schedules", scheduleId);
    deleteDocumentNonBlocking(scheduleRef);
    toast({
      title: "Schedule Deleted",
      description: `The schedule for ${scheduleDesc} has been removed.`,
    });
  };

  const handleSave = (scheduleId: string, changes: Partial<Schedule>) => {
    if (!firestore) return;
    const scheduleRef = doc(firestore, "schedules", scheduleId);
    updateDocumentNonBlocking(scheduleRef, changes);
    toast({
      title: "Schedule Updated",
      description: `The schedule has been successfully updated.`,
    });
    setEditingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{groupName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedSchedules.map((schedule) => {
            const scheduleDescription = `${schedule.subject} on ${schedule.dayOfWeek} at ${schedule.startTime}`;
            if (editingId === schedule.id) {
              return <EditableScheduleItem key={schedule.id} schedule={schedule} onSave={(changes) => handleSave(schedule.id, changes)} onCancel={() => setEditingId(null)} />
            }
            return (
          <div key={schedule.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg transition-colors hover:bg-muted">
            <div>
              <p className="font-semibold text-accent">{schedule.subject}</p>
              <p className="font-semibold">{schedule.dayOfWeek}</p>
              <p className="text-sm text-muted-foreground">
                {schedule.startTime} - {schedule.endTime}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <Badge variant="outline">Late after {schedule.lateAfterMinutes} mins</Badge>
              </p>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setEditingId(schedule.id)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the schedule for <span className="font-semibold">{groupName} ({schedule.subject})</span> on <span className="font-semibold">{schedule.dayOfWeek} at {schedule.startTime}</span>. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(schedule.id, scheduleDescription)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )})}
      </CardContent>
    </Card>
  );
}
