import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface VendorInvoiceUpdate {
  invoiceId: number;
  newStatus?: string;
  notes?: string;
  action?: string;
  updatedBy: string;
  timestamp: string;
}

interface UseVendorInvoiceUpdatesProps {
  onStatusUpdate?: (update: VendorInvoiceUpdate) => void;
  onNotesUpdate?: (update: VendorInvoiceUpdate) => void;
  onRefresh?: () => void;
}

export const useVendorInvoiceUpdates = ({
  onStatusUpdate,
  onNotesUpdate,
  onRefresh
}: UseVendorInvoiceUpdatesProps = {}) => {
  const socket: Socket = io('http://localhost:3001');

  const handleStatusUpdate = useCallback((update: VendorInvoiceUpdate) => {
    console.log('🔄 Real-time status update received:', update);
    onStatusUpdate?.(update);
    onRefresh?.();
  }, [onStatusUpdate, onRefresh]);

  const handleNotesUpdate = useCallback((update: VendorInvoiceUpdate) => {
    console.log('📝 Real-time notes update received:', update);
    onNotesUpdate?.(update);
    onRefresh?.();
  }, [onNotesUpdate, onRefresh]);

  useEffect(() => {
    // Listen for status updates
    socket.on('vendor_invoice_status_updated', handleStatusUpdate);
    
    // Listen for notes updates
    socket.on('vendor_invoice_notes_updated', handleNotesUpdate);

    // Cleanup on unmount
    return () => {
      socket.off('vendor_invoice_status_updated', handleStatusUpdate);
      socket.off('vendor_invoice_notes_updated', handleNotesUpdate);
      socket.disconnect();
    };
  }, [socket, handleStatusUpdate, handleNotesUpdate]);

  return {
    socket,
    isConnected: socket.connected
  };
}; 