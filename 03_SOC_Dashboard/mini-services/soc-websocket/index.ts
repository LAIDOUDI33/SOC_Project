/**
 * National SOC Algeria - Real-time WebSocket Service
 * 
 * This service provides real-time updates for:
 * - Security alerts (new alerts, status changes)
 * - KPI metrics (live statistics)
 * - System health monitoring
 * - Incident lifecycle updates
 * - Threat intelligence feeds
 * 
 * Port: 3003
 */

import { createServer } from "http";
import { Server } from "socket.io";

// Configuration
const PORT = 3003;

// Create HTTP server and Socket.io instance
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "soc-websocket", port: PORT }));
    return;
  }
  
  res.writeHead(404);
  res.end("Not Found");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  path: "/"
});

// ==================== DATA GENERATORS ====================

// Simulated alert types for realistic SOC data
const ALERT_TEMPLATES = [
  {
    severity: "CRITICAL",
    sources: ["Wazuh SIEM", "Wazuh EDR"],
    titles: ["Ransomware Detection Pattern Match", "Malware Execution Detected", "Data Exfiltration Attempt"],
    descriptions: [
      "Multiple file encryption events detected. Potential ransomware activity.",
      "Malicious payload executed on endpoint. Isolation recommended.",
      "Unusual large data transfer to external IP detected."
    ]
  },
  {
    severity: "HIGH",
    sources: ["MISP TIP", "Suricata IDS", "Wazuh EDR"],
    titles: ["IOC Match: Known APT Indicator", "Intrusion Detection Signature Triggered", "Suspicious PowerShell Execution"],
    descriptions: [
      "Known malicious indicator detected in network traffic.",
      "IDS signature matched attack pattern.",
      "Encoded command execution detected on critical system."
    ]
  },
  {
    severity: "MEDIUM",
    sources: ["Suricata IDS", "Wazuh FIM", "Wazuh SIEM"],
    titles: ["Potential SQL Injection Attempt", "Critical File Modification Detected", "Brute Force Attack Pattern"],
    descriptions: [
      "Web application attack pattern detected in proxy logs.",
      "System file modification outside normal operations.",
      "Multiple failed authentication attempts from single source."
    ]
  },
  {
    severity: "LOW",
    sources: ["Wazuh SIEM", "TheHive SOAR"],
    titles: ["Multiple Failed Login Attempts", "Policy Violation Detected", "Reconnaissance Activity"],
    descriptions: [
      "Elevated failed login count from external IP.",
      "Security policy violation on user workstation.",
      "Port scanning activity detected from external host."
    ]
  }
];

const ENDPOINTS = [
  "FIN-DEPT-0142", "HR-SRV-0089", "EXT-GW-002", "WEB-PROXY-01",
  "DB-MASTER-01", "SSH-BASTION", "MAIL-GW-01", "DC-PRIMARY-01",
  "APP-SERVER-03", "FILE-SERVER-02"
];

const MITRE_TACTICS = {
  "Ransomware": { tactic: "Impact", technique: "T1486" },
  "Malware": { tactic: "Execution", technique: "T1059" },
  "IOC Match": { tactic: "Command & Control", technique: "T1071" },
  "SQL Injection": { tactic: "Initial Access", technique: "T1190" },
  "File Modification": { tactic: "Persistence", technique: "T1098" },
  "Failed Login": { tactic: "Credential Access", technique: "T1110" }
};

// Generate random alert ID
function generateAlertId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
  const seq = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `ALT-${year}-${dayOfYear}${seq}`;
}

// Generate random timestamp within last N minutes
function generateRecentTimestamp(minutesAgo: number = 30): string {
  const now = Date.now();
  const randomOffset = Math.floor(Math.random() * minutesAgo * 60 * 1000);
  return new Date(now - randomOffset).toISOString();
}

// Generate a new simulated alert
function generateAlert(): any {
  const templateIndex = Math.random() < 0.15 ? 0 : (Math.random() < 0.25 ? 1 : (Math.random() < 0.4 ? 2 : 3));
  const template = ALERT_TEMPLATES[templateIndex];
  const titleIndex = Math.floor(Math.random() * template.titles.length);
  
  const title = template.titles[titleIndex];
  const mitreInfo = MITRE_TACTICS[title.split(" ")[0]] || { tactic: "Unknown", technique: "T0000" };

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    alertId: generateAlertId(),
    timestamp: generateRecentTimestamp(),
    severity: template.severity,
    status: "NEW",
    source: template.sources[Math.floor(Math.random() * template.sources.length)],
    title: title,
    description: template.descriptions[titleIndex],
    endpoint: ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)],
    category: Object.keys(MITRE_TACTICS)[titleIndex] || "General",
    mitreTactic: mitreInfo.tactic,
    mitreTechnique: mitreInfo.technique,
    createdAt: new Date().toISOString()
  };
}

