
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
      <CardHeader className="flex flex-col gap-3 p-3 md:p-6">
        <div>
          <CardTitle className="flex items-center gap-2 font-headline text-base md:text-lg">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
            AI Summary
          </CardTitle>
          <CardDescription className="text-xs md:text-sm mt-1">Quick insights into attendance patterns.</CardDescription>
        </div>
        <Button onClick={handleGenerateSummary} disabled={isLoading || !teacherId} className="w-full text-xs md:text-sm py-2 h-auto">
          {isLoading ? (
            <Loader2 className="mr-1 md:mr-2 h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <Sparkles className="mr-1 md:mr-2 h-4 w-4 flex-shrink-0" />
          )}
          Generate
        </Button>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="text-xs md:text-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {summary && (
            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert text-xs md:text-sm">
                <p>{summary}</p>
            </div>
        )}
        {!isLoading && !summary && !error && (
          <p className="text-xs md:text-sm text-muted-foreground">
            Click "Generate" to get AI-powered attendance analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
