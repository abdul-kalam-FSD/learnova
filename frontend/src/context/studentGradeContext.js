import { createContext, useContext } from "react";

// The student's raw numeric grade (or null), published by GradeBandProvider
// (gradeBandContext.jsx) from the same /auth/me user AppLayout already has.
// The band alone can't tell Grade 4 from Grades 5-6, and the lobby objective
// text is shortened more for Grade 4 (utils/gradeContext.js ->
// simplifyObjective). Null (no provider / no grade) means "show the original
// text", so nothing changes for anything that doesn't opt in.
//
// Kept in its own file (not gradeBandContext.jsx) so that file keeps
// exporting only components, as its fast-refresh lint rule expects.
export const StudentGradeContext = createContext(null);

export function useStudentGrade() {
  return useContext(StudentGradeContext);
}
