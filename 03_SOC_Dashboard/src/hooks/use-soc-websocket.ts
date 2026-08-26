"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Types for real-time data
interface AlertData {
  id: string;
  alertId: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: string;
  source: string;
  title: string;
  description: string;
  endpoint?: string;
  category?: string;
}

interface MetricsData {
  alerts: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolvedToday: number;
    mttr: string;
  };
  threats: {
    blockedToday: number;
    eps: number;
  };
  endpoints: {
    total: number;
    online: number;
  };
  incidents: {
    open: number;
  };
  timestamp: string;
}

interface HealthData {
  components: Array<{
    name: string;
    type: string;
    cpu: number;
    memory: number;
    status: string;
    uptime: number;
  }>;
  overallHealth: number;
  timestamp: string;
}

interface NotificationData {
  type: "new_alert" | "incident_updated" | "system_alert";
  severity: string;
  title: string;
  timestamp: string;
}

// Socket connection state
type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

// Main hook for SOC WebSocket integration
export function useSOCWebSocket() {
  const socketRef = useRef<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  
  // Real-time data states
  const [latestAlert, setLatestAlert] = useState<AlertData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [incidentUpdate, setIncidentUpdate] = useState<any>(null);
  
  // Connection management
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    
    setConnectionStatus("connecting");
    
    try {
      // Import socket.io-client dynamically
      import("socket.io-client").then(({ io }) => {
        socketRef.current = io("/?XTransformPort=3003", {
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        const socket = socketRef.current;

        // Connection events
        socket.on("connect", () => {
          console.log("[SOC WS] Connected to real-time service");
          setConnectionStatus("connected");
          
          // Join all rooms for comprehensive data
          socket.emit("join-room", "alerts");
          socket.emit("join-room", "metrics");
          socket.emit("join-room", "health");
          socket.emit("join-room", "incidents");
        });

        socket.on("disconnect", (reason: string) => {
          console.log("[SOC WS] Disconnected:", reason);
          setConnectionStatus("disconnected");
        });

        socket.connect_error = (error: any) => {
          console.error("[SOC WS] Connection error:", error);
          setConnectionStatus("error");
        };

        // Initial data
        socket.on("connected", (data) => {
          console.log("[SOC WS]", data.message);
        });

        socket.on("initial-alerts", (data) => {
          if (data.lastAlert) {
            setLatestAlert(data.lastAlert);
            setAlerts(prev => [data.lastAlert, ...prev].slice(0, 50));
          }
        });

        socket.on("initial-metrics", (data: MetricsData) => {
          setMetrics(data);
        });

        socket.on("initial-health", (data: HealthData) => {
          setHealth(data);
        });

        // Real-time updates
        socket.on("new-alert", (alert: AlertData) => {
          console.log("[SOC WS] New alert received:", alert.alertId);
          setLatestAlert(alert);
          setAlerts(prev => [alert, ...prev].slice(0, 100)); // Keep last 100
          
          // Add notification
          setNotifications(prev => [{
            type: "new_alert",
            severity: alert.severity.toLowerCase(),
            title: alert.title,
            timestamp: alert.timestamp
          }, ...prev].slice(0, 20));
        });

        socket.on("metrics-update", (data: MetricsData) => {
          setMetrics(data);
        });

        socket.on("health-update", (data: HealthData) => {
          setHealth(data);
        });

        socket.on("incident-updated", (data: any) => {
          console.log("[SOC WS] Incident updated:", data.incidentId);
          setIncidentUpdate(data);
          
          setNotifications(prev => [{
            type: "incident_updated",
            severity: "info",
            title: `Incident ${data.incidentId}: ${data.status}`,
            timestamp: data.timestamp
          }, ...prev].slice(0, 20));
        });

        socket.on("alert-status-updated", (data: any) => {
          console.log("[SOC WS] Alert status updated:", data);
          setAlerts(prev => prev.map(alert => 
            alert.alertId === data.alertId 
              ? { ...alert, status: data.status }
              : alert
          ));
        });

        socket.on("notification", (notification: NotificationData) => {
          setNotifications(prev => [notification, ...prev].slice(0, 20));
        });
      });
    } catch (error) {
      console.error("[SOC WS] Failed to initialize socket:", error);
      setConnectionStatus("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus("disconnected");
    }
  }, []);

  // Manual actions
  const updateAlertStatus = useCallback((alertId: string, status: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("update-alert-status", { alertId, status });
    }
  }, []);

  const requestMetrics = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("request-metrics");
    }
  }, []);

  const requestHealth = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("request-health");
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === "connected",
    
    // Real-time data
    latestAlert,
    alerts,
    metrics,
    health,
    notifications,
    incidentUpdate,
    
    // Actions
    connect,
    disconnect,
    updateAlertStatus,
    requestMetrics,
    requestHealth,
    clearNotifications,
  };
}

// Simplified hook for just alerts
export function useRealtimeAlerts() {
  const { latestAlert, alerts, connectionStatus, updateAlertStatus } = useSOCWebSocket();
  
  return {
    latestAlert,
    alerts,
    isLive: connectionStatus === "connected",
    updateAlertStatus
  };
}

// Simplified hook for just metrics
export function useRealtimeMetrics() {
  const { metrics, connectionStatus, requestMetrics } = useSOCWebSocket();
  
  return {
    metrics,
    isLive: connectionStatus === "connected",
    refresh: requestMetrics
  };
}

// Simplified hook for system health
export function useSystemHealth() {
  const { health, connectionStatus, requestHealth } = useSOCWebSocket();
  
  return {
    health,
    isLive: connectionStatus === "connected",
    refresh: requestHealth
  };
}
