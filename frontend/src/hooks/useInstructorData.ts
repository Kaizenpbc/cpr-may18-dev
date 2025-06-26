import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { tokenService } from '../services/tokenService';
import logger from '../utils/logger';
import analytics from '../services/analytics';
import React from 'react';

// Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface ScheduledClass {
  course_id: number;
  id: number;
  date: string;
  completed: boolean;
  organizationname: string;
  coursetypename: string;
  course_name?: string;
  location: string;
  studentcount: number;
  studentsattendance: number;
  coursenumber: string;
  studentsregistered: number;
  notes: string;
  start_time: string;
  end_time: string;
}

export interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  attendance: boolean;
}

export interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryIn?: number;
}

// Enhanced error types
export interface EnhancedError {
  message: string;
  code?: string;
  statusCode?: number;
  isRetryable: boolean;
  userMessage: string;
  suggestion?: string;
}

export interface AvailabilitySlot {
  id: number;
  instructor_id: number;
  date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Query Keys for React Query
const QUERY_KEYS = {
  availability: ['instructor', 'availability'],
  classes: ['instructor', 'classes'],
  completedClasses: ['instructor', 'classes', 'completed'],
  classStudents: (courseId: number) => [
    'instructor',
    'classes',
    courseId,
    'students',
  ],
  todayClasses: ['instructor', 'classes', 'today'],
} as const;

// Enhanced retry configuration
const RETRY_CONFIG = {
  availability: { maxRetries: 2, baseDelay: 1000 },
  classes: { maxRetries: 3, baseDelay: 1000 },
  completedClasses: { maxRetries: 2, baseDelay: 1000 },
  critical: { maxRetries: 5, baseDelay: 500 },
  classDetails: { maxRetries: 3, baseDelay: 1000 },
} as const;

// Smart retry function with exponential backoff + jitter
const createRetryFn = (maxRetries: number, baseDelay: number) => {
  return (failureCount: number, error: any): boolean => {
    // Don't retry client errors (4xx) except 408, 429
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      if (![408, 429].includes(error.response.status)) {
        return false;
      }
    }

    return failureCount < maxRetries;
  };
};

// Enhanced retry delay with exponential backoff + jitter
const createRetryDelay = (baseDelay: number) => {
  return (attemptIndex: number): number => {
    // Exponential backoff: baseDelay * 2^attemptIndex
    const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);

    // Add jitter (±25% randomness) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

    // Cap at 30 seconds
    return Math.min(exponentialDelay + jitter, 30000);
  };
};

// Enhanced error message mapping
const getEnhancedError = (error: any, context: string): EnhancedError => {
  const statusCode = error?.response?.status;
  const errorCode = error?.code;
  const backendMessage =
    error?.response?.data?.error?.message || error?.response?.data?.message;

  // Network errors
  if (
    !statusCode &&
    (errorCode === 'NETWORK_ERROR' || error.message?.includes('Network Error'))
  ) {
    return {
      message: error.message,
      code: 'NETWORK_ERROR',
      isRetryable: true,
      userMessage: 'Connection problem detected',
      suggestion:
        "Check your internet connection and we'll retry automatically",
    };
  }

  // HTTP status code errors
  switch (statusCode) {
    case 400:
      // Special handling for attendance validation errors
      if (backendMessage?.includes('attendance')) {
        return {
          message: backendMessage,
          statusCode,
          code: 'VALIDATION_ERROR',
          isRetryable: false,
          userMessage: 'Cannot complete class',
          suggestion:
            backendMessage ||
            'Please mark attendance for all students before completing the class.',
        };
      }
      return {
        message: backendMessage || error.message,
        statusCode,
        code: 'VALIDATION_ERROR',
        isRetryable: false,
        userMessage: 'Invalid request',
        suggestion: backendMessage || 'Please check your input and try again',
      };

    case 401:
      return {
        message: error.message,
        statusCode,
        code: 'UNAUTHORIZED',
        isRetryable: false,
        userMessage: 'Session expired',
        suggestion: 'Please log in again',
      };

    case 403:
      return {
        message: error.message,
        statusCode,
        code: 'FORBIDDEN',
        isRetryable: false,
        userMessage: 'Access denied',
        suggestion: "You don't have permission for this action",
      };

    case 404:
      return {
        message: error.message,
        statusCode,
        code: 'NOT_FOUND',
        isRetryable: false,
        userMessage: context.includes('class')
          ? 'Class not found'
          : 'Resource not found',
        suggestion: context.includes('class')
          ? 'The class may have been cancelled or moved'
          : 'The requested resource is no longer available',
      };

    case 408:
    case 429:
      return {
        message: error.message,
        statusCode,
        code: statusCode === 408 ? 'TIMEOUT' : 'RATE_LIMITED',
        isRetryable: true,
        userMessage:
          statusCode === 408 ? 'Request timed out' : 'Too many requests',
        suggestion: "We'll retry this automatically in a moment",
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: error.message,
        statusCode,
        code: 'SERVER_ERROR',
        isRetryable: true,
        userMessage: 'Server temporarily unavailable',
        suggestion: "We're working on fixing this. Retrying automatically...",
      };

    default:
      return {
        message: backendMessage || error.message || 'Unknown error occurred',
        statusCode,
        code: 'UNKNOWN',
        isRetryable: statusCode ? statusCode >= 500 : true,
        userMessage: `Failed to ${context}`,
        suggestion:
          backendMessage ||
          'Please try again or contact support if this continues',
      };
  }
};

