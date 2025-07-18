import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorApi } from './api';
import { useAuth } from '../contexts/AuthContext';
import { errorHandler, handleError } from './errorHandler';

// Query keys for React Query
export const INSTRUCTOR_QUERY_KEYS = {
  availability: ['instructor', 'availability'],
  classes: ['instructor', 'classes'],
  classesToday: ['instructor', 'classes', 'today'],
  classesCompleted: ['instructor', 'classes', 'completed'],
  classesActive: ['instructor', 'classes', 'active'],
  classStudents: (courseId: number) => ['instructor', 'classes', courseId, 'students'],
  attendance: ['instructor', 'attendance'],
  dashboardStats: ['instructor', 'dashboard', 'stats'],
} as const;

// Data extractors
const extractData = <T>(response: any): T => {
  return response.data?.data || response.data || response;
};

// Hook for instructor availability
export const useInstructorAvailability = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.availability,
    queryFn: async () => {
      const response = await instructorApi.getAvailability();
      console.log('[DEBUG] Availability API response:', response);
      const extractedData = extractData(response);
      console.log('[DEBUG] Extracted availability data:', extractedData);
      return extractedData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for instructor classes
export const useInstructorClasses = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.classes,
    queryFn: async () => {
      console.log('[DEBUG] useInstructorClasses - Making API call to /instructor/classes/active');
      const response = await instructorApi.getClassesActive();
      console.log('[DEBUG] useInstructorClasses - Raw API response:', response);
      const extractedData = extractData(response);
      console.log('[DEBUG] useInstructorClasses - Extracted data:', extractedData);
      console.log('[DEBUG] useInstructorClasses - Data length:', Array.isArray(extractedData) ? extractedData.length : 'not array');
      if (Array.isArray(extractedData)) {
        console.log('[DEBUG] useInstructorClasses - First few items:', extractedData.slice(0, 3));
      }
      return extractedData;
    },
    enabled: !!user?.id,
    staleTime: 0, // Force refetch every time
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook for today's classes
export const useTodayClasses = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.classesToday,
    queryFn: async () => {
      const response = await instructorApi.getClassesToday();
      return extractData(response);
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook for completed classes
export const useCompletedClasses = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.classesCompleted,
    queryFn: async () => {
      const response = await instructorApi.getClassesCompleted();
      return extractData(response);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for active classes
export const useActiveClasses = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.classesActive,
    queryFn: async () => {
      const response = await instructorApi.getClassesActive();
      return extractData(response);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for class students
export const useClassStudents = (courseId: number) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.classStudents(courseId),
    queryFn: async () => {
      const response = await instructorApi.getClassStudents(courseId);
      return extractData(response);
    },
    enabled: !!user?.id && !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for attendance
export const useAttendance = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.attendance,
    queryFn: async () => {
      const response = await instructorApi.getAttendance();
      return extractData(response);
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook for dashboard stats
export const useDashboardStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: INSTRUCTOR_QUERY_KEYS.dashboardStats,
    queryFn: async () => {
      const response = await instructorApi.getDashboardStats();
      return extractData(response);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutations
export const useAddAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (date: string) => {
      const response = await instructorApi.addAvailability(date);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.availability });
    },
    onError: (error) => handleError(error, 'add availability'),
  });
};

export const useRemoveAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (date: string) => {
      const response = await instructorApi.removeAvailability(date);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.availability });
    },
    onError: (error) => handleError(error, 'remove availability'),
  });
};

export const useCompleteClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (courseId: number) => {
      const response = await instructorApi.completeClass(courseId);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classes });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classesCompleted });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classesActive });
    },
    onError: (error) => handleError(error, 'complete class'),
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, students }: { courseId: number; students: any[] }) => {
      const response = await instructorApi.updateAttendance(courseId, students);
      return extractData(response);
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classStudents(courseId) });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classes });
    },
    onError: (error) => handleError(error, 'update attendance'),
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, students }: { courseId: number; students: any[] }) => {
      const response = await instructorApi.markAttendance(courseId, students);
      return extractData(response);
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classStudents(courseId) });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classes });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.attendance });
    },
    onError: (error) => handleError(error, 'mark attendance'),
  });
};

export const useUpdateClassNotes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, notes }: { courseId: number; notes: string }) => {
      const response = await instructorApi.updateClassNotes(courseId, notes);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classes });
    },
    onError: (error) => handleError(error, 'update class notes'),
  });
};

// Utility function to refresh all instructor data
export const useRefreshInstructorData = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['instructor'] });
    queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classes });
    queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classesActive });
    queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classesCompleted });
    queryClient.invalidateQueries({ queryKey: INSTRUCTOR_QUERY_KEYS.classesToday });
  };
}; 