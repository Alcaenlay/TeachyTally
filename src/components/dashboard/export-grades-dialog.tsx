
"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { Loader2, Download } from "lucide-react";
import type { Grade } from "@/lib/mock-data";
import { format } from "date-fns";
import { Label } from "../ui/label";

type ExportGradesDialogProps = {
  grades: Grade[];
  studentGroups: string[];
  subjects: string[];
};

type Assessment = {
  title: string;
  type: "quiz" | "activity" | "test";
  perfectScore: number;
};


export function ExportGradesDialog({ grades, studentGroups, subjects }: ExportGradesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  
  const { toast } = useToast();

  const handleExport = async () => {
    if (!selectedGroup) {
      toast({ variant: "destructive", title: "No Class Selected", description: "Please select a class to export." });
      return;
    }
    
    setIsLoading(true);

    try {
        let gradesToExport = grades;

        if(selectedGroup) {
            const [grade, section] = selectedGroup.split(' - ');
            gradesToExport = gradesToExport.filter(g => g.grade === grade && g.section === section);
        }
        if(selectedSubject !== 'all' && selectedSubject) {
            gradesToExport = gradesToExport.filter(g => g.subject === selectedSubject);
        }
        if(selectedType !== 'all') {
            gradesToExport = gradesToExport.filter(g => g.type === selectedType);
        }

      const assessmentMap = new Map<string, Assessment>();
      gradesToExport.forEach(grade => {
          const assessmentKey = `${grade.type}-${grade.title}`;
          if (!assessmentMap.has(assessmentKey)) {
              assessmentMap.set(assessmentKey, {
                  title: grade.title,
                  type: grade.type,
                  perfectScore: grade.perfectScore,
              });
          }
      });
      
      const typeOrder = { quiz: 1, activity: 2, test: 3 };
      const sortedAssessments = Array.from(assessmentMap.values()).sort((a, b) => {
        const typeCompare = typeOrder[a.type] - typeOrder[b.type];
        if (typeCompare !== 0) return typeCompare;
        return a.title.localeCompare(b.title);
      });

      const studentSet = new Map<string, {name: string, grade: string, section: string}>();
      gradesToExport.forEach(g => {
        if(!studentSet.has(g.studentId)) {
            studentSet.set(g.studentId, {name: g.studentName, grade: g.grade, section: g.section});
        }
      });
      
      const students = Array.from(studentSet.entries()).map(([id, data]) => ({id, ...data})).sort((a,b) => a.name.localeCompare(b.name));

      const dataForSheet = students.map(student => {
        const row: { [key: string]: string | number } = { 
            "Student Name": student.name,
        };
        sortedAssessments.forEach(assessment => {
            const assessmentTitle = `${assessment.title} (${assessment.perfectScore} pts)`;
            const grade = gradesToExport.find(
                g => g.studentId === student.id && g.title === assessment.title && g.type === assessment.type
            );
            row[assessmentTitle] = grade ? grade.score : "-";
        });
        return row;
      });

      if (dataForSheet.length === 0) {
        toast({ title: "No Data", description: "No grade data could be generated for the selected criteria." });
        setIsLoading(false);
        return;
      }
      
      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
      const groupName = selectedGroup.replace(' - ','_');
      const subjectName = selectedSubject === 'all' || !selectedSubject ? 'All_Subjects' : selectedSubject;
      const typeName = selectedType === 'all' ? 'All_Types' : selectedType;
      
      XLSX.writeFile(workbook, `grades_report_${groupName}_${subjectName}_${typeName}_${format(new Date(), "yyyyMMdd")}.xlsx`);
      resetState();

    } catch (error: any) {
      console.error("Export failed", error);
      toast({ variant: "destructive", title: "Export Failed", description: `An error occurred: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setIsOpen(false);
    setSelectedGroup("");
    setSelectedSubject("all");
    setSelectedType("all");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Gradebook Report</DialogTitle>
          <DialogDescription>
            Select filters to export the gradebook.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                        {studentGroups.map((group) => (
                            <SelectItem key={group} value={group}>
                            {group}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                            {subject}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Assessment Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="quiz">Quizzes</SelectItem>
                        <SelectItem value="activity">Activities</SelectItem>
                        <SelectItem value="test">Tests</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={resetState}>Cancel</Button>
          <Button onClick={handleExport} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
