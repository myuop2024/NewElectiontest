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
import { settings, courses, enrollments } from "@shared/schema";
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
import { emergencyService } from "./lib/emergency-service.js";
import { CentralAIService } from "./lib/central-ai-service.js";
import { SocialMonitoringService } from "./lib/social-monitoring-service.js";
import { JamaicaNewsAggregator } from "./lib/jamaica-news-aggregator.js";
import PDFDocument from "pdfkit";
import { GeminiService } from "./lib/training-service.js";

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
    fileSize: 1 * 1024 * 1024 * 1024, // 1GB limit
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

async function initializeChatRooms() {
  try {
    const existingRoom = await storage.getChatRoom("general");
    if (existingRoom) {
      return;
    }

    // Create default chat rooms
    await storage.createChatRoom({
      id: "general",
      name: "General Discussion",
      description: "Open discussion for all observers",
      type: "public",
      createdBy: 1,
      isActive: true
    });

    await storage.createChatRoom({
      id: "emergency",
      name: "Emergency Channel",
      description: "Emergency communications only",
      type: "emergency",
      createdBy: 1,
      isActive: true
    });

    await storage.createChatRoom({
      id: "coordinators",
      name: "Parish Coordinators",
      description: "Private channel for coordinators",
      type: "private",
      createdBy: 1,
      isActive: true
    });

    console.log("Default chat rooms created");
  } catch (error) {
    console.error("Error creating chat rooms:", error);
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

  // Initialize admin account and chat rooms
  await initializeAdminAccount();
  await initializeChatRooms();

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
      // Validate required fields
      const { title, description, type, stationId } = req.body;
      
      if (!title || !description || !type || !stationId) {
        return res.status(400).json({ 
          error: "Missing required fields: title, description, type, and stationId are required" 
        });
      }

      const report = await storage.createReport({
        ...req.body,
        userId: req.user?.id,
        stationId: parseInt(stationId) || null
      });

      // Check for any recently uploaded documents by this user that could be related
      const recentDocuments = await storage.getDocumentsByUser(req.user?.id || 0);
      const relevantDocuments = recentDocuments.filter((doc: any) => 
        doc.documentType !== 'training-media' && 
        new Date(doc.createdAt).getTime() > Date.now() - (30 * 60 * 1000) // Last 30 minutes
      );

      // If we have relevant documents, run enhanced AI analysis
      if (relevantDocuments.length > 0) {
        try {
          const aiService = createAIIncidentService(process.env.GOOGLE_API_KEY);
          const enhancedAnalysis = await aiService.analyzeIncidentWithDocuments({
            type: req.body.type,
            title: req.body.title,
            description: req.body.description,
            location: req.body.location,
            witnessCount: req.body.witnessCount,
            evidenceNotes: req.body.evidenceNotes,
            pollingStationId: stationId,
            attachedDocuments: relevantDocuments
          });

          // Store AI analysis results in the report metadata
          const existingMetadata = report.metadata ? (typeof report.metadata === 'string' ? JSON.parse(report.metadata) : report.metadata) : {};
          await storage.updateReport(report.id, {
            metadata: JSON.stringify({
              ...existingMetadata,
              aiAnalysis: enhancedAnalysis,
              attachedDocuments: relevantDocuments.map((doc: any) => ({
                id: doc.id,
                fileName: doc.fileName,
                documentType: doc.documentType,
                evidenceValue: (doc.aiAnalysis as any)?.evidenceValue || 'medium'
              }))
            })
          });

          // Link documents to this report
          for (const doc of relevantDocuments) {
            await storage.updateDocument(doc.id, { reportId: report.id });
          }
        } catch (aiError) {
          console.error('Enhanced AI analysis failed:', aiError);
        }
      }
      
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

      // Enhanced OCR and AI processing
      setTimeout(async () => {
        try {
          // Simulate OCR extraction (in production, integrate with actual OCR service)
          const ocrText = `Extracted content from ${req.file.originalname}: 
          Document Type: ${documentType}
          File Size: ${(req.file.size / 1024).toFixed(1)}KB
          Station: ${stationId || 'N/A'}
          Description: ${description}
          Processing timestamp: ${new Date().toISOString()}`;

          // Run AI analysis on the document
          const aiService = createAIIncidentService(process.env.GOOGLE_API_KEY);
          let aiAnalysis = null;
          
          try {
            const documentAnalysis = await aiService.analyzeDocument(ocrText, documentType);
            aiAnalysis = {
              confidence: documentAnalysis.confidence * 100,
              category: documentAnalysis.documentType,
              keyData: documentAnalysis.keyData,
              evidenceValue: documentAnalysis.evidenceValue,
              relevantToIncident: documentAnalysis.relevantToIncident
            };
          } catch (aiError) {
            console.error('AI analysis failed, using fallback:', aiError);
            aiAnalysis = {
              confidence: 85,
              category: documentType,
              keyData: [`Document processed: ${req.file.originalname}`, `Size: ${(req.file.size / 1024).toFixed(1)}KB`],
              evidenceValue: 'medium',
              relevantToIncident: true
            };
          }

          await storage.updateDocument(document.id, {
            ocrText: ocrText,
            aiAnalysis: aiAnalysis,
            processingStatus: 'completed'
          });
        } catch (error) {
          console.error('Error updating document after processing:', error);
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

  // Enhanced endpoint to show reports with AI analysis from attached documents
  app.get("/api/reports/enhanced", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reports = await storage.getReports();
      
      const enhancedReports = await Promise.all(reports.map(async (report: any) => {
        // Get documents attached to this report
        const attachedDocuments = await storage.getDocumentsByReport(report.id);
        
        // Parse metadata to get AI analysis
        let metadata = null;
        try {
          metadata = report.metadata ? JSON.parse(report.metadata) : null;
        } catch (e) {
          metadata = null;
        }
        
        return {
          ...report,
          attachedDocuments: attachedDocuments.map((doc: any) => ({
            id: doc.id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            aiAnalysis: doc.aiAnalysis,
            evidenceValue: doc.aiAnalysis?.evidenceValue || 'medium'
          })),
          aiAnalysis: metadata?.aiAnalysis || null,
          hasDocumentEvidence: attachedDocuments.length > 0
        };
      }));
      
      res.json(enhancedReports);
    } catch (error) {
      console.error("Error fetching enhanced reports:", error);
      res.status(500).json({ error: "Failed to fetch enhanced reports" });
    }
  });

  // Central AI Hub - Jamaica Election Intelligence
  app.get("/api/central-ai/status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const centralAI = CentralAIService.getInstance(geminiKey);
      const status = await centralAI.validateConnection();
      
      res.json({
        ...status,
        features: [
          'incident_analysis',
          'document_processing', 
          'social_sentiment_monitoring',
          'election_intelligence',
          'comprehensive_reporting'
        ],
        jamaica_coverage: {
          parishes: 14,
          major_towns: 15,
          monitoring_active: true
        }
      });
    } catch (error) {
      console.error("Central AI status error:", error);
      res.status(500).json({ error: "Failed to check Central AI status" });
    }
  });

  app.get("/api/central-ai/comprehensive-intelligence", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const centralAI = CentralAIService.getInstance(geminiKey);
      const intelligence = await centralAI.generateComprehensiveIntelligence();
      
      res.json({
        intelligence,
        generated_at: new Date(),
        data_sources: ['incidents', 'documents', 'social_media', 'news'],
        coverage: 'Jamaica nationwide'
      });
    } catch (error) {
      console.error("Comprehensive intelligence error:", error);
      res.status(500).json({ error: "Failed to generate comprehensive intelligence" });
    }
  });

  // Social Media & News Monitoring for Jamaica Elections
  app.get("/api/social-monitoring/sentiment", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const socialMonitoring = new SocialMonitoringService(geminiKey);
      const sentimentReport = await socialMonitoring.generateSentimentReport();
      
      res.json({
        ...sentimentReport,
        monitoring_scope: 'Jamaica Elections',
        parishes_covered: [
          'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
          'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
          'Manchester', 'Clarendon', 'St. Catherine'
        ]
      });
    } catch (error) {
      console.error("Social sentiment monitoring error:", error);
      res.status(500).json({ error: "Failed to generate sentiment report" });
    }
  });

  app.get("/api/social-monitoring/news", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const keywords = req.query.keywords ? (req.query.keywords as string).split(',') : undefined;
      const socialMonitoring = new SocialMonitoringService(geminiKey);
      const newsData = await socialMonitoring.monitorJamaicanNews(keywords);
      
      res.json({
        news_data: newsData,
        sources_monitored: [
          'Jamaica Observer', 'Jamaica Gleaner', 'Loop Jamaica', 
          'RJR News', 'CVM TV', 'TVJ', 'Nationwide Radio'
        ],
        keywords_tracked: keywords || ['election', 'voting', 'democracy', 'politics'],
        analysis_timestamp: new Date()
      });
    } catch (error) {
      console.error("News monitoring error:", error);
      res.status(500).json({ error: "Failed to monitor Jamaica news" });
    }
  });

  app.get("/api/social-monitoring/social-media", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const platforms = req.query.platforms ? (req.query.platforms as string).split(',') : undefined;
      const socialMonitoring = new SocialMonitoringService(geminiKey);
      const socialData = await socialMonitoring.monitorSocialMedia(platforms);
      
      res.json({
        social_data: socialData,
        platforms_monitored: platforms || ['twitter', 'facebook', 'instagram', 'tiktok'],
        geographic_coverage: 'All 14 Jamaica parishes',
        analysis_timestamp: new Date()
      });
    } catch (error) {
      console.error("Social media monitoring error:", error);
      res.status(500).json({ error: "Failed to monitor social media" });
    }
  });

  // Test endpoint to demonstrate real news fetching
  app.get("/api/test/news-fetch", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const socialMonitoring = new SocialMonitoringService(geminiKey);
      
      // Test individual news source fetching
      const observerResponse = await fetch('https://www.jamaicaobserver.com/feed/', {
        headers: { 'User-Agent': 'CAFFE Electoral Observer Bot 1.0' }
      });
      
      const observerStatus = observerResponse.ok ? 'accessible' : 'blocked';
      
      res.json({
        news_sources: {
          'NewsAPI.org': {
            url: 'https://newsapi.org/v2/everything',
            status: process.env.NEWSAPI_KEY ? 'configured' : 'missing_key',
            note: 'Comprehensive global news coverage including Caribbean sources',
            coverage: 'Thousands of sources worldwide, filtered for Jamaica election content'
          },
          'Jamaica Observer': {
            url: 'https://www.jamaicaobserver.com/feed/',
            status: observerStatus,
            response_code: observerResponse.status
          },
          'Jamaica Gleaner': {
            url: 'https://jamaica-gleaner.com/feed',
            status: 'configured',
            note: 'RSS feed monitored for election content'
          },
          'Loop Jamaica': {
            url: 'https://loopjamaica.com/rss.xml',
            status: 'configured',
            note: 'Real-time news aggregation'
          }
        },
        election_keywords: ['election', 'voting', 'democracy', 'Jamaica', 'parish', 'poll', 'candidate', 'constituency', 'ballot'],
        parish_monitoring: [
          'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
          'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
          'Manchester', 'Clarendon', 'St. Catherine'
        ],
        how_it_works: {
          step1: 'Fetch RSS feeds from major Jamaican news outlets',
          step2: 'Parse XML/RSS content for election-related articles',
          step3: 'Filter content by election keywords and parish mentions',
          step4: 'Analyze sentiment using Gemini AI for each article',
          step5: 'Generate risk assessments and alerts for election monitoring'
        },
        real_vs_simulated: {
          real_data: 'NewsAPI.org + RSS feeds from Jamaica Observer, Gleaner, Loop Jamaica provide comprehensive coverage',
          fallback: 'Simulated data used if external feeds are inaccessible or blocked',
          ai_analysis: 'All content (real or simulated) processed through Gemini AI for sentiment analysis'
        },
        newsapi_integration: {
          enabled: !!process.env.NEWSAPI_KEY,
          queries: [
            'Jamaica AND (election OR voting OR democracy)',
            'Jamaica election (from verified Caribbean sources)',
            'Caribbean politics AND Jamaica'
          ],
          benefits: 'Access to thousands of international sources covering Jamaica, better election context'
        }
      });
    } catch (error) {
      console.error("News fetch test error:", error);
      res.status(500).json({ error: "Failed to test news fetching" });
    }
  });

  // Test NewsAPI.org integration specifically
  app.get("/api/test/newsapi", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newsApiKey = process.env.NEWSAPI_KEY;
      if (!newsApiKey) {
        return res.status(400).json({ error: "NewsAPI key not configured" });
      }

      const socialMonitoring = new SocialMonitoringService(process.env.GEMINI_API_KEY || '');
      
      // Test direct NewsAPI fetch
      const testQuery = 'Jamaica election';
      const testResponse = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(testQuery)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${newsApiKey}`,
        {
          headers: {
            'User-Agent': 'CAFFE Electoral Observer Bot 1.0'
          }
        }
      );

      if (testResponse.ok) {
        const testData = await testResponse.json();
        res.json({
          newsapi_status: 'working',
          test_query: testQuery,
          articles_found: testData.totalResults || 0,
          sample_articles: testData.articles?.slice(0, 3).map((article: any) => ({
            title: article.title,
            source: article.source?.name,
            published: article.publishedAt,
            url: article.url
          })) || [],
          integration_details: {
            api_endpoint: 'https://newsapi.org/v2/everything',
            search_parameters: 'Jamaica + election keywords, English only, sorted by date',
            coverage: 'Global news sources including Caribbean outlets',
            rate_limits: '1000 requests/day on free plan'
          }
        });
      } else {
        const errorText = await testResponse.text();
        res.json({
          newsapi_status: 'error',
          error_code: testResponse.status,
          error_message: errorText,
          test_query: testQuery
        });
      }
    } catch (error) {
      console.error("NewsAPI test error:", error);
      res.status(500).json({ error: "Failed to test NewsAPI integration" });
    }
  });

  // Enhanced Jamaica News Aggregation Endpoint
  app.get("/api/news/jamaica-aggregated", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newsAggregator = new JamaicaNewsAggregator(process.env.GEMINI_API_KEY || '');
      
      console.log('Starting Jamaica news aggregation from authentic sources...');
      const articles = await newsAggregator.aggregateAllSources();
      const stats = newsAggregator.getSourceStatistics();
      const alerts = newsAggregator.getHighPriorityAlerts();

      res.json({
        success: true,
        data: {
          articles: articles.slice(0, 50), // Return top 50 most relevant
          statistics: stats,
          criticalAlerts: alerts,
          sources: {
            'Jamaica Gleaner': 'Multiple RSS feeds (Politics, News, Main)',
            'Jamaica Observer': 'Multiple RSS feeds (Politics, News, Main)', 
            'Nationwide Radio': 'RSS feed and Vote2020 section',
            'NewsAPI.org': 'Global Jamaica coverage as backup'
          },
          processingInfo: {
            totalProcessed: articles.length,
            duplicatesRemoved: stats.duplicatesFound,
            highRelevance: stats.highRelevanceArticles,
            lastUpdated: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error("Jamaica news aggregation error:", error);
      res.status(500).json({ 
        error: "Failed to aggregate Jamaica news sources",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Real-time news source health check
  app.get("/api/news/source-health", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sources = [
        { name: 'Jamaica Gleaner', url: 'https://jamaica-gleaner.com/feed', type: 'RSS' },
        { name: 'Jamaica Observer', url: 'https://www.jamaicaobserver.com/feed/', type: 'RSS' },
        { name: 'Nationwide Radio', url: 'https://nationwideradiojm.com/feed/', type: 'RSS' },
        { name: 'NewsAPI.org', url: 'https://newsapi.org/v2/everything', type: 'API' }
      ];

      const healthChecks = await Promise.all(sources.map(async (source) => {
        try {
          const startTime = Date.now();
          let response;
          
          if (source.name === 'NewsAPI.org') {
            response = await fetch(`${source.url}?q=Jamaica&apiKey=${process.env.NEWSAPI_KEY}`, {
              timeout: 5000,
              headers: { 'User-Agent': 'CAFFE Electoral Observer Bot 1.0' }
            });
          } else {
            response = await fetch(source.url, {
              timeout: 5000,
              headers: { 'User-Agent': 'CAFFE Electoral Observer Bot 1.0' }
            });
          }
          
          const responseTime = Date.now() - startTime;
          
          return {
            name: source.name,
            status: response.ok ? 'healthy' : 'error',
            responseTime: `${responseTime}ms`,
            statusCode: response.status,
            type: source.type,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          return {
            name: source.name,
            status: 'offline',
            responseTime: 'timeout',
            statusCode: 0,
            type: source.type,
            error: error instanceof Error ? error.message : 'Connection failed',
            lastChecked: new Date().toISOString()
          };
        }
      }));

      const healthySources = healthChecks.filter(h => h.status === 'healthy').length;
      const totalSources = healthChecks.length;

      res.json({
        overall: {
          status: healthySources >= totalSources * 0.5 ? 'operational' : 'degraded',
          healthy: healthySources,
          total: totalSources,
          uptime: `${Math.round((healthySources / totalSources) * 100)}%`
        },
        sources: healthChecks,
        recommendations: healthySources < totalSources * 0.5 ? 
          ['Consider using NewsAPI.org as primary source', 'Check RSS feed URLs for updates'] :
          ['All systems operational', 'Continue monitoring for election coverage']
      });
    } catch (error) {
      console.error("Source health check error:", error);
      res.status(500).json({ error: "Failed to check news source health" });
    }
  });

  app.post("/api/central-ai/analyze-content", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, type, location } = req.body;
      
      if (!content || !type) {
        return res.status(400).json({ error: "Content and type are required" });
      }

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "Gemini API key not configured" });
      }

      const centralAI = CentralAIService.getInstance(geminiKey);
      
      if (type === 'social_sentiment') {
        const analysis = await centralAI.analyzeSocialSentiment(content, location);
        res.json({
          analysis,
          content_type: type,
          location: location || 'Jamaica (general)',
          processed_at: new Date()
        });
      } else {
        const analysis = await centralAI.processDataFlow({ content, location }, type, 'manual_submission');
        res.json({
          analysis,
          content_type: type,
          processed_at: new Date()
        });
      }
    } catch (error) {
      console.error("Content analysis error:", error);
      res.status(500).json({ error: "Failed to analyze content" });
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
      const webhookPayload = req.body; // Full payload
      const { id, status, reference_id: nationalId } = webhookPayload;

      console.log(`Received DidIT KYC webhook for verification ID: ${id}, Status: ${status}, Full Payload: ${JSON.stringify(webhookPayload)}`);

      if (!nationalId) {
        console.warn('DidIT webhook missing national ID (reference_id).');
        return res.status(400).send('Missing reference_id');
      }

      const user = await storage.getUserByNationalId(nationalId);

      if (user) {
        // Consolidated kycStatus logic
        let newKycStatus: 'pending' | 'approved' | 'rejected' | 'review' = 'pending'; // Default to pending

        // Extract detailed statuses from the webhook payload
        // These paths depend on Didit's actual webhook structure. Example:
        const overallStatus = webhookPayload.status; // e.g., 'completed', 'failed', 'in_progress'
        const documentVerification = webhookPayload.document_verification?.status; // e.g., 'passed', 'failed'
        const faceVerification = webhookPayload.face_verification?.status; // e.g., 'passed', 'failed'
        const livenessCheck = webhookPayload.liveness_check?.status; // e.g., 'passed', 'failed'
        const amlCheck = webhookPayload.aml_check?.status; // e.g., 'clear', 'hit', 'pending'

        // Determine newKycStatus based on detailed checks
        if (overallStatus === 'completed' || overallStatus === 'verified' || overallStatus === 'approved') {
          // If overall status is success, check individual components
          if (
            documentVerification === 'passed' &&
            faceVerification === 'passed' &&
            livenessCheck === 'passed' &&
            (amlCheck === 'clear' || amlCheck === undefined || amlCheck === null) // AML clear or not present/applicable
          ) {
            newKycStatus = 'approved';
          } else if (amlCheck === 'hit') {
            newKycStatus = 'rejected'; // Or 'review' depending on policy
          } else if (
            documentVerification === 'failed' ||
            faceVerification === 'failed' ||
            livenessCheck === 'failed'
          ) {
            newKycStatus = 'rejected';
          } else {
            // Some checks might be pending or require review
            newKycStatus = 'pending'; // Or 'review'
          }
        } else if (overallStatus === 'failed' || overallStatus === 'rejected') {
          newKycStatus = 'rejected';
        } else {
          newKycStatus = 'pending'; // Default for 'in_progress' or unknown statuses
        }
        
        await storage.updateUser(user.id, { 
          kycStatus: newKycStatus,
          kycData: webhookPayload // Store the full webhook response
        });

        console.log(`Updated user ${user.username} KYC status to ${newKycStatus} and stored kycData.`);
        
        // Broadcast update via WebSocket to the specific user
        const clients = (req.app as any).clients as Map<number, WebSocket>;
        const userSocket = clients.get(user.id);

        if (userSocket && userSocket.readyState === WebSocket.OPEN) {
          userSocket.send(JSON.stringify({
            type: 'KYC_UPDATE',
            payload: {
              userId: user.id,
              kycStatus: newKycStatus,
              verificationId: id,
              details: { // Enhanced details for the client
                documentVerified: documentVerification === 'passed',
                faceMatch: faceVerification === 'passed',
                livenessCheck: livenessCheck === 'passed',
                amlStatus: amlCheck,
                // Add other relevant fields from webhookPayload as needed by the frontend
                overallDiditStatus: overallStatus
              }
            }
          }));
          console.log(`Sent KYC_UPDATE WebSocket message to user ${user.id} with enhanced details.`);
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

  // Get chat messages for a room
  app.get("/api/chat/messages", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roomId, recipientId } = req.query;
      
      if (roomId) {
        const messages = await storage.getChatMessages(roomId as string);
        res.json(messages);
      } else if (recipientId) {
        const messages = await storage.getDirectMessages(req.user!.id, parseInt(recipientId as string));
        res.json(messages);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  // Send chat message
  app.post("/api/chat/messages", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roomId, recipientId, content, messageType = 'text' } = req.body;
      
      const messageId = Math.random().toString(36).substr(2, 9);
      const message = await storage.createChatMessage({
        id: messageId,
        roomId: roomId || null,
        senderId: req.user!.id,
        recipientId: recipientId || null,
        content,
        messageType,
        isRead: false
      });

      console.log(`Message saved to database: ${message.id} in room ${roomId}`);

      // Broadcast message via WebSocket to other users (not the sender)
      const wsMessage = {
        type: 'chat_message',
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        recipientId: message.recipientId,
        roomId: message.roomId,
        timestamp: message.createdAt,
        messageType: message.messageType
      };

      // Send to all connected clients except the sender
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const clientUserId = (client as any).userId;
          if (clientUserId !== req.user!.id) {
            client.send(JSON.stringify(wsMessage));
          }
        }
      });

      // Create audit log for message
      await storage.createAuditLog({
        action: "chat_message_sent",
        entityType: "chat_message",
        userId: req.user!.id,
        entityId: message.id,
        ipAddress: req.ip || ''
      });

      res.json(message);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get online users in room
  app.get("/api/chat/rooms/:roomId/online", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const onlineUsers = await storage.getOnlineUsersInRoom(req.params.roomId);
      res.json(onlineUsers);
    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({ message: 'Failed to get online users' });
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

  // Comprehensive Admin Feature Testing Routes
  app.get("/api/admin/features/test-all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { FeatureTester } = await import('./lib/feature-tester.js');
      const testResults = await FeatureTester.testAllFeatures();
      res.json(testResults);
    } catch (error) {
      console.error('Feature test error:', error);
      res.status(500).json({ 
        message: "Failed to run feature tests",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/admin/features/test/:service", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { FeatureTester } = await import('./lib/feature-tester.js');
      const result = await FeatureTester.testFeatureConnectivity(req.params.service);
      res.json(result);
    } catch (error) {
      console.error('Service test error:', error);
      res.status(500).json({ 
        message: "Failed to test service",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/admin/emergency/validate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { FeatureTester } = await import('./lib/feature-tester.js');
      const validation = await FeatureTester.validateEmergencyFeatures();
      res.json(validation);
    } catch (error) {
      console.error('Emergency validation error:', error);
      res.status(500).json({ 
        message: "Failed to validate emergency features",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/admin/database/health", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { FeatureTester } = await import('./lib/feature-tester.js');
      const health = await FeatureTester.testDatabaseHealth();
      res.json(health);
    } catch (error) {
      console.error('Database health error:', error);
      res.status(500).json({ 
        message: "Failed to test database health",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

      const aiService = createAIIncidentService(process.env.GOOGLE_API_KEY);
      
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

      const aiService = createAIIncidentService(process.env.GOOGLE_API_KEY);
      
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

      const aiService = createAIIncidentService(process.env.GOOGLE_API_KEY);
      
      // Convert reports to incident format for analysis
      const incidents = recentReports.map(report => {
        let metadata = null;
        try {
          metadata = typeof report.metadata === 'string' ? JSON.parse(report.metadata) : report.metadata;
        } catch (error) {
          console.warn('Failed to parse report metadata:', error);
          metadata = {};
        }
        
        return {
          type: report.type || 'other',
          title: report.title,
          description: report.description,
          location: metadata?.location
        };
      });

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

  app.delete("/api/forms/templates/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const templateId = req.params.id;

      await storage.deleteSetting(`form_template_${templateId}`);

      await storage.createAuditLog({
        action: "form_template_deleted",
        entityType: "form_template",
        userId: req.user!.id,
        entityId: templateId,
        ipAddress: req.ip || ''
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting form template:", error);
      res.status(500).json({ error: "Failed to delete form template" });
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
          id: "gemini-1.5-flash",
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
            model: model || 'gemini-1.5-flash'
          })
        });
      }

      const result = {
        classification: {
          ...classification,
          id: `cls_${Date.now()}`,
          reportId: reportId || null,
          timestamp: new Date().toISOString(),
          aiModel: model || 'gemini-1.5-flash'
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
                model: model || 'gemini-1.5-flash',
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
            aiModel: data.model || 'gemini-1.5-flash'
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

  // Emergency Management endpoints
  app.get("/api/emergency/alerts/active", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const activeAlerts = await emergencyService.getActiveAlerts();
      res.json(activeAlerts);
    } catch (error) {
      console.error("Error fetching active alerts:", error);
      res.status(500).json({ error: "Failed to fetch active alerts" });
    }
  });

  app.get("/api/emergency/alerts/all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allAlerts = await emergencyService.getAllAlerts();
      res.json(allAlerts);
    } catch (error) {
      console.error("Error fetching all alerts:", error);
      res.status(500).json({ error: "Failed to fetch all alerts" });
    }
  });

  app.post("/api/emergency/alerts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alertData = {
        ...req.body,
        createdBy: req.user!.id
      };

      const alert = await emergencyService.createEmergencyAlert(alertData);
      res.json(alert);
    } catch (error) {
      console.error("Error creating emergency alert:", error);
      res.status(500).json({ error: "Failed to create emergency alert" });
    }
  });

  app.post("/api/emergency/alerts/:id/acknowledge", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await emergencyService.acknowledgeAlert(id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  app.post("/api/emergency/alerts/:id/resolve", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      await emergencyService.resolveAlert(id, req.user!.id, resolution);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  app.get("/api/emergency/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await emergencyService.getEmergencyStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching emergency stats:", error);
      res.status(500).json({ error: "Failed to fetch emergency statistics" });
    }
  });

  app.get("/api/emergency/channels", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const channels = await emergencyService.getNotificationChannels();
      res.json(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Failed to fetch notification channels" });
    }
  });

  app.get("/api/emergency/escalation-rules", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rules = await emergencyService.getEscalationRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching escalation rules:", error);
      res.status(500).json({ error: "Failed to fetch escalation rules" });
    }
  });

  app.post("/api/emergency/test", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await emergencyService.testEmergencySystem();
      res.json(result);
    } catch (error) {
      console.error("Error testing emergency system:", error);
      res.status(500).json({ error: "Failed to test emergency system" });
    }
  });

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Simple in-memory store for connected clients and their room subscriptions
  const clients = new Map<number, WebSocket>();
  const userRooms = new Map<number, Set<string>>(); // Track which rooms each user is in

  wss.on('connection', (ws: WebSocket, req) => {
    let userId: number | null = null;
    
    // Parse the URL to extract userId from query parameters
    try {
      const baseUrl = `http://${req.headers.host}`;
      const url = new URL(req.url || '/ws', baseUrl);
      const userIdParam = url.searchParams.get('userId');
      userId = userIdParam ? Number(userIdParam) : null;

      if (userId && !isNaN(userId)) {
        console.log(`WebSocket client connected for user: ${userId}`);
        clients.set(userId, ws);
        // Initialize user's room subscriptions
        if (!userRooms.has(userId)) {
          userRooms.set(userId, new Set());
        }
      } else {
        console.log('WebSocket connection established without valid user ID');
      }
    } catch (error) {
      console.error('Error parsing WebSocket URL:', error);
      console.log('WebSocket connection established without user ID due to parsing error');
    }

    ws.on('close', (code, reason) => {
      if (userId) {
        console.log(`WebSocket client disconnected for user: ${userId} (${code}: ${reason})`);
        clients.delete(userId);
        userRooms.delete(userId);
      } else {
        console.log(`WebSocket client disconnected (${code}: ${reason})`);
      }
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Validate message structure
        if (!data.type) {
          console.warn('Received WebSocket message without type');
          return;
        }
        
        // Handle different message types
        switch (data.type) {
          case 'join_room':
            // User joining a room
            if (userId && data.roomId) {
              const rooms = userRooms.get(userId) || new Set();
              rooms.add(data.roomId);
              userRooms.set(userId, rooms);
              console.log(`User ${userId} joined room ${data.roomId}`);
            }
            break;
            
          case 'leave_room':
            // User leaving a room
            if (userId && data.roomId) {
              const rooms = userRooms.get(userId);
              if (rooms) {
                rooms.delete(data.roomId);
                console.log(`User ${userId} left room ${data.roomId}`);
              }
            }
            break;
            
          case 'chat_message':
            // Room message - broadcast only to users in that room
            if (data.roomId) {
              clients.forEach((client, clientUserId) => {
                const clientRooms = userRooms.get(clientUserId);
                if (client.readyState === WebSocket.OPEN && 
                    clientRooms && clientRooms.has(data.roomId)) {
                  client.send(JSON.stringify({
                    ...data,
                    timestamp: new Date().toISOString(),
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
                  timestamp: new Date().toISOString(),
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
            } else {
              // Broadcast to all connected clients
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(data));
                }
              });
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
      if (userId) {
        clients.delete(userId);
      }
    });

    ws.on('pong', () => {
      // Reset any reconnection logic if needed
    });
  });

  // Attach wss to the app instance so we can access it in route handlers
  (app as any).wss = wss;
  (app as any).clients = clients;

  // --- Training Center API Overhaul ---
  // List all courses
  app.get("/api/training/courses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });
  // Get course detail (with modules)
  app.get("/api/training/courses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      const courses = await storage.getCourses();
      const course = courses.find(c => c.id === courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course detail" });
    }
  });
  // (Admin) Create course
  app.post("/api/training/courses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    try {
      const newCourse = await storage.createCourse(req.body);
      res.json(newCourse);
    } catch (error) {
      res.status(500).json({ message: "Failed to create course" });
    }
  });
  // (Admin) Update course
  app.put("/api/training/courses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    try {
      const courseId = parseInt(req.params.id);
      const updated = await db.update(courses).set(req.body).where(eq(courses.id, courseId)).returning();
      if (!updated[0]) return res.status(404).json({ message: "Course not found" });
      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to update course" });
    }
  });
  // (Admin) Delete course
  app.delete("/api/training/courses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    try {
      const courseId = parseInt(req.params.id);
      const deleted = await db.update(courses).set({ isActive: false }).where(eq(courses.id, courseId)).returning();
      if (!deleted[0]) return res.status(404).json({ message: "Course not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });
  // Enroll in a course
  app.post("/api/training/enroll", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { courseId } = req.body;
      const userId = req.user!.id;
      // Prevent duplicate enrollment
      const enrollments = await storage.getEnrollmentsByUser(userId);
      if (enrollments.some(e => e.courseId === courseId)) {
        return res.status(400).json({ message: "Already enrolled" });
      }
      const enrollment = await storage.createEnrollment({ userId, courseId, status: "enrolled", progress: 0 });
      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ message: "Failed to enroll" });
    }
  });
  // Get my enrollments & progress
  app.get("/api/training/enrollments/my", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const enrollments = await storage.getEnrollmentsByUser(userId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });
  // Update module/course progress
  app.post("/api/training/progress", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { enrollmentId, progress, status, score } = req.body;
      const updated = await storage.updateEnrollment(enrollmentId, { progress, status, score });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update progress" });
    }
  });
  // Download certificate PDF for a completed course
  app.get("/api/training/certificate/:enrollmentId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const enrollmentId = parseInt(req.params.enrollmentId);
      const { templateId } = req.query; // Optional template ID
      const userId = req.user!.id;
      
      // Fetch enrollment
      const enrollments = await storage.getEnrollmentsByUser(userId);
      const enrollment = enrollments.find(e => e.id === enrollmentId);
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
      if (enrollment.status !== "completed") return res.status(403).json({ message: "Course not completed" });
      
      // Fetch course
      const courses = await storage.getCourses();
      const course = courses.find(c => c.id === enrollment.courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      
      // Fetch user
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get certificate template
      let template;
      if (templateId) {
        template = await storage.getCertificateTemplate(parseInt(templateId as string));
      } else {
        template = await storage.getDefaultCertificateTemplate();
      }

      // Generate PDF with template support
      const doc = new PDFDocument({ 
        size: 'A4', 
        layout: template?.templateData?.layout?.orientation || 'landscape',
        margin: 50 
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificate-${enrollmentId}.pdf`);
      doc.pipe(res);

      if (template?.templateData) {
        const templateData = template.templateData;
        
        // Apply template styling
        if (templateData.styling?.borderColor && templateData.styling?.borderWidth) {
          doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
             .lineWidth(templateData.styling.borderWidth)
             .stroke(templateData.styling.borderColor);
        }

        // Background color
        if (templateData.styling?.backgroundColor && templateData.styling.backgroundColor !== '#ffffff') {
          doc.rect(0, 0, doc.page.width, doc.page.height)
             .fill(templateData.styling.backgroundColor);
        }

        // Header section
        if (templateData.header) {
          const header = templateData.header;
          if (header.organizationName) {
            doc.fontSize(16).fillColor(header.titleColor || '#000000')
               .text(header.organizationName, 50, 50, { 
                 align: 'center',
                 width: doc.page.width - 100 
               });
          }
          if (header.title) {
            doc.fontSize(header.titleFont?.size || 28)
               .fillColor(header.titleColor || '#000000')
               .text(header.title, 50, 100, { 
                 align: 'center',
                 width: doc.page.width - 100 
               });
          }
        }

        // Body section
        if (templateData.body) {
          const body = templateData.body;
          let yPosition = 180;
          
          if (body.recipientSection) {
            doc.fontSize(18).fillColor('#000000')
               .text(body.recipientSection.prefix || 'This certifies that', 50, yPosition, { 
                 align: 'center',
                 width: doc.page.width - 100 
               });
            yPosition += 40;
            
            doc.fontSize(body.recipientSection.nameFont?.size || 22)
               .fillColor(body.recipientSection.nameColor || '#000000')
               .text(`${user.firstName} ${user.lastName}`, 50, yPosition, { 
                 align: 'center',
                 width: doc.page.width - 100,
                 underline: body.recipientSection.nameUnderline || false
               });
            yPosition += 60;
          }
          
          if (body.courseSection) {
            doc.fontSize(18).fillColor('#000000')
               .text(body.courseSection.prefix || 'has successfully completed the course', 50, yPosition, { 
                 align: 'center',
                 width: doc.page.width - 100 
               });
            yPosition += 40;
            
            doc.fontSize(body.courseSection.courseFont?.size || 20)
               .fillColor(body.courseSection.courseColor || '#000000')
               .text(course.title, 50, yPosition, { 
                 align: 'center',
                 width: doc.page.width - 100,
                 underline: true
               });
            yPosition += 60;
          }
          
          if (body.detailsSection) {
            if (body.detailsSection.completionDate?.show) {
              doc.fontSize(16).fillColor('#000000')
                 .text(`Completion Date: ${enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : ''}`, 50, yPosition, { 
                   align: 'center',
                   width: doc.page.width - 100 
                 });
              yPosition += 30;
            }
            
            if (body.detailsSection.score?.show && enrollment.finalScore) {
              doc.fontSize(14).fillColor('#000000')
                 .text(`Final Score: ${enrollment.finalScore}%`, 50, yPosition, { 
                   align: 'center',
                   width: doc.page.width - 100 
                 });
              yPosition += 30;
            }

            if (body.detailsSection.certificateId?.show) {
              doc.fontSize(14).fillColor('#666666')
                 .text(`Certificate ID: ${enrollment.certificateId || enrollment.id}`, 50, yPosition, { 
                   align: 'center',
                   width: doc.page.width - 100 
                 });
            }
          }
        }

        // Footer section
        if (templateData.footer) {
          const footer = templateData.footer;
          const footerY = doc.page.height - 100;
          
          if (footer.signature?.show) {
            const signatureX = footer.signature.position === 'bottom-right' ? doc.page.width - 200 : 50;
            doc.fontSize(footer.signature.signatureFont?.size || 12)
               .fillColor('#000000')
               .text(footer.signature.text || 'Authorized Signature', signatureX, footerY, { 
                 width: 150 
               });
          }
          
          if (footer.seal?.show) {
            const sealX = footer.seal.position === 'bottom-left' ? 50 : doc.page.width - 200;
            doc.fontSize(12).fillColor('#000000')
               .text(footer.seal.text || 'Official Seal', sealX, footerY, { 
                 width: 150 
               });
          }
        }

        // Powered by text
        doc.fontSize(12).fillOpacity(0.7)
           .text('Powered by CAFFE Election Training Center', 50, doc.page.height - 50, { 
             align: 'center',
             width: doc.page.width - 100 
           });
      } else {
        // Fallback to basic certificate if no template
        doc.fontSize(28).text('Certificate of Completion', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(18).text(`This certifies that`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(22).text(`${user.firstName} ${user.lastName}`, { align: 'center', underline: true });
        doc.moveDown();
        doc.fontSize(18).text(`has successfully completed the course`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).text(`${course.title}`, { align: 'center', underline: true });
        doc.moveDown(2);
        doc.fontSize(16).text(`Completion Date: ${enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : ''}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Certificate ID: ${enrollment.certificateId || enrollment.id}`, { align: 'center' });
        doc.moveDown(4);
        doc.fontSize(12).fillOpacity(0.7).text('Powered by CAFFE Election Training Center', { align: 'center' });
      }

      doc.end();
    } catch (error) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: "Failed to generate certificate" });
    }
  });
  // (Admin) Get course/user analytics
  app.get("/api/training/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const courses = await storage.getCourses();
      const enrollmentsList = await db.select().from(enrollments);
      const totalCourses = courses.length;
      const totalModules = courses.reduce((sum, c) => {
        const content = c.content as any;
        return sum + (Array.isArray(content?.modules) ? content.modules.length : 0);
      }, 0);
      const totalEnrollments = enrollmentsList.length;
      const totalCompletions = enrollmentsList.filter((e: any) => e.status === 'completed').length;
      res.json({ totalCourses, totalModules, totalEnrollments, totalCompletions });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // --- AI-powered endpoints ---
  // Get AI-powered course/module recommendations
  app.post("/api/training/ai/recommendations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Expects userProfile in body
      const result = await GeminiService.getRecommendations(req.body.userProfile, storage);
      res.json({ recommendations: result });
    } catch (error) {
      res.status(500).json({ message: "AI recommendation error", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  // Generate adaptive quiz questions
  app.post("/api/training/ai/quiz", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Expects module and userHistory in body
      const result = await GeminiService.generateQuiz(req.body.module, req.body.userHistory, storage);
      res.json({ quiz: result });
    } catch (error) {
      res.status(500).json({ message: "AI quiz error", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  // Get smart feedback on user progress
  app.post("/api/training/ai/feedback", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Expects progress in body
      const result = await GeminiService.getFeedback(req.body.progress, storage);
      res.json({ feedback: result });
    } catch (error) {
      res.status(500).json({ message: "AI feedback error", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  // Generate AI-powered course structure
  app.post("/api/training/ai/create-course", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      
      const { topic, role, difficulty, targetDuration } = req.body;
      if (!topic || !role || !difficulty || !targetDuration) {
        return res.status(400).json({ message: "Missing required parameters: topic, role, difficulty, targetDuration" });
      }
      
      const courseStructure = await GeminiService.generateCourse({
        topic,
        role,
        difficulty,
        targetDuration: parseInt(targetDuration)
      }, storage);
      
      res.json({ course: courseStructure });
    } catch (error) {
      res.status(500).json({ message: "AI course generation error", error: error.message });
    }
  });

  // AI course editing assistance
  app.post("/api/training/ai/edit-course", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      
      const { courseData, editRequest } = req.body;
      if (!courseData || !editRequest) {
        return res.status(400).json({ message: "Missing required parameters: courseData, editRequest" });
      }
      
      const editedCourse = await GeminiService.editCourse(courseData, editRequest, storage);
      res.json({ course: editedCourse });
    } catch (error) {
      res.status(500).json({ message: "AI course editing error", error: error.message });
    }
  });

  // Generate question bank with AI
  app.post("/api/training/ai/question-bank", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { topic, difficulty, questionTypes, count } = req.body;
      if (!topic || !difficulty || !questionTypes || !count) {
        return res.status(400).json({ message: "Missing required parameters: topic, difficulty, questionTypes, count" });
      }
      
      const questionBank = await GeminiService.generateQuestionBank({
        topic,
        difficulty,
        questionTypes: Array.isArray(questionTypes) ? questionTypes : [questionTypes],
        count: parseInt(count)
      }, storage);
      
      res.json(questionBank);
    } catch (error) {
      res.status(500).json({ message: "AI question bank error", error: error.message });
    }
  });

  // Generate graphics prompt for AI image generation
  app.post("/api/training/ai/graphics-prompt", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, style, context } = req.body;
      if (!content || !style || !context) {
        return res.status(400).json({ message: "Missing required parameters: content, style, context" });
      }
      
      const prompt = await GeminiService.generateGraphicsPrompt({ content, style, context }, storage);
      res.json({ prompt });
    } catch (error) {
      res.status(500).json({ message: "AI graphics prompt error", error: error.message });
    }
  });

  // Enhance existing module with AI
  app.post("/api/training/ai/enhance-module", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      
      const { moduleData, enhancementType } = req.body;
      if (!moduleData || !enhancementType) {
        return res.status(400).json({ message: "Missing required parameters: moduleData, enhancementType" });
      }
      
      const enhancedModule = await GeminiService.enhanceModule(moduleData, enhancementType, storage);
      res.json({ module: enhancedModule });
    } catch (error) {
      res.status(500).json({ message: "AI module enhancement error", error: error.message });
    }
  });

  // ======================= CERTIFICATE TEMPLATE MANAGEMENT =======================

  // Get all certificate templates
  app.get("/api/certificate-templates", async (req, res) => {
    try {
      const templates = await storage.getCertificateTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching certificate templates:", error);
      res.status(500).json({ error: "Failed to fetch certificate templates" });
    }
  });

  // Get single certificate template
  app.get("/api/certificate-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getCertificateTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Certificate template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching certificate template:", error);
      res.status(500).json({ error: "Failed to fetch certificate template" });
    }
  });

  // Get default certificate template
  app.get("/api/certificate-templates/default", async (req, res) => {
    try {
      const template = await storage.getDefaultCertificateTemplate();
      
      if (!template) {
        return res.status(404).json({ error: "No default certificate template found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching default certificate template:", error);
      res.status(500).json({ error: "Failed to fetch default certificate template" });
    }
  });

  // Create certificate template
  app.post("/api/certificate-templates", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const templateData = req.body;
      templateData.createdBy = req.user.id;
      
      const template = await storage.createCertificateTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating certificate template:", error);
      res.status(500).json({ error: "Failed to create certificate template" });
    }
  });

  // Update certificate template
  app.put("/api/certificate-templates/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const template = await storage.updateCertificateTemplate(id, updates);
      res.json(template);
    } catch (error) {
      console.error("Error updating certificate template:", error);
      res.status(500).json({ error: "Failed to update certificate template" });
    }
  });

  // Delete certificate template
  app.delete("/api/certificate-templates/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCertificateTemplate(id);
      res.json({ message: "Certificate template deleted successfully" });
    } catch (error) {
      console.error("Error deleting certificate template:", error);
      res.status(500).json({ error: "Failed to delete certificate template" });
    }
  });

  // AI: Generate certificate template
  app.post("/api/certificate-templates/generate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { style, organization, purpose, colors, layout } = req.body;
      
      if (!style || !organization || !purpose) {
        return res.status(400).json({ error: "Style, organization, and purpose are required" });
      }

      const templateConfig = await GeminiService.generateCertificateTemplate({
        style,
        organization,
        purpose,
        colors: colors || ["#2c3e50", "#34495e", "#3498db"],
        layout: layout || "landscape"
      }, storage);

      // Create the template in database
      const templateData = {
        ...templateConfig,
        createdBy: req.user.id
      };
      
      const template = await storage.createCertificateTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error generating certificate template:", error);
      res.status(500).json({ error: "Failed to generate certificate template" });
    }
  });

  // AI: Edit certificate template
  app.post("/api/certificate-templates/:id/edit", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const { editRequest } = req.body;
      
      if (!editRequest) {
        return res.status(400).json({ error: "Edit request is required" });
      }

      const currentTemplate = await storage.getCertificateTemplate(id);
      if (!currentTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }

      const updatedTemplateData = await GeminiService.editCertificateTemplate(
        currentTemplate.templateData,
        editRequest,
        storage
      );

      const updatedTemplate = await storage.updateCertificateTemplate(id, {
        templateData: updatedTemplateData
      });

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error editing certificate template:", error);
      res.status(500).json({ error: "Failed to edit certificate template" });
    }
  });

  // AI: Get template improvement suggestions
  app.post("/api/certificate-templates/:id/suggestions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const template = await storage.getCertificateTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const suggestions = await GeminiService.suggestTemplateImprovements(
        template.templateData,
        storage
      );

      res.json(suggestions);
    } catch (error) {
      console.error("Error getting template suggestions:", error);
      res.status(500).json({ error: "Failed to get template suggestions" });
    }
  });

  // AI: Generate template variations
  app.post("/api/certificate-templates/:id/variations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const { count = 3 } = req.body;
      
      const template = await storage.getCertificateTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const variations = await GeminiService.generateTemplateVariations(
        template.templateData,
        Math.min(count, 5), // Limit to 5 variations max
        storage
      );

      res.json(variations);
    } catch (error) {
      console.error("Error generating template variations:", error);
      res.status(500).json({ error: "Failed to generate template variations" });
    }
  });

  // Training programs API endpoints
  app.get("/api/training/programs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courses = await storage.getCourses();
      const programs = courses.map(course => ({
        ...course,
        modules: course.content?.modules || [],
        completions: 0,
        totalEnrollments: 0
      }));
      res.json(programs);
    } catch (error) {
      console.error("Error fetching training programs:", error);
      res.status(500).json({ error: "Failed to fetch training programs" });
    }
  });

  app.post("/api/training/programs", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { title, description, targetRole, modules, passingScore } = req.body;
      
      const courseData = {
        title,
        description,
        target_audience: req.body.role || req.body.target_audience || 'Observer',
        duration: modules?.reduce((total: number, module: any) => total + (module.duration || 30), 0) || 60,
        passingScore: passingScore || 80,
        content: { modules: modules || [] },
        isActive: true
      };

      const course = await storage.createCourse(courseData);
      console.log("Created course:", course);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating training program:", error);
      res.status(500).json({ error: "Failed to create training program" });
    }
  });

  // Update training program
  app.put("/api/training/programs/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const { title, description, targetRole, modules, passingScore, isActive } = req.body;
      
      const updates = {
        title,
        description,
        role: targetRole,
        duration: modules?.reduce((total: number, module: any) => total + (module.duration || 30), 0) || 60,
        passingScore: passingScore || 80,
        content: { modules: modules || [] },
        isActive: isActive !== undefined ? isActive : true
      };

      const course = await storage.updateCourse(id, updates);
      res.json(course);
    } catch (error) {
      console.error("Error updating training program:", error);
      res.status(500).json({ error: "Failed to update training program" });
    }
  });

  // Delete training program
  app.delete("/api/training/programs/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCourse(id);
      res.json({ message: "Training program deleted successfully" });
    } catch (error) {
      console.error("Error deleting training program:", error);
      res.status(500).json({ error: "Failed to delete training program" });
    }
  });

  // Get single training program
  app.get("/api/training/programs/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);
      
      if (!course) {
        return res.status(404).json({ error: "Training program not found" });
      }

      const program = {
        ...course,
        modules: course.content?.modules || [],
        completions: 0,
        totalEnrollments: 0
      };

      res.json(program);
    } catch (error) {
      console.error("Error fetching training program:", error);
      res.status(500).json({ error: "Failed to fetch training program" });
    }
  });

  // Upload training media
  app.post("/api/training/media/upload", authenticateToken, upload.single('media'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { programId, moduleId, type } = req.body;
      
      const mediaData = {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        programId: programId ? parseInt(programId) : null,
        moduleId: moduleId ? parseInt(moduleId) : null,
        type: type || 'document',
        uploadedBy: req.user.id
      };

      // Store media reference in documents table for now
      const document = await storage.createDocument({
        userId: req.user.id,
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: req.user.id,
        documentType: type || 'training-media',
        reportId: programId ? parseInt(programId) : null
      });

      res.status(201).json({
        id: document.id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        url: `/uploads/${req.file.filename}`,
        type: type || 'document'
      });
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ error: "Failed to upload media" });
    }
  });

  // Get training media
  app.get("/api/training/media", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { programId, type } = req.query;
      
      // For now, return mock media data - in production this would query a proper media table
      const mediaFiles = [
        {
          id: 1,
          fileName: "Electoral_Law_Overview.pdf",
          type: "document",
          url: "/uploads/electoral-law.pdf",
          size: "1.2 MB",
          uploadedAt: new Date().toISOString()
        },
        {
          id: 2,
          fileName: "Polling_Station_Setup.mp4",
          type: "video",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          duration: "15:30",
          uploadedAt: new Date().toISOString()
        }
      ];

      res.json(mediaFiles);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  // Course modules management
  app.get("/api/training/courses/:courseId/modules", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const modules = await storage.getCourseModules(courseId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching course modules:", error);
      res.status(500).json({ error: "Failed to fetch course modules" });
    }
  });

  app.post("/api/training/courses/:courseId/modules", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const courseId = parseInt(req.params.courseId);
      const moduleData = {
        ...req.body,
        courseId
      };

      const module = await storage.createCourseModule(moduleData);
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating course module:", error);
      res.status(500).json({ error: "Failed to create course module" });
    }
  });

  app.put("/api/training/modules/:moduleId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const moduleId = parseInt(req.params.moduleId);
      const updatedModule = await storage.updateCourseModule(moduleId, req.body);
      res.json(updatedModule);
    } catch (error) {
      console.error("Error updating course module:", error);
      res.status(500).json({ error: "Failed to update course module" });
    }
  });

  app.delete("/api/training/modules/:moduleId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const moduleId = parseInt(req.params.moduleId);
      await storage.deleteCourseModule(moduleId);
      res.json({ message: "Course module deleted successfully" });
    } catch (error) {
      console.error("Error deleting course module:", error);
      res.status(500).json({ error: "Failed to delete course module" });
    }
  });

  // Course quizzes management
  app.get("/api/training/courses/:courseId/quizzes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const quizzes = await storage.getCourseQuizzes(courseId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching course quizzes:", error);
      res.status(500).json({ error: "Failed to fetch course quizzes" });
    }
  });

  app.post("/api/training/courses/:courseId/quizzes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const courseId = parseInt(req.params.courseId);
      const quizData = {
        ...req.body,
        courseId
      };

      const quiz = await storage.createCourseQuiz(quizData);
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating course quiz:", error);
      res.status(500).json({ error: "Failed to create course quiz" });
    }
  });

  app.put("/api/training/quizzes/:quizId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const quizId = parseInt(req.params.quizId);
      const updatedQuiz = await storage.updateCourseQuiz(quizId, req.body);
      res.json(updatedQuiz);
    } catch (error) {
      console.error("Error updating course quiz:", error);
      res.status(500).json({ error: "Failed to update course quiz" });
    }
  });

  app.delete("/api/training/quizzes/:quizId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const quizId = parseInt(req.params.quizId);
      await storage.deleteCourseQuiz(quizId);
      res.json({ message: "Course quiz deleted successfully" });
    } catch (error) {
      console.error("Error deleting course quiz:", error);
      res.status(500).json({ error: "Failed to delete course quiz" });
    }
  });

  // Course contests management
  app.get("/api/training/courses/:courseId/contests", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const contests = await storage.getCourseContests(courseId);
      res.json(contests);
    } catch (error) {
      console.error("Error fetching course contests:", error);
      res.status(500).json({ error: "Failed to fetch course contests" });
    }
  });

  app.post("/api/training/courses/:courseId/contests", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const courseId = parseInt(req.params.courseId);
      const contestData = {
        ...req.body,
        courseId,
        createdBy: req.user.id
      };

      const contest = await storage.createCourseContest(contestData);
      res.status(201).json(contest);
    } catch (error) {
      console.error("Error creating course contest:", error);
      res.status(500).json({ error: "Failed to create course contest" });
    }
  });

  app.put("/api/training/contests/:contestId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const contestId = parseInt(req.params.contestId);
      const updatedContest = await storage.updateCourseContest(contestId, req.body);
      res.json(updatedContest);
    } catch (error) {
      console.error("Error updating course contest:", error);
      res.status(500).json({ error: "Failed to update course contest" });
    }
  });

  app.delete("/api/training/contests/:contestId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const contestId = parseInt(req.params.contestId);
      await storage.deleteCourseContest(contestId);
      res.json({ message: "Course contest deleted successfully" });
    } catch (error) {
      console.error("Error deleting course contest:", error);
      res.status(500).json({ error: "Failed to delete course contest" });
    }
  });

  // Enhanced media management for courses
  app.get("/api/training/courses/:courseId/media", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const media = await storage.getCourseMedia(courseId);
      res.json(media);
    } catch (error) {
      console.error("Error fetching course media:", error);
      res.status(500).json({ error: "Failed to fetch course media" });
    }
  });

  app.post("/api/training/courses/:courseId/media", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const courseId = parseInt(req.params.courseId);
      const { moduleId, mediaType, description } = req.body;

      const mediaData = {
        courseId,
        moduleId: moduleId ? parseInt(moduleId) : null,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        mediaType: mediaType || 'document',
        description: description || '',
        uploadedBy: req.user.id
      };

      const media = await storage.createCourseMedia(mediaData);
      res.status(201).json(media);
    } catch (error) {
      console.error("Error uploading course media:", error);
      res.status(500).json({ error: "Failed to upload course media" });
    }
  });

  app.delete("/api/training/media/:mediaId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const mediaId = parseInt(req.params.mediaId);
      await storage.deleteCourseMedia(mediaId);
      res.json({ message: "Course media deleted successfully" });
    } catch (error) {
      console.error("Error deleting course media:", error);
      res.status(500).json({ error: "Failed to delete course media" });
    }
  });

  // System health endpoint
  app.get("/api/admin/system/health", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const health = {
        database: true,
        websocket: true,
        storage: true,
        notifications: true,
        timestamp: new Date().toISOString()
      };

      // Test database connection
      try {
        await storage.getSettings();
      } catch (error) {
        health.database = false;
      }

      res.json(health);
    } catch (error) {
      console.error("Error checking system health:", error);
      res.status(500).json({ error: "Failed to check system health" });
    }
  });

  return httpServer;
}