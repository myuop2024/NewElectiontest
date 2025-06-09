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
    const observerId = await storage.generateObserverId();
    
    const adminUser = await storage.createUser({
      username: "admin",
      email: "admin@caffe.org.jm",
      password: hashedPassword,
      observerId,
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
      console.log("Login request body:", req.body);
      console.log("Login request body type:", typeof req.body);
      
      let credentials;
      if (typeof req.body === 'string') {
        credentials = JSON.parse(req.body);
      } else {
        credentials = req.body;
      }
      
      const { username, password } = credentials;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
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
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const setting = await storage.getSettingByKey("HERE_API_KEY");
      res.json({ 
        configured: !!setting?.value,
        hasKey: !!setting?.value 
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