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
        queryClient.invalidateQueries({ queryKey: ['pendingCourses'] });
        queryClient.invalidateQueries({ queryKey: ['confirmedCourses'] });
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