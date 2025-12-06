
'use server';

/**
 * @fileOverview Summarizes student attendance data for a teacher using AI.
 *
 * - summarizeStudentData - A function that summarizes student attendance data.
 * - DataSummaryForTeacherInput - The input type for the summarizeStudentData function.
 * - DataSummaryForTeacherOutput - The return type for the summarizeStudentData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DataSummaryForTeacherInputSchema = z.object({
  teacherId: z.string().describe('The ID of the teacher.'),
  teacherName: z.string().describe("The name of the teacher. This may be a generic fallback like 'the teacher'."),
  studentData: z
    .string()
    .describe(
      'A string containing all the attendance records for all students under that teacher.'
    ),
});
export type DataSummaryForTeacherInput = z.infer<typeof DataSummaryForTeacherInputSchema>;

const DataSummaryForTeacherOutputSchema = z.object({
  summary: z.string().describe('A summary of the student attendance data.'),
});
export type DataSummaryForTeacherOutput = z.infer<typeof DataSummaryForTeacherOutputSchema>;

export async function summarizeStudentData(
  input: DataSummaryForTeacherInput
): Promise<DataSummaryForTeacherOutput> {
  return dataSummaryForTeacherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dataSummaryForTeacherPrompt',
  input: {schema: DataSummaryForTeacherInputSchema},
  output: {schema: DataSummaryForTeacherOutputSchema},
  prompt: `You are an AI assistant providing a direct summary of student attendance.
  Based on the provided attendance data, generate a concise summary of key trends and potential issues.
  Highlight any students with consistently poor attendance, overall attendance rates, and any notable patterns.
  The summary should be direct and address the user in the second person (e.g., "Here is a summary of your class..."). Do not refer to the teacher in the third person.

  Attendance Data: {{{studentData}}}
  \nSummary:`,
});

const dataSummaryForTeacherFlow = ai.defineFlow(
  {
    name: 'dataSummaryForTeacherFlow',
    inputSchema: DataSummaryForTeacherInputSchema,
    outputSchema: DataSummaryForTeacherOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
