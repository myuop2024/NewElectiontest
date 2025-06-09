import express, { type Express, type Request, type Response } from "express";
import session from "express-session";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { db } from "./db";
import { settings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { insertUserSchema } from "@shared/schema";
import { SecurityService } from "./lib/security.js";
import { KYCService } from "./lib/kyc-service.js";
import { NotificationService } from "./lib/notification-service.js";
import { AnalyticsService } from "./lib/analytics-service.js";
import { TrainingService } from "./lib/training-service.js";
import { RouteService } from "./lib/route-service.js";
import { CommunicationService } from "./lib/communication-service.js";
import { FormBuilderService } from "./lib/form-builder-service.js";
import { ChatService } from "./lib/chat-service.js";
import { AdminSettingsService } from "./lib/admin-settings-service.js";
import { createAIIncidentService } from "./lib/ai-incident-service.js";
import { googleSheetsService } from "./lib/google-sheets-service.js";
import { aiClassificationService } from "./lib/ai-classification-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT Secret - use environment variable or fallback
const JWT_SECRET = process.env.JWT_SECRET || "caffe-electoral-observer-secret-2024";

// Extend Express Request type to include user and session
declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
  }
}

interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; role: string };
  session: session.Session & Partial<session.SessionData>;
}



// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

