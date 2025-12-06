
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, QrCode, CalendarCheck, GraduationCap } from "lucide-react";
import { Logo } from "@/components/icons";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useEffect, useState } from "react";

const heroImage = PlaceHolderImages.find((img) => img.id === "hero-image");

export default function Home() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold tracking-tight font-headline">TeachyTally</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter font-headline">
              The All-in-One Classroom Assistant.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              TeachyTally empowers educators to effortlessly track attendance with QR codes, manage class schedules, and maintain a digital gradebook. Spend less time on admin and more time teaching.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start for Free
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {heroImage && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[16/9] md:aspect-[2/1] lg:aspect-[2.4/1] overflow-hidden rounded-2xl shadow-2xl">
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                data-ai-hint={heroImage.imageHint}
                priority
              />
               <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">How It Works</h2>
            <p className="mt-4 text-muted-foreground">
              A simple process to modernize your classroom management.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="bg-primary/20 text-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="mt-6 text-xl font-bold font-headline">Generate QR Codes</h3>
                <p className="mt-2 text-muted-foreground">
                  Easily upload your student list and our system will generate a unique QR code for each student.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="bg-primary/20 text-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-line"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
                </div>
                <h3 className="mt-6 text-xl font-bold font-headline">Scan for Attendance</h3>
                <p className="mt-2 text-muted-foreground">
                  Use any device with a camera to scan student QR codes and instantly mark them as present or late.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="bg-primary/20 text-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="mt-6 text-xl font-bold font-headline">Enter Grades</h3>
                <p className="mt-2 text-muted-foreground">
                  Quickly enter scores for quizzes, tests, and activities in a digital gradebook for each class.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="bg-primary/20 text-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <CalendarCheck className="w-8 h-8" />
                </div>
                <h3 className="mt-6 text-xl font-bold font-headline">Track & Report</h3>
                <p className="mt-2 text-muted-foreground">
                  View daily logs, generate reports for attendance and grades, and get AI-powered insights.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-muted-foreground" />
            <span className="text-muted-foreground">© {year} TeachyTally. All rights reserved.</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-primary transition-colors">About the Creator</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
