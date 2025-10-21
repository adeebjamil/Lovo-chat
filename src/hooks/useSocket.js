import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for managing Socket.IO connection with authentication and auto-reconnection
 * @param {string} serverUrl - The WebSocket server URL
 * @param {string} token - JWT authentication token
 */
export function useSocket(serverUrl, token) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!token) return;

    console.log('🔌 Initializing socket connection...');

    // Create socket instance with authentication
    const socketInstance = io(serverUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server forcibly disconnected, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
      setConnectionError(error.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        setConnectionError('Failed to connect after multiple attempts. Please refresh the page.');
      }
    });

    // Exponential backoff for reconnection
    socketInstance.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}/${maxReconnectAttempts}`);
      const delay = Math.min(1000 * Math.pow(2, attemptNumber), 10000);
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed permanently');
      setConnectionError('Unable to reconnect. Please refresh the page.');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, [serverUrl, token]);

  // Helper method to emit events safely
  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit: Socket not connected');
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    connectionError,
    emit
  };
}
