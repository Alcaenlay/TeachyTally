
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/icons";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useUser, useDoc, useMemoFirebase } from "@/firebase";
import { getAuth, signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import type { Teacher } from "@/lib/mock-data";

function DashboardApp({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const teacherRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "teachers", user.uid);
  }, [firestore, user]);

  const { data: teacherData, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [isUserLoading, user, router]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push("/");
  };
  
  const isLoading = isUserLoading || isTeacherLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  const userInitial = teacherData?.name ? teacherData.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'T');
  const userDisplayName = teacherData?.name || user.displayName || 'Teacher';
  const userAvatarUrl = teacherData?.photoURL;

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">TeachyTally</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-start gap-3 w-full h-12 px-2">
                 <Avatar className="h-8 w-8">
                  {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt="Teacher Avatar" />}
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="text-left truncate">
                  <p className="font-medium text-sm truncate">{userDisplayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/profile" onClick={() => setOpenMobile(false)}>Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card/50 px-6 backdrop-blur-sm sticky top-0 z-10">
          <SidebarTrigger className="md:hidden" />
          <div className="flex items-center gap-2 md:hidden">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-semibold font-headline">TeachyTally</span>
          </div>
          <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
        </header>
        {children}
      </SidebarInset>
    </>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardApp>{children}</DashboardApp>
    </SidebarProvider>
  )
}
