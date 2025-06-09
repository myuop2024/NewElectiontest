import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; role: string };
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
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

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
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

  // HERE API Settings
  app.get("/api/settings/here-api", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Use environment variable if available, otherwise fall back to database
      const envApiKey = process.env.HERE_API_KEY;
      const setting = await storage.getSettingByKey("HERE_API_KEY");
      
      const apiKey = envApiKey || setting?.value;
      const hasKey = !!apiKey;
      
      res.json({ 
        configured: hasKey,
        hasKey: hasKey,
        apiKey: hasKey ? apiKey : undefined
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

      res.json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
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

  // Settings route
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

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}