// API Functions with enhanced error handling
const fetchAvailability = async () => {
  try {
    console.log('[fetchAvailability] Making request to /instructor/availability');
    const response = await api.get<ApiResponse<AvailabilitySlot[]>>('/instructor/availability');
    console.log('[fetchAvailability] Raw response:', response);
    console.log('[fetchAvailability] Response data:', response.data);
    console.log('[fetchAvailability] Response data.data:', response.data.data);
    
    if (!response.data.data) {
      console.error('[fetchAvailability] No data in response:', response.data);
      return [];
    }
    return response.data.data;
  } catch (error: any) {
    console.error('[fetchAvailability] Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      headers: error?.response?.headers
    });
    logger.error('Error fetching availability:', error);
    throw error;
  }
};

const fetchScheduledClasses = async () => {
  try {
    console.log('[fetchScheduledClasses] Making request to /instructor/classes');
    const response = await api.get<ApiResponse<ScheduledClass[]>>('/instructor/classes');
    console.log('[fetchScheduledClasses] Raw response:', response);
    console.log('[fetchScheduledClasses] Response data:', response.data);
    console.log('[fetchScheduledClasses] Response data.data:', response.data.data);
    
    if (!response.data.data) {
      console.error('[fetchScheduledClasses] No data in response:', response.data);
      return [];
    }
    return response.data.data;
  } catch (error: any) {
    console.error('[fetchScheduledClasses] Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      headers: error?.response?.headers
    });
    logger.error('Error fetching scheduled classes:', error);
    throw error;
  }
};

const fetchCompletedClasses = async () => {
  try {
    console.log('[fetchCompletedClasses] Making request to /instructor/classes/completed');
    const response = await api.get<ApiResponse<ScheduledClass[]>>('/instructor/classes/completed');
    console.log('[fetchCompletedClasses] Raw response:', response);
    console.log('[fetchCompletedClasses] Response data:', response.data);
    console.log('[fetchCompletedClasses] Response data.data:', response.data.data);
    
    if (!response.data.data) {
      console.error('[fetchCompletedClasses] No data in response:', response.data);
      return [];
    }
    return response.data.data;
  } catch (error: any) {
    console.error('[fetchCompletedClasses] Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      headers: error?.response?.headers
    });
    logger.error('Error fetching completed classes:', error);
    throw error;
  }
};

const fetchClassStudents = async (courseId: number) => {
  try {
    const response = await api.get<ApiResponse<Student[]>>(`/instructor/classes/${courseId}/students`);
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching class students:', error);
    throw error;
  }
};

const fetchTodayClasses = async () => {
  try {
    const response = await api.get<ApiResponse<ScheduledClass[]>>('/instructor/classes/today');
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching today classes:', error);
    throw error;
  }
};