// Generate updated metrics with slight variations
function generateMetricsUpdate(): any {
  const baseMetrics = {
    alerts: {
      active: 147,
      critical: 12,
      high: 34,
      medium: 67,
      low: 34,
      resolvedToday: 89,
      mttr: "1.4h"
    },
    threats: {
      blockedToday: 2847,
      eps: 847000
    },
    endpoints: {
      total: 148293,
      online: 142847
    },
    incidents: {
      open: 23
    }
  };

  // Add slight random variations to simulate real-time data
  return {
    alerts: {
      ...baseMetrics.alerts,
      active: baseMetrics.alerts.active + Math.floor(Math.random() * 10) - 3,
      critical: baseMetrics.alerts.critical + (Math.random() > 0.9 ? 1 : 0),
      resolvedToday: baseMetrics.alerts.resolvedToday + Math.floor(Math.random() * 3)
    },
    threats: {
      ...baseMetrics.threats,
      blockedToday: baseMetrics.threats.blockedToday + Math.floor(Math.random() * 20) - 5,
      eps: baseMetrics.threats.eps + Math.floor(Math.random() * 50000) - 25000
    },
    endpoints: {
      ...baseMetrics.endpoints,
      online: baseMetrics.endpoints.online + Math.floor(Math.random() * 100) - 50
    },
    incidents: {
      open: baseMetrics.incidents.open + (Math.random() > 0.95 ? 1 : 0)
    },
    timestamp: new Date().toISOString()
  };
}

// Generate system health update
function generateHealthUpdate(): any {
  const components = [
    { name: "Wazuh SIEM Cluster", type: "SIEM", cpu: 45 + Math.floor(Math.random() * 10), memory: 62 + Math.floor(Math.random() * 5) },
    { name: "TheHive SOAR Platform", type: "SOAR", cpu: 28 + Math.floor(Math.random() * 5), memory: 45 + Math.floor(Math.random() * 8) },
    { name: "Wazuh EDR Agents", type: "EDR", cpu: 70 + Math.floor(Math.random() * 10), memory: 75 + Math.floor(Math.random() * 8) },
    { name: "MISP Threat Intel", type: "TIP", cpu: 35 + Math.floor(Math.random() * 6), memory: 55 + Math.floor(Math.random() * 6) },
    { name: "Suricata IDS", type: "IDS", cpu: 55 + Math.floor(Math.random() * 8), memory: 48 + Math.floor(Math.random() * 5) },
    { name: "Elasticsearch Storage", type: "STORAGE", cpu: 38 + Math.floor(Math.random() * 4), memory: 68 + Math.floor(Math.random() * 4) }
  ];

  return {
    components: components.map(c => ({
      ...c,
      status: c.cpu > 80 || c.memory > 85 ? "DEGRADED" : "HEALTHY",
      uptime: 99 + Math.random()
    })),
    overallHealth: 95 + Math.random() * 4.9,
    timestamp: new Date().toISOString()
  };
}

// ==================== SOCKET EVENT HANDLERS ====================

