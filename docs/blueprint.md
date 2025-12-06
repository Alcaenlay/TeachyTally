# **App Name**: TeachyTally

## Core Features:

- Teacher Login: Secure login for teachers using Firebase Authentication.
- Teacher Registration: Allow teachers to register a new account. The information is stored on the firebase database.
- Student Data Upload: Teachers can upload an Excel file containing student names, grades, and sections, and store into Firebase database.
- QR Code Generation: System generates unique QR codes for each student.  An AI tool that takes a student's data and cross-references it to see if it is consistent, before confirming if it should make a code.
- QR Code Scan: Teachers can scan student QR codes using their device's camera to mark attendance.
- Attendance Tracking: Mark students present upon successful QR code scan; mark absent if not scanned by end of day. The attendance is reflected on the firestore database
- Attendance Reporting: Generate reports showing student attendance records. A teacher can only see their students record, but all record are stored into firestore.

## Style Guidelines:

- Primary color: Saturated yellow (#FFD700) to evoke cheerfulness and focus attention.
- Background color: Desaturated yellow (#FAF8D4) to create a calm and clean canvas.
- Accent color: Light orange (#FFB347) to complement the yellow palette and highlight key actions.
- Body and headline font: 'PT Sans', a sans-serif font with a modern and accessible feel.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use clear and simple icons representing attendance, students, and settings.
- Subtle transitions and animations on button clicks and form submissions to provide feedback.