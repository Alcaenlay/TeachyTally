
export type Student = {
  id: string;
  name: string;
  grade: string;
  section: string;
  teacherIds: string[];
  qrCode: string;
  schoolName?: string;
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  schoolName?: string;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string; // Denormalized for easier display
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Late";
  teacherId: string;
  subject: string;
  createdAt: any; // Firestore Timestamp
};

export type Schedule = {
  id: string;
  teacherId: string;
  grade: string;
  section: string;
  subject: string;
  dayOfWeek: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  lateAfterMinutes: number;
};

export type Grade = {
  id: string;
  studentId: string;
  teacherId: string;
  subject: string;
  title: string;
  score: number;
  perfectScore: number;
  type: "quiz" | "activity" | "test";
  date: string;
  studentName: string;
  grade: string;
  section: string;
};


// Mock data is no longer used and will be fetched from Firestore.
export const mockStudents: Student[] = [];
export const mockAttendance: AttendanceRecord[] = [];

    