io.on("connection", (socket) => {
  console.log(`[SOC WS] Client connected: ${socket.id}`);
  console.log(`[SOC WS] Total clients: ${io.engine.clientsCount}`);

  // Send initial data on connection
  socket.emit("connected", {
    message: "Connected to SOC Real-time Service",
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleTimeString()
  });

  // Join rooms for specific data streams
  socket.on("join-room", (room: string) => {
    socket.join(room);
    console.log(`[SOC WS] Client ${socket.id} joined room: ${room}`);
    
    // Send current state when joining
    switch (room) {
      case "alerts":
        socket.emit("initial-alerts", { count: 147, lastAlert: generateAlert() });
        break;
      case "metrics":
        socket.emit("initial-metrics", generateMetricsUpdate());
        break;
      case "health":
        socket.emit("initial-health", generateHealthUpdate());
        break;
    }
  });

  // Leave room
  socket.on("leave-room", (room: string) => {
    socket.leave(room);
    console.log(`[SOC WS] Client ${socket.id} left room: ${room}`);
  });

  // Manual alert status update request
  socket.on("update-alert-status", (data: { alertId: string; status: string }) => {
    console.log(`[SOC WS] Alert ${data.alertId} → ${data.status}`);
    
    // Broadcast to all clients in alerts room
    io.to("alerts").emit("alert-status-updated", {
      alertId: data.alertId,
      status: data.status,
      updatedAt: new Date().toISOString(),
      updatedBy: socket.id
    });
  });

  // Request latest metrics
  socket.on("request-metrics", () => {
    socket.emit("metrics-update", generateMetricsUpdate());
  });

  // Request system health
  socket.on("request-health", () => {
    socket.emit("health-update", generateHealthUpdate());
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`[SOC WS] Client disconnected: ${socket.id}, reason: ${reason}`);
    console.log(`[SOC WS] Remaining clients: ${io.engine.clientsCount}`);
  });

  // Error handling
  socket.on("error", (error) => {
    console.error(`[SOC WS] Socket error for client ${socket.id}:`, error);
  });
});

// ==================== BROADCAST INTERVALS ====================

// Broadcast new alerts every 15-45 seconds (simulating real SOC traffic)
setInterval(() => {
  if (io.engine.clientsCount > 0) {
    const newAlert = generateAlert();
    console.log(`[SOC WS] Broadcasting new alert: ${newAlert.alertId} (${newAlert.severity})`);
    io.to("alerts").emit("new-alert", newAlert);
    
    // Also broadcast to general room for notifications
    io.emit("notification", {
      type: "new_alert",
      severity: newAlert.severity.toLowerCase(),
      title: newAlert.title,
      timestamp: newAlert.timestamp
    });
  }
}, Math.random() * 30000 + 15000); // 15-45 seconds

// Broadcast metrics update every 10 seconds
setInterval(() => {
  if (io.engine.clientsCount > 0) {
    const metrics = generateMetricsUpdate();
    io.to("metrics").emit("metrics-update", metrics);
  }
}, 10000);

// Broadcast health update every 30 seconds
setInterval(() => {
  if (io.engine.clientsCount > 0) {
    const health = generateHealthUpdate();
    io.to("health").emit("health-update", health);
  }
}, 30000);

// Broadcast incident status change simulation every 60-120 seconds
setInterval(() => {
  if (io.engine.clientsCount > 0) {
    const statuses = ["OPEN", "CONTAINED", "ERADICATED", "RECOVERED", "CLOSED"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    io.to("incidents").emit("incident-updated", {
      incidentId: `INC-2026-${Math.floor(Math.random() * 100).toString().padStart(3, "0")}`,
      status: randomStatus,
      timestamp: new Date().toISOString(),
      note: `Status changed to ${randomStatus}`
    });
  }
}, Math.random() * 60000 + 60000); // 60-120 seconds

// ==================== SERVER STARTUP ====================

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                              ║
║   🇩🇿  National SOC Algeria - Real-time WebSocket Service   ║
║                                                              ║
║   ┌──────────────────────────────────────────────────────┐   ║
║   │  Status: ✅ RUNNING                                  │   ║
║   │  Port:   ${PORT}                                        │   ║
║   │  Time:   ${new Date().toISOString()}     │   ║
║   └──────────────────────────────────────────────────────┘   ║
║                                                              ║
║   Available Rooms:                                          ║
║   • alerts     - New security alerts stream                 ║
║   • metrics    - KPI metrics updates (every 10s)            ║
║   • health     - System health monitoring (every 30s)       ║
║   • incidents  - Incident lifecycle updates                ║
║                                                              ║
║   Events:                                                    ║
║   • join-room(room)                                         ║
║   • leave-room(room)                                        ║
║   • update-alert-status(data)                               ║
║   • request-metrics                                         ║
║   • request-health                                          ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n[SOC WS] SIGTERM received, closing connections...");
  io.close(() => {
    console.log("[SOC WS] All connections closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n[SOC WS] SIGINT received, shutting down...");
  io.close(() => {
    console.log("[SOC WS] Server shutdown complete");
    process.exit(0);
  });
});

export { io, httpServer };
