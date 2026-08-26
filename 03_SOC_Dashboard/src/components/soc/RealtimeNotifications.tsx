"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Types
interface Notification {
  type: "new_alert" | "incident_updated" | "system_alert";
  severity: string;
  title: string;
  timestamp: string;
}

// Notification configuration
const notificationConfig = {
  new_alert: {
    icon: "🚨",
    bgColor: "bg-red-950/80 border-red-800",
    textColor: "text-red-300"
  },
  incident_updated: {
    icon: "📋",
    bgColor: "bg-orange-950/80 border-orange-800",
    textColor: "text-orange-300"
  },
  system_alert: {
    icon: "⚙️",
    bgColor: "bg-blue-950/80 border-blue-800",
    textColor: "text-blue-300"
  }
};

const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/20",
  high: "text-orange-400 bg-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/20",
  low: "text-blue-400 bg-blue-500/20",
  info: "text-slate-400 bg-slate-500/20"
};

// Real-time Notifications Bar Component
export function RealtimeNotificationBar() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // This would receive data from WebSocket in real implementation
  // For now, we'll simulate with a prop or context
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    
    // Auto-hide after 5 seconds for non-critical
    if (notification.severity !== "critical") {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== notification));
      }, 5000);
    }
  };

  // Expose addNotification to window for WebSocket integration
  useEffect(() => {
    (window as any).addSOCNotification = addNotification;
    return () => {
      delete (window as any).addSOCNotification;
    };
  }, []);

  if (!isVisible || notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 w-96 max-h-[400px] overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs text-slate-400 font-medium">
          Live Updates
          {unreadCount > 0 && (
            <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0">
              {unreadCount}
            </Badge>
          )}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs text-slate-400 hover:text-white"
          onClick={() => {
            setIsVisible(false);
            setUnreadCount(0);
          }}
        >
          Dismiss
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.slice(0, 5).map((notification, index) => (
          <NotificationItem 
            key={`${notification.timestamp}-${index}`} 
            notification={notification} 
            onDismiss={() => {
              setNotifications(prev => prev.filter(n => n !== notification));
              setUnreadCount(prev => Math.max(0, prev - 1));
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Individual Notification Item
function NotificationItem({ 
  notification, 
  onDismiss 
}: { 
  notification: Notification; 
  onDismiss: () => void;
}) {
  const config = notificationConfig[notification.type] || notificationConfig.system_alert;
  
  return (
    <div 
      className={`p-3 rounded-lg border ${config.bgColor} backdrop-blur-sm animate-slide-in-right`}
      onClick={onDismiss}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${config.textColor}`}>
              {notification.type === "new_alert" ? "NEW ALERT" : 
               notification.type === "incident_updated" ? "INCIDENT UPDATE" : "SYSTEM"}
            </span>
            <Badge variant="outline" className={`text-[10px] ${severityColors[notification.severity] || severityColors.info}`}>
              {notification.severity.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-white truncate">{notification.title}</p>
          <p className="text-xs text-slate-400 mt-1">
            {formatTimeAgo(notification.timestamp)}
          </p>
        </div>
        
        <button 
          className="text-slate-500 hover:text-white text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Connection Status Indicator
export function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");

  useEffect(() => {
    // Check connection status periodically
    const checkConnection = async () => {
      try {
        const response = await fetch("/?XTransformPort=3003/health");
        if (response.ok) {
          setStatus("connected");
        }
      } catch {
        setStatus("disconnected");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span 
        className={`w-2 h-2 rounded-full ${
          status === "connected" ? "bg-green-500 animate-pulse" :
          status === "connecting" ? "bg-yellow-500 animate-pulse" :
          "bg-red-500"
        }`} 
      />
      <span className="text-xs text-slate-400">
        {status === "connected" ? "Live" :
         status === "connecting" ? "Connecting..." :
         "Offline"}
      </span>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
