
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { summarizeStudentData } from "@/ai/flows/data-summary-for-teacher";
import { Skeleton } from "../ui/skeleton";

type AiSummaryProps = {
  attendanceData: string;
  teacherId: string | undefined | null;
  teacherName: string | undefined | null;
};

export default function AiSummary({ attendanceData, teacherId, teacherName }: AiSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    if (!teacherId) {
      setError("Cannot generate summary without teacher details.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await summarizeStudentData({
        teacherId: teacherId,
        teacherName: teacherName || "the teacher", // Pass name or a fallback
        studentData: attendanceData,
      });
      setSummary(result.summary);
    } catch (e) {
      setError("Failed to generate AI summary. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="text-primary" />
            AI Attendance Summary
          </CardTitle>
          <CardDescription>Get quick insights into today's attendance patterns.</CardDescription>
        </div>
        <Button onClick={handleGenerateSummary} disabled={isLoading || !teacherId} className="w-full md:w-auto">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Summary
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {summary && (
            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                <p>{summary}</p>
            </div>
        )}
        {!isLoading && !summary && !error && (
          <p className="text-sm text-muted-foreground">
            Click "Generate Summary" to get an AI-powered analysis of the attendance data for the selected date.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
