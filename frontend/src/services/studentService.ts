import api from './api';

export const getStudentsForCourse = async (courseId: number) => {
  const response = await api.get(`/instructor/classes/${courseId}/students`);
  return response.data;
};

export const updateStudentAttendance = async (
  courseId: number,
  studentId: number,
  attendanceData: { attended: boolean }
) => {
  const response = await api.put(
    `/instructor/classes/${courseId}/students/${studentId}/attendance`,
    attendanceData
  );
  return response.data;
};

export const uploadStudents = async (courseId: number, studentsData: unknown) => {
  const response = await api.post(`/instructor/classes/${courseId}/students`, studentsData);
  return response.data;
};

export const getCourseStudents = async (courseId: number) => {
  return getStudentsForCourse(courseId);
};

export default {
  getStudentsForCourse,
  updateStudentAttendance,
  uploadStudents,
  getCourseStudents,
};
