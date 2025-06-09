import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertReportSchema, insertCheckInSchema, insertMessageSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "caffe-electoral-observer-secret-key";
const upload = multer({ dest: "uploads/" });

// Middleware for JWT authentication
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<number, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'authenticate') {
          try {
            const decoded = jwt.verify(message.token, JWT_SECRET) as any;
            clients.set(decoded.userId, ws);
            ws.send(JSON.stringify({ type: 'authenticated', userId: decoded.userId }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
          }
        } else if (message.type === 'chat_message') {
          // Handle chat messages
          const newMessage = await storage.createMessage({
            senderId: message.senderId,
            recipientId: message.recipientId,
            roomId: message.roomId,
            messageType: message.messageType || 'text',
            content: message.content,
            metadata: message.metadata
          });
          
          // Send to recipient if online
          const recipientWs = message.recipientId ? clients.get(message.recipientId) : null;
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'new_message',
              message: newMessage
            }));
          }
          
          // Broadcast to room if it's a room message
          if (message.roomId) {
            clients.forEach((clientWs, userId) => {
              if (clientWs.readyState === WebSocket.OPEN && userId !== message.senderId) {
                clientWs.send(JSON.stringify({
                  type: 'new_message',
                  message: newMessage
                }));
              }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove client from map
      clients.forEach((clientWs, userId) => {
        if (clientWs === ws) {
          clients.delete(userId);
        }
      });
    });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "USER_REGISTERED",
        entityType: "user",
        entityId: user.id.toString(),
        newValues: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });

      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          observerId: user.observerId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed", error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "USER_LOGIN",
        entityType: "user",
        entityId: user.id.toString(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });

      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          observerId: user.observerId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed", error: error.message });
    }
  });

  // Protected routes
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        observerId: user.observerId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        kycStatus: user.kycStatus,
        trainingStatus: user.trainingStatus
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user", error: error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats", error: error.message });
    }
  });

  // Polling stations
  app.get("/api/polling-stations", authenticateToken, async (req, res) => {
    try {
      const stations = await storage.getPollingStations();
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get polling stations", error: error.message });
    }
  });

  // Check-ins
  app.post("/api/check-ins", authenticateToken, async (req, res) => {
    try {
      const checkInData = insertCheckInSchema.parse({
        ...req.body,
        userId: req.user.userId
      });
      
      const checkIn = await storage.createCheckIn(checkInData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "CHECK_IN_CREATED",
        entityType: "check_in",
        entityId: checkIn.id.toString(),
        newValues: checkInData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });

      res.json(checkIn);
    } catch (error) {
      res.status(400).json({ message: "Failed to create check-in", error: error.message });
    }
  });

  app.get("/api/check-ins/my", authenticateToken, async (req, res) => {
    try {
      const checkIns = await storage.getCheckInsByUser(req.user.userId);
      res.json(checkIns);
    } catch (error) {
      res.status(500).json({ message: "Failed to get check-ins", error: error.message });
    }
  });

  // Reports
  app.get("/api/reports", authenticateToken, async (req, res) => {
    try {
      let reports;
      if (req.user.role === 'admin' || req.user.role === 'coordinator') {
        reports = await storage.getReports();
      } else {
        reports = await storage.getReportsByUser(req.user.userId);
      }
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reports", error: error.message });
    }
  });

  app.post("/api/reports", authenticateToken, async (req, res) => {
    try {
      const reportData = insertReportSchema.parse({
        ...req.body,
        userId: req.user.userId
      });
      
      const report = await storage.createReport(reportData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "REPORT_CREATED",
        entityType: "report",
        entityId: report.id.toString(),
        newValues: reportData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });

      // Broadcast to admin users
      clients.forEach((ws, userId) => {
        if (ws.readyState === WebSocket.OPEN) {
          storage.getUser(userId).then(user => {
            if (user && (user.role === 'admin' || user.role === 'coordinator')) {
              ws.send(JSON.stringify({
                type: 'new_report',
                report: report
              }));
            }
          });
        }
      });

      res.json(report);
    } catch (error) {
      res.status(400).json({ message: "Failed to create report", error: error.message });
    }
  });

  // Document upload
  app.post("/api/documents/upload", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate secure filename
      const fileExtension = path.extname(req.file.originalname);
      const secureFilename = crypto.randomUUID() + fileExtension;
      const filePath = path.join("uploads", secureFilename);

      // Move file to secure location
      await fs.rename(req.file.path, filePath);

      const document = await storage.createDocument({
        userId: req.user.userId,
        reportId: req.body.reportId ? parseInt(req.body.reportId) : null,
        fileName: secureFilename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: filePath
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "DOCUMENT_UPLOADED",
        entityType: "document",
        entityId: document.id.toString(),
        newValues: { fileName: document.fileName, fileType: document.fileType },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload document", error: error.message });
    }
  });

  // Messages
  app.get("/api/messages", authenticateToken, async (req, res) => {
    try {
      const { roomId, recipientId } = req.query;
      
      let messages;
      if (roomId) {
        messages = await storage.getMessagesByRoom(roomId as string);
      } else if (recipientId) {
        messages = await storage.getMessagesBetweenUsers(req.user.userId, parseInt(recipientId as string));
      } else {
        messages = await storage.getMessages();
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages", error: error.message });
    }
  });

  // Training courses
  app.get("/api/courses", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      const courses = await storage.getCoursesByRole(user?.role || 'observer');
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get courses", error: error.message });
    }
  });

  app.get("/api/enrollments/my", authenticateToken, async (req, res) => {
    try {
      const enrollments = await storage.getEnrollmentsByUser(req.user.userId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get enrollments", error: error.message });
    }
  });

  // FAQ
  app.get("/api/faqs", async (req, res) => {
    try {
      const { category } = req.query;
      let faqs;
      if (category) {
        faqs = await storage.getFAQsByCategory(category as string);
      } else {
        faqs = await storage.getFAQs();
      }
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get FAQs", error: error.message });
    }
  });

  // News
  app.get("/api/news", async (req, res) => {
    try {
      const news = await storage.getPublishedNews();
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to get news", error: error.message });
    }
  });

  // Settings (admin only)
  app.get("/api/settings", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings", error: error.message });
    }
  });

  app.put("/api/settings/:key", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { key } = req.params;
      const { value } = req.body;
      
      const setting = await storage.updateSetting(key, value, req.user.userId);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "SETTING_UPDATED",
        entityType: "setting",
        entityId: key,
        newValues: { key, value },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting", error: error.message });
    }
  });

  // Audit logs (admin only)
  app.get("/api/audit-logs", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit logs", error: error.message });
    }
  });

  return httpServer;
}
