import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { WS_URL } from '../config';

interface RealtimeContextType {
  isConnected: boolean;
  lastUpdate: Date | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastUpdate: null,
});

// Move useRealtime hook before the provider
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // WebSocket setup
  useEffect(() => {
    const socketInstance = io(WS_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('newCourseRequest', (data) => {
      console.log('New course request received:', data);
      setLastUpdate(new Date());
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
      queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
    });

    socketInstance.on('courseStatusChanged', (data) => {
      console.log('Course status changed:', data);
      setLastUpdate(new Date());
      
      // Invalidate queries based on the type of status change
      switch (data.type) {
        case 'course_completed':
          queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
          queryClient.invalidateQueries({ queryKey: ['completedCourses'] });
          queryClient.invalidateQueries({ queryKey: ['classes'] });
          break;
        case 'course_cancelled':
          queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
          queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
          break;
        case 'course_assigned':
        case 'course_rescheduled':
          queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
          queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
          queryClient.invalidateQueries({ queryKey: ['instructors'] });
          // Also invalidate organization courses to ensure they see the instructor assignment
          queryClient.invalidateQueries({ queryKey: ['organization-courses'] });
          queryClient.invalidateQueries({ queryKey: ['organization-archived-courses'] });
          // Invalidate instructor-specific queries to ensure instructor portal updates
          queryClient.invalidateQueries({ queryKey: ['instructor', 'classes'] });
          queryClient.invalidateQueries({ queryKey: ['instructor', 'classes', 'today'] });
          queryClient.invalidateQueries({ queryKey: ['instructor', 'classes', 'active'] });
          break;
        default:
          // Invalidate all course-related queries for unknown changes
          queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
          queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
          queryClient.invalidateQueries({ queryKey: ['completedCourses'] });
      }
    });

    socketInstance.on('paymentStatusChanged', (data) => {
      console.log('Payment status changed:', data);
      setLastUpdate(new Date());
      
      // Invalidate organization-related queries when payment status changes
      switch (data.type) {
        case 'payment_verified':
        case 'payment_rejected':
          // Invalidate organization invoices and billing data
          queryClient.invalidateQueries({ queryKey: ['organization-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['organization-paid-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['organization-paid-invoices-summary'] });
          queryClient.invalidateQueries({ queryKey: ['organization-billing-summary'] });
          queryClient.invalidateQueries({ queryKey: ['organization-payment-summary'] });
          // Also invalidate accounting queries
          queryClient.invalidateQueries({ queryKey: ['pending-payment-verifications'] });
          queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
          break;
        default:
          // Invalidate all payment-related queries for unknown changes
          queryClient.invalidateQueries({ queryKey: ['organization-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['organization-billing-summary'] });
          queryClient.invalidateQueries({ queryKey: ['pending-payment-verifications'] });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [queryClient]);

  // SSE setup as fallback
  useEffect(() => {
    if (!isConnected) {
      console.log('Setting up SSE fallback...');
      const eventSource = new EventSource(`${WS_URL}/api/v1/events`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE message received:', data);
        setLastUpdate(new Date());
        
        // Handle different event types
        if (data.type === 'courseStatusChanged') {
          switch (data.data?.type || data.type) {
            case 'course_completed':
              queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
              queryClient.invalidateQueries({ queryKey: ['completedCourses'] });
              queryClient.invalidateQueries({ queryKey: ['classes'] });
              break;
            case 'course_cancelled':
              queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
              queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
              break;
            case 'course_assigned':
            case 'course_rescheduled':
              queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
              queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
              queryClient.invalidateQueries({ queryKey: ['instructors'] });
              // Also invalidate organization courses to ensure they see the instructor assignment
              queryClient.invalidateQueries({ queryKey: ['organization-courses'] });
              queryClient.invalidateQueries({ queryKey: ['organization-archived-courses'] });
              // Invalidate instructor-specific queries to ensure instructor portal updates
              queryClient.invalidateQueries({ queryKey: ['instructor', 'classes'] });
              queryClient.invalidateQueries({ queryKey: ['instructor', 'classes', 'today'] });
              queryClient.invalidateQueries({ queryKey: ['instructor', 'classes', 'active'] });
              break;
            default:
              queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
              queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
              queryClient.invalidateQueries({ queryKey: ['completedCourses'] });
          }
        } else if (data.type === 'paymentStatusChanged') {
          // Handle payment status changes
          switch (data.data?.type || data.type) {
            case 'payment_verified':
            case 'payment_rejected':
              // Invalidate organization invoices and billing data
              queryClient.invalidateQueries({ queryKey: ['organization-invoices'] });
              queryClient.invalidateQueries({ queryKey: ['organization-paid-invoices'] });
              queryClient.invalidateQueries({ queryKey: ['organization-paid-invoices-summary'] });
              queryClient.invalidateQueries({ queryKey: ['organization-billing-summary'] });
              queryClient.invalidateQueries({ queryKey: ['organization-payment-summary'] });
              // Also invalidate accounting queries
              queryClient.invalidateQueries({ queryKey: ['pending-payment-verifications'] });
              queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
              break;
            default:
              // Invalidate all payment-related queries for unknown changes
              queryClient.invalidateQueries({ queryKey: ['organization-invoices'] });
              queryClient.invalidateQueries({ queryKey: ['organization-billing-summary'] });
              queryClient.invalidateQueries({ queryKey: ['pending-payment-verifications'] });
          }
        } else {
          // Default behavior for other events
          queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
          queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
      };

      return () => {
        console.log('Cleaning up SSE connection...');
        eventSource.close();
      };
    }
  }, [isConnected, queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
}; 