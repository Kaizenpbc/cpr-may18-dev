import api from './api';
import logger from '../utils/logger';

interface CourseData {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

interface ApiError extends Error {
  code?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
}

class CourseService {
  constructor() {
    logger.debug('[CourseService] Initialized');
  }

  async getAllCourses() {
    try {
      logger.debug('[CourseService] Fetching all courses');
      const response = await api.get('/courses');
      logger.debug('[CourseService] Successfully fetched courses');
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      logger.error('[CourseService] Error fetching courses:', {
        error: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw error;
    }
  }

  async getCourseById(id: number) {
    try {
      logger.debug(`[CourseService] Fetching course with ID: ${id}`);
      const response = await api.get(`/courses/${id}`);
      logger.debug(`[CourseService] Successfully fetched course ${id}`);
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      logger.error(`[CourseService] Error fetching course ${id}:`, {
        error: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw error;
    }
  }

  async createCourse(courseData: CourseData) {
    try {
      logger.debug('[CourseService] Creating new course:', courseData);
      const response = await api.post('/courses', courseData);
      logger.debug('[CourseService] Successfully created course');
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      logger.error('[CourseService] Error creating course:', {
        error: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw error;
    }
  }

  async updateCourse(id: number, courseData: CourseData) {
    try {
      logger.debug(`[CourseService] Updating course ${id}:`, courseData);
      const response = await api.put(`/courses/${id}`, courseData);
      logger.debug(`[CourseService] Successfully updated course ${id}`);
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      logger.error(`[CourseService] Error updating course ${id}:`, {
        error: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw error;
    }
  }

  async deleteCourse(id: number) {
    try {
      logger.debug(`[CourseService] Deleting course ${id}`);
      await api.delete(`/courses/${id}`);
      logger.debug(`[CourseService] Successfully deleted course ${id}`);
    } catch (error) {
      const err = error as ApiError;
      logger.error(`[CourseService] Error deleting course ${id}:`, {
        error: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw error;
    }
  }
}

export default new CourseService();
