import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; // Assuming you have an auth hook that provides user info

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:5000/ws';

export const useWebSocket = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const connect = () => {
      const socket = new WebSocket(`${WEBSOCKET_URL}?userId=${user.id}`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          // Handle KYC_UPDATE messages
          if (data.type === 'KYC_UPDATE' && data.payload) {
            const { kycStatus } = data.payload;
            
            toast({
              title: 'KYC Status Updated',
              description: `Your verification status is now: ${kycStatus.toUpperCase()}`,
              variant: kycStatus === 'approved' ? 'default' : 'destructive',
            });

            // Invalidate user query to refetch their data
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
            
            // Optionally, invalidate other queries that depend on user status
            queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }); // Example
          }

          // Handle other message types here...

        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Optional: attempt to reconnect after a delay
        setTimeout(connect, 5000); 
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user?.id, queryClient, toast]);

  const sendMessage = (message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  return { isConnected, sendMessage };
}; 