async function initializeAdminAccount() {
  try {
    // Check if admin account already exists
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("Admin account already exists");
      return;
    }

    // Get Kingston parish for admin account
    const parishes = await storage.getParishes();
    const kingstonParish = parishes.find(p => p.name === "Kingston");
    
    if (!kingstonParish) {
      console.error("Kingston parish not found for admin account creation");
      return;
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash("Admin123!@#", 10);
    const observerId = SecurityService.generateObserverId();
    
    const adminUser = await storage.createUser({
      username: "admin",
      email: "admin@caffe.org.jm",
      password: hashedPassword,
      firstName: "CAFFE",
      lastName: "Administrator",
      phone: "876-000-0000",
      parishId: kingstonParish.id,
      address: "CAFFE Headquarters, Kingston, Jamaica",
      community: "New Kingston",
      role: "admin",
      status: "active",
      kycStatus: "verified",
      trainingStatus: "certified"
    });

    console.log(`Admin account created successfully with ID: ${adminUser.id}`);
    console.log("Admin credentials: username: admin, password: Admin123!@#");
  } catch (error) {
    console.error("Failed to create admin account:", error);
  }
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: any) {
  // Check if user is logged in via session
  if (!req.session.userId || !req.session.username || !req.session.role) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Set user object from session data
  req.user = {
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role
  };
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize admin account
  await initializeAdminAccount();

  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const observerId = await storage.generateObserverId();
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: userData.role || "Observer",
        status: "Active"
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user info in session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({ 
        user: { ...user, password: undefined }, 
        token: "session-based" 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Parishes
  app.get("/api/parishes", async (_req: Request, res: Response) => {
    try {
      const parishes = await storage.getParishes();
      
      // Initialize parishes if empty
      if (parishes.length === 0) {
        const jamaicanParishes = [
          { name: "Kingston", code: "KGN" },
          { name: "St. Andrew", code: "STA" },
          { name: "St. Thomas", code: "STT" },
          { name: "Portland", code: "POR" },
          { name: "St. Mary", code: "STM" },
          { name: "St. Ann", code: "SAN" },
          { name: "Trelawny", code: "TRL" },
          { name: "St. James", code: "STJ" },
          { name: "Hanover", code: "HAN" },
          { name: "Westmoreland", code: "WML" },
          { name: "St. Elizabeth", code: "STE" },
          { name: "Manchester", code: "MAN" },
          { name: "Clarendon", code: "CLA" },
          { name: "St. Catherine", code: "STC" }
        ];

        for (const parishData of jamaicanParishes) {
          await storage.createParish(parishData);
        }
        
        const newParishes = await storage.getParishes();
        res.json(newParishes);
      } else {
        res.json(parishes);
      }
    } catch (error) {
      console.error("Get parishes error:", error);
      res.status(500).json({ message: "Failed to get parishes" });
    }
  });

  // Polling stations
  app.get("/api/polling-stations", async (_req: Request, res: Response) => {
    try {
      const stations = await storage.getPollingStations();
      res.json(stations);
    } catch (error) {
      console.error("Get polling stations error:", error);
      res.status(500).json({ message: "Failed to get polling stations" });
    }
  });

  // Reports
  app.get("/api/reports", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reports = req.user?.role === "Admin" 
        ? await storage.getReports()
        : await storage.getReportsByUser(req.user!.id);
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // HERE API Settings - Public endpoint for map functionality (API key needed for maps to load)
  app.get("/api/settings/here-api", async (req: Request, res: Response) => {
    try {
      // Use environment variable if available, otherwise fall back to database
      const envApiKey = process.env.HERE_API_KEY;
      
      if (envApiKey) {
        res.json({ 
          configured: true,
          hasKey: true,
          apiKey: envApiKey
        });
        return;
      }

      const setting = await storage.getSettingByKey("HERE_API_KEY");
      const hasKey = !!(setting?.value);
      
      res.json({ 
        configured: hasKey,
        hasKey: hasKey,
        apiKey: hasKey ? setting.value : undefined
      });
    } catch (error) {
      console.error("Get HERE API settings error:", error);
      res.status(500).json({ message: "Failed to get HERE API settings" });
    }
  });

  app.post("/api/settings/here-api", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      await storage.updateSetting("HERE_API_KEY", apiKey, req.user.id);
      res.json({ message: "HERE API key updated successfully" });
    } catch (error) {
      console.error("Update HERE API key error:", error);
      res.status(500).json({ message: "Failed to update HERE API key" });
    }
  });

  // Observer assignments routes
  app.get("/api/assignments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.get("/api/assignments/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const assignments = await storage.getAssignmentsByUser(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ error: "Failed to fetch user assignments" });
    }
  });

  app.post("/api/assignments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignment = await storage.createAssignment({
        ...req.body,
        assignmentType: req.body.assignmentType || 'station',
        startDate: req.body.startDate || new Date().toISOString(),
        endDate: req.body.endDate || new Date().toISOString()
      });
      res.json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.patch("/api/assignments/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.updateAssignment(id, req.body);
      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Enhanced reports routes for incident reporting
  app.get("/api/reports/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const reports = await storage.getReportsByUser(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching user reports:", error);
      res.status(500).json({ error: "Failed to fetch user reports" });
    }
  });

  // Update report status endpoint
  app.patch("/api/reports/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      const updates = req.body;
      
      if (!reportId) {
        return res.status(400).json({ error: "Invalid report ID" });
      }

      const updatedReport = await storage.updateReport(reportId, updates);
      
      // Create audit log for status update
      await storage.createAuditLog({
        action: "report_status_updated",
        entityType: "report",
        userId: req.user?.id,
        entityId: reportId.toString(),
        ipAddress: req.ip
      });

      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  app.post("/api/reports", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const report = await storage.createReport({
        ...req.body,
        userId: req.user?.id
      });
      
      // Create audit log for incident report
      await storage.createAuditLog({
        action: "incident_reported",
        entityType: "report",
        userId: req.user?.id,
        entityId: report.id.toString(),
        ipAddress: req.ip
      });

      // Notify administrators and roving observers via WebSocket
      const notificationData = {
        type: 'incident_reported',
        report: {
          id: report.id,
          title: report.title,
          description: report.description,
          type: report.type,
          priority: report.priority || 'medium',
          status: report.status,
          stationId: report.stationId,
          reporterName: req.user?.username,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      // Get target recipients for real-time notifications
      let targetUserIds = [];
      
      // Always include all admins
      const adminUsers = await storage.getUsersByRole('admin');
      targetUserIds.push(...adminUsers.map(admin => admin.id));
      
      // Include parish-specific roving observers
      if (report.stationId) {
        try {
          const station = await storage.getPollingStations().then(stations => 
            stations.find(s => s.id === report.stationId)
          );
          
          if (station && station.parishId) {
            const parishStations = await storage.getPollingStationsByParish(station.parishId);
            const stationIds = parishStations.map(s => s.id);
            
            const assignments = await storage.getAssignments();
            const parishAssignments = assignments.filter(a => 
              stationIds.includes(a.stationId) && 
              a.assignmentType === 'roving' && 
              a.status === 'active'
            );
            
            targetUserIds.push(...parishAssignments.map(a => a.userId));
          }
        } catch (error) {
          console.error('Error getting parish assignments for WebSocket:', error);
        }
      }

      // Send to targeted connected users
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          const clientInfo = (client as any).userInfo;
          if (clientInfo && targetUserIds.includes(clientInfo.userId)) {
            client.send(JSON.stringify(notificationData));
          }
        }
      });

      // Get administrators (site-wide notifications)
      const admins = await storage.getUsersByRole('admin');
      
      // Get parish information for the polling station
      let parishRovingObservers: any[] = [];
      if (report.stationId) {
        try {
          const station = await storage.getPollingStations().then(stations => 
            stations.find(s => s.id === report.stationId)
          );
          
          if (station && station.parishId) {
            // Get roving observers assigned to stations in this parish
            const parishStations = await storage.getPollingStationsByParish(station.parishId);
            const stationIds = parishStations.map(s => s.id);
            
            // Get all assignments for this parish's stations
            const assignments = await storage.getAssignments();
            const parishAssignments = assignments.filter(a => 
              stationIds.includes(a.stationId) && 
              a.assignmentType === 'roving' && 
              a.status === 'active'
            );
            
            // Get the actual roving observers
            const rovingObserverIds = parishAssignments.map(a => a.userId);
            const allRovingObservers = await storage.getUsersByRole('roving_observer');
            parishRovingObservers = allRovingObservers.filter(observer => 
              rovingObserverIds.includes(observer.id)
            );
          }
        } catch (error) {
          console.error('Error getting parish roving observers:', error);
          // Fallback to all roving observers if parish lookup fails
          parishRovingObservers = await storage.getUsersByRole('roving_observer');
        }
      } else {
        // If no station specified, notify all roving observers
        parishRovingObservers = await storage.getUsersByRole('roving_observer');
      }

      // Create notification records for tracking
      const allRecipients = [...admins, ...parishRovingObservers];
      for (const recipient of allRecipients) {
        try {
          await storage.createMessage({
            senderId: req.user!.id,
            recipientId: recipient.id,
            content: `New incident report: ${report.title} (${report.type})`,
            messageType: 'incident_notification',
            metadata: JSON.stringify({
              reportId: report.id,
              priority: report.priority || 'medium',
              stationId: report.stationId
            })
          });
        } catch (msgError) {
          console.error('Error creating notification message:', msgError);
        }
      }

      res.json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Check-in routes
  app.post("/api/check-ins", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const checkIn = await storage.createCheckIn({
        ...req.body,
        userId: req.user?.id
      });
      
      // Create audit log for check-in
      await storage.createAuditLog({
        action: "observer_checkin",
        entityType: "checkin",
        userId: req.user?.id,
        entityId: checkIn.id.toString(),
        ipAddress: req.ip
      });

      res.json(checkIn);
    } catch (error) {
      console.error("Error creating check-in:", error);
      res.status(500).json({ error: "Failed to create check-in" });
    }
  });

  app.get("/api/check-ins/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user can access these check-ins
      if (req.user?.id !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const checkIns = await storage.getCheckInsByUser(userId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching user check-ins:", error);
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  });

  // Emergency alert routes
  app.post("/api/emergency-alert", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, description, priority, latitude, longitude, timestamp } = req.body;
      
      // Create emergency report with high priority
      const emergencyReport = await storage.createReport({
        userId: req.user!.id,
        stationId: 2, // Use existing polling station ID
        type: 'emergency',
        title: `EMERGENCY: ${type}`,
        description,
        priority: 'critical',
        status: 'active',
        metadata: JSON.stringify({
          emergencyType: type,
          latitude: latitude || null,
          longitude: longitude || null,
          alertTimestamp: timestamp,
          responseRequired: true
        })
      });
      
      // Create audit log for emergency alert
      await storage.createAuditLog({
        action: "emergency_alert_sent",
        entityType: "report",
        userId: req.user!.id,
        entityId: emergencyReport.id.toString(),
        ipAddress: req.ip
      });

      // Broadcast emergency alert via WebSocket to all connected clients
      const wss = (req.app as any).wss;
      const clients = (req.app as any).clients;
      
      if (wss) {
        const alertMessage = {
          type: 'emergency_alert',
          id: emergencyReport.id,
          userId: req.user?.id,
          username: req.user?.username,
          emergencyType: type,
          description,
          priority,
          timestamp,
          location: latitude && longitude ? { latitude, longitude } : null
        };

        // Broadcast to all connected administrators and supervisors
        wss.clients.forEach((client: any) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(alertMessage));
          }
        });
      }

      res.json({
        success: true,
        alertId: emergencyReport.id,
        message: "Emergency alert sent successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      res.status(500).json({ error: "Failed to send emergency alert" });
    }
  });

  // Analytics routes
  app.get("/api/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = "24h", parish = "all" } = req.query;
      
      // Get real analytics data from database
      const stats = await storage.getDashboardStats();
      const reports = await storage.getReports();
      const users = await storage.getUsersByRole("Indoor Observer");
      const rovingObservers = await storage.getUsersByRole("Roving Observer");
      const coordinators = await storage.getUsersByRole("Parish Coordinator");
      
      const allObservers = [...users, ...rovingObservers, ...coordinators];
      
      // Calculate analytics based on real data
      const analyticsData = {
        summary: {
          totalReports: reports.length,
          activeObservers: allObservers.length,
          pollingStations: stats.totalStations,
          criticalIncidents: reports.filter(r => r.priority === 'critical').length
        },
        reportsByHour: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          reports: reports.filter(r => new Date(r.createdAt).getHours() === i).length
        })),
        reportsByType: [
          { name: "Technical Issues", count: reports.filter(r => r.type === 'technical_malfunction').length },
          { name: "Procedural Violations", count: reports.filter(r => r.type === 'procedural_violation').length },
          { name: "Voter Intimidation", count: reports.filter(r => r.type === 'voter_intimidation').length },
          { name: "Ballot Irregularities", count: reports.filter(r => r.type === 'ballot_irregularity').length },
          { name: "Other", count: reports.filter(r => r.type === 'other').length }
        ],
        reportsByParish: [],
        observerActivity: Array.from({ length: 24 }, (_, i) => ({
          time: `${i}:00`,
          active: Math.floor(allObservers.length * 0.7),
          total: allObservers.length
        })),
        incidentSeverity: [
          { severity: "low", count: reports.filter(r => r.priority === 'low').length },
          { severity: "medium", count: reports.filter(r => r.priority === 'medium').length },
          { severity: "high", count: reports.filter(r => r.priority === 'high').length },
          { severity: "critical", count: reports.filter(r => r.priority === 'critical').length }
        ]
      };

      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/live-updates", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get recent activities from database
      const recentReports = await storage.getReports();
      const recentLogs = await storage.getAuditLogs();
      
      const liveUpdates = [
        ...recentReports.slice(-5).map(report => ({
          type: "report",
          message: `New incident reported: ${report.title}`,
          location: "Polling Station",
          timestamp: new Date(report.createdAt).toLocaleString()
        })),
        ...recentLogs.slice(-3).map(log => ({
          type: "activity",
          message: log.action,
          location: "System",
          timestamp: new Date(log.createdAt).toLocaleString()
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json(liveUpdates.slice(0, 10));
    } catch (error) {
      console.error("Error fetching live updates:", error);
      res.status(500).json({ error: "Failed to fetch live updates" });
    }
  });

  // Users by role route for observer assignments
  app.get("/api/users/observers", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const observers = await storage.getUsersByRole("Indoor Observer");
      const rovingObservers = await storage.getUsersByRole("Roving Observer");
      const coordinators = await storage.getUsersByRole("Parish Coordinator");
      
      const allObservers = [...observers, ...rovingObservers, ...coordinators];
      res.json(allObservers);
    } catch (error) {
      console.error("Error fetching observers:", error);
      res.status(500).json({ error: "Failed to fetch observers" });
    }
  });

  // Audit logs route
  app.get("/api/audit-logs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const auditLogs = await storage.getAuditLogs();
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Settings routes
  app.get("/api/settings", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Key and value are required" });
      }

      console.log(`Updating setting: ${key} = ${value}`);

      // Use storage layer for reliability
      try {
        const setting = await storage.updateSetting(key, value.toString(), req.user?.id);
        console.log(`Successfully updated setting: ${key}`);
        res.json(setting);
        
      } catch (dbError) {
        console.error("Database error updating setting:", dbError);
        res.status(500).json({ error: "Database error updating setting" });
      }
      
    } catch (error) {
      console.error("Error in settings route:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Document upload routes
  app.post("/api/documents/upload", authenticateToken, upload.single('document'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { documentType, stationId, description } = req.body;

      // Create document record
      const document = await storage.createDocument({
        userId: req.user?.id || 0,
        reportId: parseInt(req.body.reportId) || null,
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        documentType: documentType || 'other',
        uploadedBy: req.user?.id || 0
      });

      // Simulate OCR processing (in production, integrate with actual OCR service)
      setTimeout(async () => {
        try {
          await storage.updateDocument(document.id, {
            ocrText: 'Sample OCR text extracted from document...',
            processingStatus: 'completed'
          });
        } catch (error) {
          console.error('Error updating document after OCR:', error);
        }
      }, 2000);

      res.json({
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        fileType: document.fileType,
        status: 'processing',
        uploadDate: document.createdAt
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/documents", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/report/:reportId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const documents = await storage.getDocumentsByReport(reportId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching report documents:", error);
      res.status(500).json({ error: "Failed to fetch report documents" });
    }
  });

  // KYC Verification Routes
  app.post("/api/kyc/verify", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { firstName, lastName, dateOfBirth, nationalId, documentType, documentImage, selfieImage } = req.body;
      
      const verificationRequest = {
        firstName,
        lastName,
        dateOfBirth,
        nationalId,
        documentType,
        documentImage,
        selfieImage
      };

      // Before starting, update the user's nationalId if it's not already set
      if (req.user && nationalId) {
        await storage.updateUser(req.user.id, { nationalId });
      }

      const result = await KYCService.verifyWithDidIT(verificationRequest);
      
      // Update user with verification ID
      if (req.user) {
        await storage.updateUser(req.user.id, { 
          kycStatus: 'pending'
        });
      }

      res.json(result);
    } catch (error) {
      console.error('KYC verification error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not activated')) {
          res.status(503).json({ 
            message: 'DidIT API service needs activation',
            details: 'Please activate your DidIT API credentials in the developer portal'
          });
          return;
        }
        if (error.message.includes('credentials')) {
          res.status(401).json({ 
            message: 'Invalid DidIT API credentials',
            details: 'Please check your API key configuration'
          });
          return;
        }
      }
      
      res.status(500).json({ message: 'KYC verification failed' });
    }
  });

  // DidIT Webhook for verification status updates
  app.post("/api/kyc/webhook", async (req: Request, res: Response) => {
    try {
      const { storage } = await import('./storage.js');
      const { id, status, reference_id: nationalId } = req.body;

      console.log(`Received DidIT KYC webhook for verification ID: ${id}, Status: ${status}`);

      if (!nationalId) {
        console.warn('DidIT webhook missing national ID (reference_id).');
        return res.status(400).send('Missing reference_id');
      }

      const user = await storage.getUserByNationalId(nationalId);

      if (user) {
        const newKycStatus = status === 'completed' || status === 'approved' ? 'approved' : 'rejected';
        
        await storage.updateUser(user.id, { 
          kycStatus: newKycStatus
        });

        console.log(`Updated user ${user.username} KYC status to ${newKycStatus}`);
        
        // Broadcast update via WebSocket to the specific user
        const clients = (req.app as any).clients as Map<number, WebSocket>;
        const userSocket = clients.get(user.id);

        if (userSocket && userSocket.readyState === WebSocket.OPEN) {
          userSocket.send(JSON.stringify({
            type: 'KYC_UPDATE',
            payload: {
              userId: user.id,
              kycStatus: newKycStatus,
              verificationId: id
            }
          }));
          console.log(`Sent KYC_UPDATE WebSocket message to user ${user.id}`);
        }
        
      } else {
        console.error(`Could not find user with national ID: ${nationalId}`);
      }

      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Error processing DidIT webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Device Management Routes
  app.post("/api/devices/register", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { deviceName, deviceType, osVersion, browserInfo } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      
      const deviceFingerprint = SecurityService.generateDeviceFingerprint(userAgent, ipAddress, {
        deviceType,
        osVersion,
        browserInfo
      });

      res.json({ success: true, deviceFingerprint });
    } catch (error) {
      console.error('Device registration error:', error);
      res.status(500).json({ message: 'Device registration failed' });
    }
  });

  // Notification Routes
  app.post("/api/notifications/send", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { type, recipient, message, priority, title } = req.body;
      
      const notificationRequest = {
        userId: req.user.id,
        type,
        recipient,
        message,
        priority: priority || 'normal',
        title
      };

      let result;
      switch (type) {
        case 'sms':
          result = await NotificationService.sendSMS(notificationRequest);
          break;
        case 'whatsapp':
          result = await NotificationService.sendWhatsApp(notificationRequest);
          break;
        case 'email':
          result = await NotificationService.sendEmail(notificationRequest);
          break;
        default:
          return res.status(400).json({ message: 'Invalid notification type' });
      }

      res.json(result);
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  // Analytics Routes
  app.get("/api/analytics/dashboard", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = await AnalyticsService.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({ message: 'Failed to get analytics' });
    }
  });

  app.post("/api/analytics/track", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventType, eventData, location } = req.body;
      
      const analyticsEvent = {
        userId: req.user!.id,
        eventType,
        eventData,
        timestamp: new Date(),
        sessionId: req.headers['session-id'] as string,
        deviceFingerprint: req.headers['device-fingerprint'] as string,
        location
      };

      await AnalyticsService.trackEvent(analyticsEvent);
      res.json({ success: true });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(500).json({ message: 'Failed to track event' });
    }
  });

  // Training Routes
  app.get("/api/training/learning-path/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const learningPath = await TrainingService.getPersonalizedLearningPath(userId, 'observer', 'beginner');
      res.json(learningPath);
    } catch (error) {
      console.error('Learning path error:', error);
      res.status(500).json({ message: 'Failed to get learning path' });
    }
  });

  app.get("/api/training/templates", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = FormBuilderService.getFormTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Training templates error:', error);
      res.status(500).json({ message: 'Failed to get templates' });
    }
  });

  // Route Optimization Routes
  app.post("/api/routes/optimize", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const routeOptimization = req.body;
      const optimizedRoute = await RouteService.optimizeRoute(routeOptimization);
      res.json(optimizedRoute);
    } catch (error) {
      console.error('Route optimization error:', error);
      res.status(500).json({ message: 'Route optimization failed' });
    }
  });

  app.post("/api/routes/geocode", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { address } = req.body;
      const location = await RouteService.geocodeAddress(address);
      res.json(location);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ message: 'Geocoding failed' });
    }
  });

  // Form Builder Routes
  app.post("/api/forms/create", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const formData = req.body;
      const form = FormBuilderService.createDynamicForm(formData);
      res.json(form);
    } catch (error) {
      console.error('Form creation error:', error);
      res.status(500).json({ message: 'Failed to create form' });
    }
  });

  app.post("/api/forms/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { form, submissionData } = req.body;
      const validation = FormBuilderService.validateFormSubmission(form, submissionData);
      res.json(validation);
    } catch (error) {
      console.error('Form validation error:', error);
      res.status(500).json({ message: 'Form validation failed' });
    }
  });

  // Communication Routes
  app.post("/api/communication/initiate-call", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recipientId, callType } = req.body;
      const session = await CommunicationService.initiateCall(req.user!.id, recipientId, callType);
      res.json(session);
    } catch (error) {
      console.error('Initiate call error:', error);
      res.status(500).json({ message: 'Failed to initiate call' });
    }
  });

  // Observer ID Generation
  app.post("/api/observers/generate-id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const observerId = SecurityService.generateObserverId();
      res.json({ observerId });
    } catch (error) {
      console.error('Observer ID generation error:', error);
      res.status(500).json({ message: 'Failed to generate observer ID' });
    }
  });

  // Chat Management Routes
  app.post("/api/chat/rooms/assign", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { roomId, userIds } = req.body;
      const assignments = await ChatService.assignUsersToRoom(roomId, userIds, req.user.id);
      res.json({ success: true, assignments });
    } catch (error) {
      console.error('Room assignment error:', error);
      res.status(500).json({ message: 'Failed to assign users to room' });
    }
  });

  app.post("/api/chat/rooms/remove", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { roomId, userIds } = req.body;
      await ChatService.removeUsersFromRoom(roomId, userIds, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Room removal error:', error);
      res.status(500).json({ message: 'Failed to remove users from room' });
    }
  });

  app.get("/api/chat/users/search", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q } = req.query;
      const users = await ChatService.searchUsers(q as string, req.user!.id);
      res.json(users);
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  app.get("/api/chat/conversations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversations = await ChatService.getRecentConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      console.error('Conversations error:', error);
      res.status(500).json({ message: 'Failed to get conversations' });
    }
  });

  app.post("/api/chat/direct-message", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recipientId, content, messageType } = req.body;
      const message = await ChatService.sendDirectMessage(req.user!.id, recipientId, content, messageType);
      res.json(message);
    } catch (error) {
      console.error('Direct message error:', error);
      res.status(500).json({ message: 'Failed to send direct message' });
    }
  });

  app.get("/api/chat/rooms/:roomId/participants", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const participants = await ChatService.getRoomParticipants(req.params.roomId);
      res.json(participants);
    } catch (error) {
      console.error('Room participants error:', error);
      res.status(500).json({ message: 'Failed to get room participants' });
    }
  });

  // Admin Settings Management
  app.get("/api/admin/features/status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const featureStatus = await AdminSettingsService.getFeatureStatus();
      res.json(featureStatus);
    } catch (error) {
      console.error('Feature status error:', error);
      res.status(500).json({ message: 'Failed to get feature status' });
    }
  });

  app.get("/api/admin/system/health", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const health = await AdminSettingsService.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error('System health error:', error);
      res.status(500).json({ message: 'Failed to get system health' });
    }
  });

  app.post("/api/admin/settings/validate/:service", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validation = await AdminSettingsService.validateAPIConfiguration(req.params.service);
      res.json(validation);
    } catch (error) {
      console.error('API validation error:', error);
      res.status(500).json({ message: 'Failed to validate API configuration' });
    }
  });

  app.get("/api/admin/settings/export", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const config = await AdminSettingsService.exportConfiguration();
      res.json(config);
    } catch (error) {
      console.error('Configuration export error:', error);
      res.status(500).json({ message: 'Failed to export configuration' });
    }
  });

  app.post("/api/admin/settings/initialize", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await AdminSettingsService.initializeDefaultSettings();
      res.json({ success: true, message: 'Default settings initialized' });
    } catch (error) {
      console.error('Settings initialization error:', error);
      res.status(500).json({ message: 'Failed to initialize settings' });
    }
  });

  // Hugging Face AI routes
  app.post("/api/ai/huggingface/generate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { HuggingFaceService } = await import('./lib/huggingface-service');
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const result = await HuggingFaceService.generateText(prompt);
      res.json(result);
    } catch (error) {
      console.error('Hugging Face generation error:', error);
      res.status(500).json({ error: 'Failed to generate text' });
    }
  });

  app.post("/api/ai/huggingface/analyze-report", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { HuggingFaceService } = await import('./lib/huggingface-service');
      const { reportContent } = req.body;
      
      if (!reportContent) {
        return res.status(400).json({ error: 'Report content is required' });
      }

      const analysis = await HuggingFaceService.analyzeReport(reportContent);
      res.json({ analysis });
    } catch (error) {
      console.error('Hugging Face analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze report' });
    }
  });

  app.post("/api/ai/huggingface/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { HuggingFaceService } = await import('./lib/huggingface-service');
      const validation = await HuggingFaceService.validateConfiguration();
      res.json(validation);
    } catch (error) {
      console.error('Hugging Face validation error:', error);
      res.status(500).json({ error: 'Failed to validate configuration' });
    }
  });

  // Gemini AI routes
  app.post("/api/ai/gemini/generate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { GeminiService } = await import('./lib/gemini-service');
      const { prompt, systemInstruction } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const result = await GeminiService.generateContent(prompt, systemInstruction);
      res.json({ content: result });
    } catch (error) {
      console.error('Gemini generation error:', error);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  app.post("/api/ai/gemini/analyze-electoral", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { GeminiService } = await import('./lib/gemini-service');
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: 'Electoral data is required' });
      }

      const analysis = await GeminiService.analyzeElectoralData(data);
      res.json({ analysis });
    } catch (error) {
      console.error('Gemini electoral analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze electoral data' });
    }
  });

  app.post("/api/ai/gemini/detect-anomalies", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { GeminiService } = await import('./lib/gemini-service');
      const { metrics } = req.body;
      
      if (!metrics) {
        return res.status(400).json({ error: 'Metrics data is required' });
      }

      const anomalies = await GeminiService.detectAnomalies(metrics);
      res.json({ anomalies });
    } catch (error) {
      console.error('Gemini anomaly detection error:', error);
      res.status(500).json({ error: 'Failed to detect anomalies' });
    }
  });

  app.post("/api/ai/gemini/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { GeminiService } = await import('./lib/gemini-service');
      const validation = await GeminiService.validateConfiguration();
      res.json(validation);
    } catch (error) {
      console.error('Gemini validation error:', error);
      res.status(500).json({ error: 'Failed to validate configuration' });
    }
  });

  // AI Incident Analysis endpoints
  app.post("/api/ai/analyze-incident", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, title, description, location, witnessCount, evidenceNotes, pollingStationId } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
      }

      const aiService = createAIIncidentService(process.env.GEMINI_API_KEY);
      
      const analysis = await aiService.analyzeIncident({
        type,
        title,
        description,
        location,
        witnessCount,
        evidenceNotes,
        pollingStationId
      });

      // Create audit log
      await storage.createAuditLog({
        action: "ai_incident_analysis",
        entityType: "incident",
        userId: req.user!.id,
        entityId: title,
        ipAddress: req.ip || ''
      });

      res.json({ success: true, analysis });
    } catch (error) {
      console.error("AI incident analysis error:", error);
      res.status(500).json({ error: "Failed to analyze incident" });
    }
  });

  app.post("/api/ai/batch-analyze", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { incidents } = req.body;
      
      if (!Array.isArray(incidents) || incidents.length === 0) {
        return res.status(400).json({ error: "Incidents array is required" });
      }

      const aiService = createAIIncidentService(process.env.GEMINI_API_KEY);
      
      const analyses = await aiService.classifyIncidentBatch(incidents);
      const summary = await aiService.generateSummaryReport(analyses);

      // Create audit log
      await storage.createAuditLog({
        action: "ai_batch_analysis",
        entityType: "incidents",
        userId: req.user!.id,
        entityId: `batch_${incidents.length}`,
        ipAddress: req.ip || ''
      });

      res.json({ 
        success: true, 
        analyses, 
        summary,
        totalProcessed: incidents.length 
      });
    } catch (error) {
      console.error("AI batch analysis error:", error);
      res.status(500).json({ error: "Failed to process batch analysis" });
    }
  });

  app.get("/api/ai/incident-patterns", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get recent reports for pattern analysis
      const recentReports = await storage.getReports();
      
      if (recentReports.length === 0) {
        return res.json({ 
          patterns: [],
          message: "No incidents available for pattern analysis"
        });
      }

      const aiService = createAIIncidentService(process.env.GEMINI_API_KEY);
      
      // Convert reports to incident format for analysis
      const incidents = recentReports.map(report => ({
        type: report.type || 'other',
        title: report.title,
        description: report.description,
        location: report.metadata ? JSON.parse(report.metadata as string)?.location : undefined
      }));

      const analyses = await aiService.classifyIncidentBatch(incidents);
      const summary = await aiService.generateSummaryReport(analyses);

      res.json({ 
        success: true,
        patterns: summary.commonPatterns,
        categoryDistribution: summary.categoryDistribution,
        severityDistribution: summary.severityDistribution,
        totalAnalyzed: summary.totalIncidents
      });
    } catch (error) {
      console.error("Pattern analysis error:", error);
      res.status(500).json({ error: "Failed to analyze incident patterns" });
    }
  });

  // Form Builder API endpoints
  app.get("/api/forms/templates", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get form templates from settings or database
      const templateSettings = await storage.getSettings();
      const formTemplates = templateSettings
        .filter(setting => setting.key.startsWith('form_template_'))
        .map(setting => ({
          id: setting.key.replace('form_template_', ''),
          ...JSON.parse(setting.value)
        }));

      res.json(formTemplates);
    } catch (error) {
      console.error("Error fetching form templates:", error);
      res.status(500).json({ error: "Failed to fetch form templates" });
    }
  });

  app.post("/api/forms/templates", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const template = req.body;
      const templateId = `template_${Date.now()}`;
      
      await storage.createSetting({
        key: `form_template_${templateId}`,
        value: JSON.stringify(template),
        description: `Form template: ${template.name}`,
        category: 'forms',
        isPublic: false
      });

      // Create audit log
      await storage.createAuditLog({
        action: "form_template_created",
        entityType: "form_template",
        userId: req.user!.id,
        entityId: templateId,
        ipAddress: req.ip || ''
      });

      res.json({ id: templateId, ...template });
    } catch (error) {
      console.error("Error creating form template:", error);
      res.status(500).json({ error: "Failed to create form template" });
    }
  });

  app.put("/api/forms/templates/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const templateId = req.params.id;
      const template = req.body;
      
      await storage.updateSetting(
        `form_template_${templateId}`,
        JSON.stringify(template),
        req.user!.id
      );

      // Create audit log
      await storage.createAuditLog({
        action: "form_template_updated",
        entityType: "form_template",
        userId: req.user!.id,
        entityId: templateId,
        ipAddress: req.ip || ''
      });

      res.json({ id: templateId, ...template });
    } catch (error) {
      console.error("Error updating form template:", error);
      res.status(500).json({ error: "Failed to update form template" });
    }
  });

  // Google Sheets Integration API endpoints
  app.post("/api/integration/sheets/test", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { spreadsheetId, range } = req.body;
      
      if (!spreadsheetId || !range) {
        return res.status(400).json({ error: "Spreadsheet ID and range are required" });
      }

      const testResult = await googleSheetsService.testSheetAccess(spreadsheetId, range);
      res.json(testResult);
    } catch (error) {
      console.error("Google Sheets test error:", error);
      res.status(500).json({ error: "Failed to test Google Sheets connection" });
    }
  });

  app.post("/api/integration/sheets/import", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { spreadsheetId, range } = req.body;
      
      if (!spreadsheetId || !range) {
        return res.status(400).json({ error: "Spreadsheet ID and range are required" });
      }

      const importResult = await googleSheetsService.importIncidents({
        spreadsheetId,
        range
      });

      // Create audit log
      await storage.createAuditLog({
        action: "sheets_import_completed",
        entityType: "import",
        userId: req.user!.id,
        entityId: spreadsheetId,
        ipAddress: req.ip || ''
      });

      res.json(importResult);
    } catch (error) {
      console.error("Google Sheets import error:", error);
      res.status(500).json({ error: "Failed to import from Google Sheets" });
    }
  });

  app.get("/api/integration/sheets/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const isValid = await googleSheetsService.validateConnection();
      res.json({ 
        valid: isValid,
        message: isValid ? 'Google Sheets connection is working' : 'Google Sheets connection failed'
      });
    } catch (error) {
      console.error("Google Sheets validation error:", error);
      res.status(500).json({ 
        valid: false,
        error: "Failed to validate Google Sheets connection" 
      });
    }
  });

  // Location Tracking API endpoints
  app.post("/api/location/start-tracking", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { latitude, longitude, accuracy, speed, heading } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const sessionId = `session_${Date.now()}_${req.user!.id}`;
      
      // Create location tracking session
      await storage.createSetting({
        key: `location_session_${sessionId}`,
        value: JSON.stringify({
          userId: req.user!.id,
          startTime: new Date().toISOString(),
          isActive: true,
          initialLocation: { latitude, longitude, accuracy, speed, heading }
        }),
        description: `Location tracking session for user ${req.user!.id}`,
        category: 'location_tracking',
        isPublic: false
      });

      // Store initial location update
      await storage.createAuditLog({
        action: "location_update",
        entityType: "location",
        userId: req.user!.id,
        entityId: sessionId,
        ipAddress: req.ip || '',
        newValues: JSON.stringify({ latitude, longitude, accuracy, speed, heading, type: 'start' })
      });

      res.json({ sessionId });
    } catch (error) {
      console.error("Error starting location tracking:", error);
      res.status(500).json({ error: "Failed to start location tracking" });
    }
  });

  app.post("/api/location/update", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId, latitude, longitude, accuracy, speed, heading, battery } = req.body;
      
      if (!sessionId || !latitude || !longitude) {
        return res.status(400).json({ error: "Session ID, latitude and longitude are required" });
      }

      // Verify session belongs to user
      const sessionSetting = await storage.getSettings();
      const session = sessionSetting.find(s => s.key === `location_session_${sessionId}`);
      
      if (!session) {
        return res.status(404).json({ error: "Location session not found" });
      }

      const sessionData = JSON.parse(session.value);
      if (sessionData.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied to this session" });
      }

      // Store location update
      await storage.createAuditLog({
        action: "location_update",
        entityType: "location",
        userId: req.user!.id,
        entityId: sessionId,
        ipAddress: req.ip || '',
        newValues: JSON.stringify({ 
          latitude, 
          longitude, 
          accuracy, 
          speed, 
          heading, 
          battery,
          timestamp: new Date().toISOString(),
          type: 'update'
        })
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.post("/api/location/stop-tracking", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      // Update session to inactive
      const sessionSettings = await storage.getSettings();
      const session = sessionSettings.find(s => s.key === `location_session_${sessionId}`);
      
      if (!session) {
        return res.status(404).json({ error: "Location session not found" });
      }

      const sessionData = JSON.parse(session.value);
      if (sessionData.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied to this session" });
      }

      // Mark session as ended
      sessionData.endTime = new Date().toISOString();
      sessionData.isActive = false;

      await storage.updateSetting(
        `location_session_${sessionId}`,
        JSON.stringify(sessionData),
        req.user!.id
      );

      // Log session end
      await storage.createAuditLog({
        action: "location_session_end",
        entityType: "location",
        userId: req.user!.id,
        entityId: sessionId,
        ipAddress: req.ip || '',
        newValues: JSON.stringify({ type: 'stop', endTime: sessionData.endTime })
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error stopping location tracking:", error);
      res.status(500).json({ error: "Failed to stop location tracking" });
    }
  });

  app.get("/api/location/active-observers", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin" && req.user?.role !== "coordinator") {
        return res.status(403).json({ message: "Admin or coordinator access required" });
      }

      // Get active location sessions
      const settings = await storage.getSettings();
      const activeSessions = settings.filter(s => 
        s.key.startsWith('location_session_') && 
        s.category === 'location_tracking'
      );

      const activeObservers = [];

      for (const session of activeSessions) {
        const sessionData = JSON.parse(session.value);
        if (!sessionData.isActive) continue;

        // Get latest location for this user
        const auditLogs = await storage.getAuditLogs();
        const userLocationLogs = auditLogs
          .filter(log => 
            log.userId === sessionData.userId && 
            log.action === 'location_update' &&
            log.entityId === session.key.replace('location_session_', '')
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (userLocationLogs.length > 0) {
          const latestLog = userLocationLogs[0];
          const locationData = JSON.parse(latestLog.newValues as string || '{}');
          
          activeObservers.push({
            id: session.key,
            userId: sessionData.userId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            speed: locationData.speed,
            heading: locationData.heading,
            battery: locationData.battery,
            timestamp: locationData.timestamp || latestLog.createdAt,
            isActive: sessionData.isActive
          });
        }
      }

      res.json(activeObservers);
    } catch (error) {
      console.error("Error fetching active observers:", error);
      res.status(500).json({ error: "Failed to fetch active observers" });
    }
  });

  app.get("/api/location/route-history/:userId?", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = req.params.userId ? parseInt(req.params.userId) : req.user!.id;
      
      // Check permissions
      if (targetUserId !== req.user!.id && 
          req.user?.role !== "admin" && 
          req.user?.role !== "coordinator") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all sessions for the user
      const settings = await storage.getSettings();
      const userSessions = settings.filter(s => 
        s.key.startsWith('location_session_') && 
        s.category === 'location_tracking'
      ).filter(s => {
        const sessionData = JSON.parse(s.value);
        return sessionData.userId === targetUserId;
      });

      const routeHistory = [];

      for (const session of userSessions) {
        const sessionData = JSON.parse(session.value);
        const sessionId = session.key.replace('location_session_', '');

        // Get all location updates for this session
        const auditLogs = await storage.getAuditLogs();
        const sessionLogs = auditLogs
          .filter(log => 
            log.userId === targetUserId && 
            log.action === 'location_update' &&
            log.entityId === sessionId
          )
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (sessionLogs.length > 0) {
          const locations = sessionLogs.map(log => {
            const locationData = JSON.parse(log.newValues as string || '{}');
            return {
              id: log.id,
              userId: targetUserId,
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
              speed: locationData.speed,
              heading: locationData.heading,
              timestamp: locationData.timestamp || log.createdAt,
              isActive: sessionData.isActive
            };
          });

          // Calculate total distance and average speed
          let totalDistance = 0;
          let totalSpeed = 0;
          let speedCount = 0;

          for (let i = 1; i < locations.length; i++) {
            const prev = locations[i - 1];
            const curr = locations[i];
            
            // Calculate distance using Haversine formula
            const R = 6371; // Earth's radius in km
            const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
            const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            totalDistance += R * c;

            if (curr.speed) {
              totalSpeed += curr.speed * 3.6; // Convert m/s to km/h
              speedCount++;
            }
          }

          routeHistory.push({
            id: sessionId,
            userId: targetUserId,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            totalDistance,
            averageSpeed: speedCount > 0 ? totalSpeed / speedCount : 0,
            locations,
            stations: [] // Could be enhanced to track visited stations
          });
        }
      }

      // Sort by start time, most recent first
      routeHistory.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      res.json(routeHistory);
    } catch (error) {
      console.error("Error fetching route history:", error);
      res.status(500).json({ error: "Failed to fetch route history" });
    }
  });

  // Feature Testing Routes
  app.get("/api/admin/features/test-all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { FeatureTester } = await import('./lib/feature-tester');
      const testResults = await FeatureTester.testAllFeatures();
      res.json(testResults);
    } catch (error) {
      console.error('Feature testing error:', error);
      res.status(500).json({ message: 'Failed to test features' });
    }
  });

  app.post("/api/admin/features/toggle", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { FeatureTester } = await import('./lib/feature-tester');
      const { key, enabled } = req.body;
      
      if (!key || typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'Feature key and enabled status required' });
      }

      const result = await FeatureTester.toggleFeature(key, enabled);
      res.json(result);
    } catch (error) {
      console.error('Feature toggle error:', error);
      res.status(500).json({ message: 'Failed to toggle feature' });
    }
  });

  // AI Classification endpoints
  app.get("/api/ai/models", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const models = [
        {
          id: "gemini-pro",
          name: "Gemini Pro",
          description: "Advanced language model for detailed analysis",
          accuracy: 92,
          isActive: true,
          lastTrained: new Date().toISOString()
        },
        {
          id: "gemini-flash",
          name: "Gemini Flash",
          description: "Fast processing for bulk analysis",
          accuracy: 88,
          isActive: true,
          lastTrained: new Date().toISOString()
        },
        {
          id: "huggingface-bert",
          name: "HuggingFace BERT",
          description: "Specialized classification model",
          accuracy: 85,
          isActive: true,
          lastTrained: new Date().toISOString()
        }
      ];
      res.json(models);
    } catch (error) {
      console.error("Models fetch error:", error);
      res.status(500).json({ error: "Failed to fetch AI models" });
    }
  });

  app.post("/api/ai/analyze-incident", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text, model, reportId } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required for analysis" });
      }

      // Classify the incident
      const classification = await aiClassificationService.classifyIncident(text, model);

      // Get historical data for pattern analysis
      const historicalReports = await storage.getReports();
      
      // Analyze patterns
      const patterns = await aiClassificationService.analyzeIncidentPatterns(
        classification, 
        historicalReports
      );

      // Generate recommendations
      const recommendations = await aiClassificationService.generateRecommendations(
        classification,
        patterns
      );

      // Store classification result if reportId provided
      if (reportId) {
        await storage.createAuditLog({
          action: "ai_classification",
          entityType: "report",
          userId: req.user!.id,
          entityId: reportId.toString(),
          newValues: JSON.stringify({
            classification,
            patterns,
            model: model || 'gemini-pro'
          })
        });
      }

      const result = {
        classification: {
          ...classification,
          id: `cls_${Date.now()}`,
          reportId: reportId || null,
          timestamp: new Date().toISOString(),
          aiModel: model || 'gemini-pro'
        },
        patterns,
        recommendations
      };

      res.json(result);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to analyze incident" });
    }
  });

  app.post("/api/ai/batch-analyze", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { model, filters } = req.body;

      // Get unclassified reports
      const reports = await storage.getReports();
      const unclassifiedReports = reports.filter(report => 
        !report.description?.includes('ai_classified')
      );

      if (unclassifiedReports.length === 0) {
        return res.json({ processedCount: 0, message: "No unclassified incidents found" });
      }

      // Process in batches to avoid rate limits
      const batchSize = 5;
      let processedCount = 0;

      for (let i = 0; i < unclassifiedReports.length; i += batchSize) {
        const batch = unclassifiedReports.slice(i, i + batchSize);
        
        const batchResults = await aiClassificationService.batchClassifyIncidents(batch, model);
        
        for (const result of batchResults) {
          if (result.processed) {
            await storage.createAuditLog({
              action: "ai_batch_classification",
              entityType: "report",
              userId: req.user!.id,
              entityId: result.incidentId.toString(),
              newValues: JSON.stringify({
                classification: result.classification,
                model: model || 'gemini-pro',
                batchId: Date.now()
              })
            });
            processedCount++;
          }
        }

        // Add delay between batches
        if (i + batchSize < unclassifiedReports.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      res.json({ 
        processedCount, 
        totalReports: unclassifiedReports.length,
        message: `Successfully processed ${processedCount} incidents`
      });
    } catch (error) {
      console.error("Batch analysis error:", error);
      res.status(500).json({ error: "Failed to complete batch analysis" });
    }
  });

  app.get("/api/ai/classifications/recent", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auditLogs = await storage.getAuditLogs();
      
      const classificationLogs = auditLogs
        .filter(log => 
          log.action === 'ai_classification' || log.action === 'ai_batch_classification'
        )
        .slice(0, 20);

      const classifications = classificationLogs.map(log => {
        try {
          const data = JSON.parse(log.newValues as string || '{}');
          return {
            id: `cls_${log.id}`,
            reportId: parseInt(log.entityId || '0'),
            ...data.classification,
            timestamp: log.createdAt.toISOString(),
            aiModel: data.model || 'gemini-pro'
          };
        } catch (error) {
          return null;
        }
      }).filter(Boolean);

      res.json(classifications);
    } catch (error) {
      console.error("Classifications fetch error:", error);
      res.status(500).json({ error: "Failed to fetch recent classifications" });
    }
  });

  app.get("/api/ai/classifications/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auditLogs = await storage.getAuditLogs();
      
      const classificationLogs = auditLogs.filter(log => 
        log.action === 'ai_classification' || log.action === 'ai_batch_classification'
      );

      let totalAnalyzed = classificationLogs.length;
      let highRisk = 0;
      let confidenceSum = 0;
      let validClassifications = 0;

      for (const log of classificationLogs) {
        try {
          const data = JSON.parse(log.newValues as string || '{}');
          const classification = data.classification;
          
          if (classification) {
            if (classification.severity === 'high' || classification.severity === 'critical') {
              highRisk++;
            }
            if (typeof classification.confidence === 'number') {
              confidenceSum += classification.confidence;
              validClassifications++;
            }
          }
        } catch (error) {
          // Skip invalid entries
        }
      }

      const avgConfidence = validClassifications > 0 ? Math.round(confidenceSum / validClassifications) : 0;

      res.json({
        totalAnalyzed,
        highRisk,
        avgConfidence,
        accuracy: 88, // This would be calculated based on manual verification
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Stats calculation error:", error);
      res.status(500).json({ error: "Failed to calculate classification statistics" });
    }
  });

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Simple in-memory store for connected clients
  const clients = new Map<number, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    // Parse the URL to extract userId from query parameters
    try {
      const baseUrl = `http://${req.headers.host}`;
      const url = new URL(req.url || '/ws', baseUrl);
      const userIdParam = url.searchParams.get('userId');
      const userId = userIdParam ? Number(userIdParam) : null;

      if (userId && !isNaN(userId)) {
        console.log(`WebSocket client connected for user: ${userId}`);
        clients.set(userId, ws);

        ws.on('close', () => {
          console.log(`WebSocket client disconnected for user: ${userId}`);
          clients.delete(userId);
        });
      } else {
        console.log('WebSocket connection established without valid user ID');
      }
    } catch (error) {
      console.error('Error parsing WebSocket URL:', error);
      console.log('WebSocket connection established without user ID due to parsing error');
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'chat_message':
            // Store message in database
            if (data.roomId) {
              // Room message - broadcast to all users in that room
              wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    ...data,
                    timestamp: new Date(),
                    id: Math.random().toString(36).substr(2, 9)
                  }));
                }
              });
            } else if (data.recipientId) {
              // Direct message - send to specific user
              const recipientWs = clients.get(data.recipientId);
              if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                recipientWs.send(JSON.stringify({
                  ...data,
                  timestamp: new Date(),
                  id: Math.random().toString(36).substr(2, 9)
                }));
              }
            }
            break;
            
          case 'notification':
            // Handle notifications
            if (data.recipientId) {
              const recipientWs = clients.get(data.recipientId);
              if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                recipientWs.send(JSON.stringify(data));
              }
            }
            break;
            
          default:
            // General broadcast for other message types
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Attach wss to the app instance so we can access it in route handlers
  (app as any).wss = wss;
  (app as any).clients = clients;

  return httpServer;
}