export const useInstructorData = () => {
  const { user, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<EnhancedError | null>(null);
  const [retryStates, setRetryStates] = useState<Record<string, RetryState>>({});

  console.log('[useInstructorData] Hook initialized with user:', user);

  // Helper to update retry state
  const updateRetryState = useCallback(
    (queryKey: string, state: Partial<RetryState>) => {
      setRetryStates(prev => ({
        ...prev,
        [queryKey]: { ...prev[queryKey], ...state },
      }));
    },
    []
  );

  // Enhanced onError handler
  const createErrorHandler = useCallback(
    (queryKey: string, context: string) => {
      return (error: any) => {
        const enhancedError = getEnhancedError(error, context);

        // Handle auth errors
        if (enhancedError.statusCode === 401) {
          tokenService.clearTokens();
          window.location.href = '/login';
          return;
        }

        setError(enhancedError);

        // Track error for analytics
        logger.error(`[useInstructorData] ${context} error:`, enhancedError);
      };
    },
    []
  );

  // Enhanced onRetry handler
  const createRetryHandler = useCallback(
    (queryKey: string, maxRetries: number) => {
      return (failureCount: number, error: any) => {
        const enhancedError = getEnhancedError(error, 'retry');

        updateRetryState(queryKey, {
          isRetrying: true,
          retryCount: failureCount,
          maxRetries,
        });

        logger.info(
          `[useInstructorData] Retrying ${queryKey} (${failureCount}/${maxRetries})`,
          enhancedError
        );
      };
    },
    [updateRetryState]
  );

  // Check authentication before making any requests
  useEffect(() => {
    const token = tokenService.getAccessToken();
    if (token && !user) {
      checkAuth();
    }
  }, [user, checkAuth]);

  // Fetch availability data with enhanced logging
  const { 
    data: availableDates = [], 
    isLoading: availabilityLoading,
    error: availabilityError,
    isFetching: availabilityFetching
  } = useQuery({
    queryKey: QUERY_KEYS.availability,
    queryFn: async () => {
      console.log('[TRACE] Starting availability fetch');
      try {
        const token = tokenService.getAccessToken();
        console.log('[TRACE] Auth token present:', !!token);
        
        const response = await api.get('/instructor/availability');
        console.log('[TRACE] Availability API response:', JSON.stringify(response.data, null, 2));
        
        if (!response.data || !response.data.data) {
          console.error('[TRACE] Invalid availability response:', response.data);
          return [];
        }

        const availabilityData = response.data.data;
        console.log('[TRACE] Availability data array:', JSON.stringify(availabilityData, null, 2));
        console.log('[TRACE] Number of availability dates:', availabilityData.length);
        
        // Ensure each item has the required fields
        return availabilityData.map((item: any) => ({
          id: item.id,
          instructor_id: item.instructor_id,
          date: item.date,
          status: item.status || 'Available',
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
      } catch (error) {
        console.error('[TRACE] Availability fetch error:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: createRetryFn(RETRY_CONFIG.availability.maxRetries, RETRY_CONFIG.availability.baseDelay),
    retryDelay: createRetryDelay(RETRY_CONFIG.availability.baseDelay),
  });

  console.log('[useInstructorData] Availability query state:', {
    availableDates,
    availabilityLoading,
    availabilityError,
    availabilityFetching,
    userId: user?.id
  });

  // Fetch scheduled classes
  const { 
    data: scheduledClasses = [], 
    isLoading: classesLoading,
    error: classesError,
    isFetching: classesFetching
  } = useQuery({
    queryKey: QUERY_KEYS.classes,
    queryFn: async () => {
      console.log('🔍 [TRACE] Scheduled classes queryFn called');
      const result = await fetchScheduledClasses();
      console.log('🔍 [TRACE] fetchScheduledClasses returned:', JSON.stringify(result, null, 2));
      return result;
    },
    enabled: !!user?.id,
    retry: createRetryFn(RETRY_CONFIG.classes.maxRetries, RETRY_CONFIG.classes.baseDelay),
    retryDelay: createRetryDelay(RETRY_CONFIG.classes.baseDelay),
  });

  console.log('[useInstructorData] Classes query state:', {
    scheduledClasses,
    classesLoading,
    classesError,
    classesFetching
  });
  
  console.log('🔍 [TRACE] scheduledClasses data:', JSON.stringify(scheduledClasses, null, 2));

  // Fetch completed classes
  const { 
    data: completedClasses = [], 
    isLoading: completedClassesLoading,
    error: completedError,
    isFetching: completedFetching
  } = useQuery({
    queryKey: QUERY_KEYS.completedClasses,
    queryFn: fetchCompletedClasses,
    enabled: !!user?.id,
    retry: createRetryFn(RETRY_CONFIG.completedClasses.maxRetries, RETRY_CONFIG.completedClasses.baseDelay),
    retryDelay: createRetryDelay(RETRY_CONFIG.completedClasses.baseDelay),
  });

  console.log('[useInstructorData] Completed classes query state:', {
    completedClasses,
    completedClassesLoading,
    completedError,
    completedFetching
  });

  // Add availability mutation
  const addAvailabilityMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await api.post('/instructor/availability', { date });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.availability });
    },
    onError: (error: any) => {
      const enhancedError = getEnhancedError(error, 'add availability');
      setError(enhancedError);
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      }
    },
  });

  // Remove availability mutation
  const removeAvailabilityMutation = useMutation({
    mutationFn: async (date: string) => {
      try {
        const response = await api.delete(`/instructor/availability/${date}`);
        return response.data;
      } catch (error: any) {
        logger.error('[useInstructorData] Remove availability error:', error);
        throw error;
      }
    },
    onMutate: async (date) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.availability });
      
      // Snapshot the previous value
      const previousAvailability = queryClient.getQueryData(QUERY_KEYS.availability);
      
      // Optimistically update to the new value
      queryClient.setQueryData(QUERY_KEYS.availability, (old: any) => 
        old.filter((item: any) => item.date !== date)
      );
      
      return { previousAvailability };
    },
    onError: (error: any, date, context) => {
      // Rollback to the previous value
      if (context?.previousAvailability) {
        queryClient.setQueryData(QUERY_KEYS.availability, context.previousAvailability);
      }
      
      const enhancedError = getEnhancedError(error, 'remove availability');
      setError(enhancedError);
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.availability });
    },
  });

  // Complete class mutation
  const completeClassMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const response = await api.post(`/instructor/classes/${courseId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.completedClasses });
    },
    onError: (error: any) => {
      const enhancedError = getEnhancedError(error, 'complete class');
      setError(enhancedError);
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      }
    },
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ courseId, students }: { courseId: number; students: Student[] }) => {
      const response = await api.post(`/instructor/classes/${courseId}/attendance`, { students });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classes });
    },
    onError: (error: any) => {
      const enhancedError = getEnhancedError(error, 'update attendance');
      setError(enhancedError);
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      }
    },
  });

  // Manual retry function
  const retryFailedQueries = useCallback(async () => {
    const failedQueries = [
      { key: QUERY_KEYS.availability, error: availabilityError },
      { key: QUERY_KEYS.classes, error: classesError },
      { key: QUERY_KEYS.completedClasses, error: completedError },
    ].filter(q => q.error);

    for (const query of failedQueries) {
      await queryClient.invalidateQueries({ queryKey: query.key });
    }
  }, [queryClient, availabilityError, classesError, completedError]);

  // Optimized class students fetcher with caching
  const fetchClassStudentsOptimized = useCallback(
    async (courseId: number): Promise<Student[]> => {
      const cachedData = queryClient.getQueryData(
        QUERY_KEYS.classStudents(courseId)
      );
      if (cachedData) {
        return cachedData as Student[];
      }

      try {
        const students = await fetchClassStudents(courseId);
        // Cache the result for 5 minutes
        queryClient.setQueryData(QUERY_KEYS.classStudents(courseId), students);
        return students;
      } catch (error: any) {
        const enhancedError = getEnhancedError(error, 'load class students');
        logger.error(
          '[useInstructorData] Error fetching students:',
          enhancedError
        );
        throw enhancedError;
      }
    },
    [queryClient]
  );

  // Manual refresh function
  const loadData = useCallback(async () => {
    console.log('[useInstructorData] loadData called');
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.availability }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classes }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.completedClasses })
      ]);
      console.log('[useInstructorData] Queries invalidated successfully');
    } catch (error) {
      console.error('[useInstructorData] Error invalidating queries:', error);
    }
  }, [queryClient]);

  // Prefetch today's classes on mount for better UX
  useEffect(() => {
    if (user) {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.todayClasses,
        queryFn: () =>
          api
            .get('/instructor/classes/today')
            .then(res => res.data.data),
        staleTime: 1 * 60 * 1000, // 1 minute
      });
    }
  }, [user, queryClient]);

  // Handle query errors
  useEffect(() => {
    if (availabilityError) {
      const enhancedError = getEnhancedError(availabilityError, 'availability');
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      } else {
        setError(enhancedError);
      }
    }
  }, [availabilityError]);

  useEffect(() => {
    if (classesError) {
      const enhancedError = getEnhancedError(classesError, 'classes');
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      } else {
        setError(enhancedError);
      }
    }
  }, [classesError]);

  useEffect(() => {
    if (completedError) {
      const enhancedError = getEnhancedError(completedError, 'completed classes');
      if (enhancedError.code === 'UNAUTHORIZED') {
        tokenService.clearTokens();
        window.location.href = '/login';
      } else {
        setError(enhancedError);
      }
    }
  }, [completedError]);

  // Clear error after 10 seconds (longer for enhanced errors)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Compute derived state
  const loading = availabilityLoading || classesLoading || completedClassesLoading;
  const isFetching =
    availabilityFetching || classesFetching || completedFetching;
  const hasError = availabilityError || classesError || completedError || error;

  // Combine scheduled classes and availability slots into a single array, sorted by date
  const combinedSchedule = React.useMemo(() => {
    console.log('[TRACE] Starting combinedSchedule computation');
    console.log('[TRACE] Raw availableDates:', JSON.stringify(availableDates, null, 2));
    console.log('[TRACE] Raw scheduledClasses:', JSON.stringify(scheduledClasses, null, 2));

    const availabilityItems = availableDates.map((availability: AvailabilitySlot) => {
      console.log('[TRACE] Processing availability item:', JSON.stringify(availability, null, 2));
      return {
        displayDate: availability.date,
        key: `available-${availability.date}`,
        status: 'available',
        organization: '',
        location: '',
        courseNumber: '',
        courseType: '',
        studentsRegistered: 0,
        studentsAttendance: 0,
        notes: '',
        start_time: '',
        end_time: ''
      };
    });
    console.log('[TRACE] Transformed availabilityItems:', JSON.stringify(availabilityItems, null, 2));

    const scheduledItems = scheduledClasses.map((c: ScheduledClass) => {
      console.log('[TRACE] Processing scheduled class:', JSON.stringify(c, null, 2));
      return {
        displayDate: c.date,
        key: `scheduled-${c.id}`,
        status: 'scheduled',
        organization: c.organizationname || '',
        location: c.location || '',
        courseNumber: c.coursenumber || '',
        courseType: c.coursetypename || '',
        studentsRegistered: c.studentsregistered || 0,
        studentsAttendance: c.studentsattendance || 0,
        notes: c.notes || '',
        start_time: c.start_time || '',
        end_time: c.end_time || ''
      };
    });
    console.log('[TRACE] Transformed scheduledItems:', JSON.stringify(scheduledItems, null, 2));

    const combined = [...availabilityItems, ...scheduledItems].sort((a, b) => 
      new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime()
    );
    console.log('[TRACE] Final combined schedule:', JSON.stringify(combined, null, 2));

    return combined;
  }, [availableDates, scheduledClasses]);

  // Debug log for availableDates and combinedSchedule
  React.useEffect(() => {
    console.log('[TRACE] useEffect triggered - availableDates changed:', JSON.stringify(availableDates, null, 2));
    console.log('[TRACE] useEffect triggered - combinedSchedule changed:', JSON.stringify(combinedSchedule, null, 2));
  }, [availableDates, combinedSchedule]);

  // Fetch class details with proper error handling
  const getClassDetails = useQuery({
    queryKey: ['classDetails', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const response = await api.get(`/instructor/classes`);
      return response.data.data;
    },
    enabled: !!user && !!user.id,
    retry: createRetryFn(RETRY_CONFIG.classDetails.maxRetries, RETRY_CONFIG.classDetails.baseDelay),
    retryDelay: createRetryDelay(RETRY_CONFIG.classDetails.baseDelay),
  });

  // Fetch class students with proper error handling
  const fetchClassStudents = async (courseId: number) => {
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }
      const response = await api.get(`/instructor/classes/${courseId}/students`);
      return response.data;
    } catch (err: any) {
      const enhancedError = getEnhancedError(err, 'class students');
      setError(enhancedError);
      throw enhancedError;
    }
  };

  const completeClass = async (classId: number) => {
    try {
      console.log('[completeClass] Completing class:', classId);
      const response = await api.put(`/instructor/classes/${classId}/complete`);
      console.log('[completeClass] Response:', response.data);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries(['instructor-classes']);
      queryClient.invalidateQueries(['instructor-classes-completed']);
      
      return response.data.data;
    } catch (error: any) {
      console.error('[completeClass] Error:', error);
      throw error;
    }
  };

  return {
    availableDates,
    scheduledClasses,
    completedClasses,
    loading,
    error,
    addAvailability: addAvailabilityMutation.mutate,
    removeAvailability: removeAvailabilityMutation.mutate,
    isAddingAvailability: addAvailabilityMutation.isPending,
    isRemovingAvailability: removeAvailabilityMutation.isPending,
    fetchClassStudents: fetchClassStudentsOptimized,
    updateAttendance: updateAttendanceMutation.mutate,
    completeClass,
    loadData: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.availability });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.completedClasses });
    },
    getClassDetails,
    combinedSchedule,
  };
};
