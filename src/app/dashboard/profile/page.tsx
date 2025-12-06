
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit, BookOpen, Users, Save, X, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Teacher, Schedule, Student } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";


const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  oldPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword && data.newPassword.length < 8) {
        return false;
    }
    return true;
}, {
    message: "New password must be at least 8 characters.",
    path: ["newPassword"],
}).refine(data => {
    // If one password field is filled, all must be
    if (data.oldPassword || data.newPassword || data.confirmPassword) {
        return !!data.oldPassword && !!data.newPassword && !!data.confirmPassword;
    }
    return true;
}, {
    message: "Please fill all password fields to change your password.",
    path: ["oldPassword"], // Or a more general path
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});


type GroupedSchedules = {
  [day: string]: Schedule[];
};

export default function ProfilePage() {
  const { user, isUserLoading, auth, firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const teacherRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "teachers", user.uid);
  }, [firestore, user]);

  const { data: teacherData, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);
  
  const schedulesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(firestore, "schedules"),
      where("teacherId", "==", user.uid)
    );
  }, [firestore, user?.uid, isUserLoading]);

  const { data: schedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const { handledSections, weeklySchedule } = useMemo(() => {
    if (!schedules) return { handledSections: [], weeklySchedule: {} };
    
    const sections = new Set<string>();
    const scheduleByDay: GroupedSchedules = {};
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    schedules.forEach(schedule => {
      sections.add(`${schedule.grade} - ${schedule.section}`);
      
      if (!scheduleByDay[schedule.dayOfWeek]) {
        scheduleByDay[schedule.dayOfWeek] = [];
      }
      scheduleByDay[schedule.dayOfWeek].push(schedule);
    });
    
    // Sort schedules within each day by start time
    for (const day in scheduleByDay) {
        scheduleByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    
    const sortedWeeklySchedule: GroupedSchedules = {};
    dayOrder.forEach(day => {
        if(scheduleByDay[day]) {
            sortedWeeklySchedule[day] = scheduleByDay[day];
        }
    })

    return { 
        handledSections: Array.from(sections).sort(),
        weeklySchedule: sortedWeeklySchedule
    };
  }, [schedules]);


  useEffect(() => {
    if (teacherData) {
      form.reset({
        displayName: teacherData.name || "",
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setAvatarPreview(teacherData.photoURL || null);
      setInitialAvatar(teacherData.photoURL || null);
    } else if (user) {
      form.reset({ 
        displayName: user.displayName || "" ,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
      setAvatarPreview(user.photoURL || null);
      setInitialAvatar(user.photoURL || null);
    }
  }, [user, teacherData, form, isEditing]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !auth.currentUser) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated." });
      return;
    }
    setIsSubmitting(true);
    let profileUpdated = false;

    try {
        // --- Password Change Logic ---
        if (values.newPassword && values.oldPassword) {
            const credential = EmailAuthProvider.credential(user.email!, values.oldPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, values.newPassword);
            toast({
                title: "Password Updated",
                description: "Your password has been changed successfully.",
            });
        }
        
        // --- Profile Update Logic ---
        const nameChanged = values.displayName !== (teacherData?.name || user.displayName);
        const avatarChanged = avatarPreview !== initialAvatar;

        if (nameChanged || avatarChanged) {
            if (auth.currentUser && nameChanged) {
                await updateProfile(auth.currentUser, { displayName: values.displayName });
            }

            const teacherDocRef = doc(firestore, "teachers", user.uid);
            await updateDoc(teacherDocRef, {
                name: values.displayName,
                photoURL: avatarPreview,
            });
            profileUpdated = true;
        }
        
        if (profileUpdated) {
             toast({
                title: "Profile Updated",
                description: "Your profile has been updated successfully.",
            });
        }
      
      setIsEditing(false);
      setShowPasswordFields(false);
      setInitialAvatar(avatarPreview);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "An error occurred. Please try again.";
      if (error.code === 'auth/wrong-password') {
        errorMessage = "The old password you entered is incorrect.";
        form.setError("oldPassword", { type: "manual", message: errorMessage });
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPasswordFields(false);
  }
  
  const isLoading = isUserLoading || isTeacherLoading || schedulesLoading;

  if (isLoading || !user) {
    return <main className="flex-1 p-4 md:p-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
        <Skeleton className="h-48 w-full max-w-2xl" />
    </main>;
  }
  
  const userInitial = form.getValues('displayName') ? form.getValues('displayName').charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'T');


  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and view your schedules.</p>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>Update your display name and profile picture.</CardDescription>
                        </div>
                        {!isEditing && (
                            <Button variant="outline" type="button" onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit Profile
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                        <Avatar className="h-24 w-24 border">
                            <AvatarImage src={avatarPreview || undefined} alt="Profile Avatar" />
                            <AvatarFallback className="text-3xl">
                                {userInitial}
                            </AvatarFallback>
                        </Avatar>
                        {isEditing && (
                            <Button
                                type="button"
                                size="icon"
                                className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Change avatar</span>
                            </Button>
                        )}
                        <Input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif"
                            onChange={handleAvatarChange}
                            disabled={!isEditing}
                        />
                        </div>
                        <div className="grid gap-1.5 flex-1">
                             {isEditing ? (
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Display Name</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Your Name" {...field} className="text-2xl font-semibold h-auto p-0 border-0 shadow-none focus-visible:ring-0" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                             ) : (
                                <h2 className="text-2xl font-semibold">{form.watch('displayName')}</h2>
                             )}
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>School Name</Label>
                         <p className="text-sm font-bold">{teacherData?.schoolName || 'Not Set'}</p>
                    </div>
                    {isEditing && (
                        <>
                            <Separator />
                            {!showPasswordFields ? (
                                <Button type="button" variant="outline" onClick={() => setShowPasswordFields(true)}>
                                    <KeyRound className="mr-2 h-4 w-4"/>
                                    Change Password
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <KeyRound />
                                        Change Password
                                    </h3>
                                    <FormField
                                        control={form.control}
                                        name="oldPassword"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Old Password</FormLabel>
                                            <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm New Password</FormLabel>
                                            <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription>Leave all password fields blank to keep your current password.</FormDescription>
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </>
                    )}
                    </CardContent>
                    {isEditing && (
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={handleCancel}>
                                <X className="mr-2 h-4 w-4"/>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                                Save Changes
                            </Button>
                        </CardFooter>
                    )}
                </form>
                </Form>
            </Card>
            <div className="block lg:hidden">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Handled Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                      {isLoading ? <Skeleton className="h-8 w-24" /> :
                          handledSections.length > 0 ? (
                          handledSections.map(section => (
                            <Link key={section} href={`/dashboard/students?group=${encodeURIComponent(section)}`}>
                                <Badge variant="secondary" className="text-base px-3 py-1 cursor-pointer hover:bg-primary/20">{section}</Badge>
                            </Link>
                          ))
                      ) : (
                          <p className="text-muted-foreground text-sm">No sections found.</p>
                      )}
                  </CardContent>
              </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>Your recurring weekly class schedule.</CardDescription>
                </CardHeader>
                <CardContent>
                    {Object.keys(weeklySchedule).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(weeklySchedule).map(([day, daySchedules]) => (
                                <div key={day}>
                                    <h4 className="font-semibold text-lg border-b pb-2 mb-2">{day}</h4>
                                    <div className="space-y-2">
                                        {daySchedules.map(schedule => (
                                            <div key={schedule.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                                <div>
                                                    <p className="font-medium">{schedule.subject}</p>
                                                    <p className="text-sm text-muted-foreground">{schedule.grade} - {schedule.section}</p>
                                                </div>
                                                <Badge variant="outline">{schedule.startTime} - {schedule.endTime}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No weekly schedules have been set up yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="space-y-8 hidden lg:block">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Handled Sections</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {isLoading ? <Skeleton className="h-8 w-24" /> :
                        handledSections.length > 0 ? (
                        handledSections.map(section => (
                             <Link key={section} href={`/dashboard/students?group=${encodeURIComponent(section)}`}>
                                <Badge variant="secondary" className="text-base px-3 py-1 cursor-pointer hover:bg-primary/20">{section}</Badge>
                            </Link>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm">No sections found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
