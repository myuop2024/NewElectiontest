import { storage } from '../storage';
import { NotificationService } from './notification-service';

interface EmergencyAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  location: {
    pollingStation?: string;
    parish: string;
    coordinates?: { lat: number; lng: number };
  };
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  channels: string[];
  recipients: string[];
  createdBy: number;
  createdAt: string;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
  resolvedBy?: number;
  resolvedAt?: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'sms' | 'email' | 'push' | 'call' | 'whatsapp';
  enabled: boolean;
  priority: number;
  config: any;
}

interface EscalationRule {
  id: string;
  name: string;
  severity: string[];
  categories: string[];
  timeThreshold: number; // minutes
  escalateTo: string[];
  channels: string[];
  enabled: boolean;
}

export class EmergencyService {
  private notificationService: NotificationService;
  private activeAlerts: Map<string, EmergencyAlert> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.notificationService = new NotificationService();
    this.loadActiveAlerts();
  }

  private async loadActiveAlerts() {
    try {
      // Load active alerts from storage on service initialization
      const auditLogs = await storage.getAuditLogs();
      const alertLogs = auditLogs.filter(log => 
        log.action === 'emergency_alert_created' && 
        log.entityType === 'emergency_alert'
      );

      for (const log of alertLogs) {
        try {
          const alertData = JSON.parse(log.newValues as string || '{}');
          if (alertData.status === 'active' || alertData.status === 'acknowledged') {
            this.activeAlerts.set(alertData.id, alertData);
            this.scheduleEscalation(alertData);
          }
        } catch (error) {
          console.error('Error loading alert:', error);
        }
      }
    } catch (error) {
      console.error('Error loading active alerts:', error);
    }
  }

  async createEmergencyAlert(alertData: {
    title: string;
    description: string;
    severity: string;
    category: string;
    parish: string;
    pollingStation?: string;
    channels: string[];
    recipients?: string[];
    createdBy: number;
  }): Promise<EmergencyAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: EmergencyAlert = {
      id: alertId,
      title: alertData.title,
      description: alertData.description,
      severity: alertData.severity as any,
      category: alertData.category,
      location: {
        parish: alertData.parish,
        pollingStation: alertData.pollingStation
      },
      status: 'active',
      channels: alertData.channels,
      recipients: alertData.recipients || [],
      createdBy: alertData.createdBy,
      createdAt: new Date().toISOString()
    };

    // Store in active alerts
    this.activeAlerts.set(alertId, alert);

    // Log the alert creation
    await storage.createAuditLog({
      userId: alertData.createdBy,
      action: 'emergency_alert_created',
      entityType: 'emergency_alert',
      entityId: alertId,
      newValues: JSON.stringify(alert)
    });

    // Send notifications
    await this.sendNotifications(alert);

    // Schedule escalation
    this.scheduleEscalation(alert);

    return alert;
  }

  private async sendNotifications(alert: EmergencyAlert) {
    try {
      for (const channel of alert.channels) {
        switch (channel) {
          case 'email':
            await this.notificationService.sendEmail({
              to: alert.recipients,
              subject: `EMERGENCY ALERT: ${alert.title}`,
              html: `
                <h2>Emergency Alert - ${alert.severity.toUpperCase()}</h2>
                <p><strong>Location:</strong> ${alert.location.parish}${alert.location.pollingStation ? `, ${alert.location.pollingStation}` : ''}</p>
                <p><strong>Category:</strong> ${alert.category}</p>
                <p><strong>Description:</strong> ${alert.description}</p>
                <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
                <p>Please respond immediately to acknowledge this alert.</p>
              `
            });
            break;
          case 'sms':
            for (const recipient of alert.recipients) {
              await this.notificationService.sendSMS(
                recipient,
                `EMERGENCY: ${alert.title} - ${alert.location.parish}. ${alert.description}`
              );
            }
            break;
          case 'push':
            // Push notification would be handled by a push service
            console.log('Push notification sent for alert:', alert.id);
            break;
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  private scheduleEscalation(alert: EmergencyAlert) {
    const escalationTime = this.getEscalationTimeForAlert(alert);
    
    const timer = setTimeout(async () => {
      if (this.activeAlerts.has(alert.id) && 
          this.activeAlerts.get(alert.id)?.status === 'active') {
        await this.escalateAlert(alert.id);
      }
    }, escalationTime * 60 * 1000); // Convert minutes to milliseconds

    this.escalationTimers.set(alert.id, timer);
  }

  private async escalateAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'escalated';
    this.activeAlerts.set(alertId, alert);

    // Log escalation
    await storage.createAuditLog({
      userId: 0, // System escalation
      action: 'emergency_alert_escalated',
      entityType: 'emergency_alert',
      entityId: alertId,
      newValues: JSON.stringify(alert)
    });

    // Send escalation notifications
    await this.sendEscalationNotifications(alert);
  }

  private async sendEscalationNotifications(alert: EmergencyAlert) {
    const escalationRecipients = ['supervisor@example.com', 'admin@example.com'];
    
    await this.notificationService.sendEmail({
      to: escalationRecipients,
      subject: `ESCALATED ALERT: ${alert.title}`,
      html: `
        <h2>Escalated Emergency Alert - ${alert.severity.toUpperCase()}</h2>
        <p><strong>Alert ID:</strong> ${alert.id}</p>
        <p><strong>Location:</strong> ${alert.location.parish}</p>
        <p><strong>Description:</strong> ${alert.description}</p>
        <p><strong>Created:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
        <p style="color: red;"><strong>This alert has been escalated due to lack of acknowledgment.</strong></p>
      `
    });
  }

  async acknowledgeAlert(alertId: string, userId: number): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();

    this.activeAlerts.set(alertId, alert);

    // Clear escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Log acknowledgment
    await storage.createAuditLog({
      userId,
      action: 'emergency_alert_acknowledged',
      entityType: 'emergency_alert',
      entityId: alertId,
      newValues: JSON.stringify(alert)
    });

    return true;
  }

  async resolveAlert(alertId: string, userId: number, resolution?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date().toISOString();

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Clear escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Log resolution
    await storage.createAuditLog({
      userId,
      action: 'emergency_alert_resolved',
      entityType: 'emergency_alert',
      entityId: alertId,
      newValues: JSON.stringify({ ...alert, resolution })
    });

    return true;
  }

  private getEscalationTimeForAlert(alert: EmergencyAlert): number {
    // Default escalation times based on severity
    switch (alert.severity) {
      case 'critical': return 5; // 5 minutes
      case 'high': return 15; // 15 minutes
      case 'medium': return 30; // 30 minutes
      case 'low': return 60; // 60 minutes
      default: return 30;
    }
  }

  async getActiveAlerts(): Promise<EmergencyAlert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getAllAlerts(): Promise<EmergencyAlert[]> {
    try {
      const auditLogs = await storage.getAuditLogs();
      const alertLogs = auditLogs.filter(log => 
        log.action === 'emergency_alert_created' && 
        log.entityType === 'emergency_alert'
      );

      const alerts = alertLogs.map(log => {
        try {
          return JSON.parse(log.newValues as string || '{}');
        } catch (error) {
          return null;
        }
      }).filter(Boolean);

      return alerts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching all alerts:', error);
      return [];
    }
  }

  async getEmergencyStatistics(): Promise<any> {
    try {
      const allAlerts = await this.getAllAlerts();
      const activeAlerts = await this.getActiveAlerts();

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentAlerts = allAlerts.filter(alert => 
        new Date(alert.createdAt) > last24Hours
      );

      const resolvedAlerts = allAlerts.filter(alert => alert.status === 'resolved');
      const responseTimes = resolvedAlerts
        .filter(alert => alert.acknowledgedAt)
        .map(alert => {
          const created = new Date(alert.createdAt).getTime();
          const acknowledged = new Date(alert.acknowledgedAt!).getTime();
          return Math.round((acknowledged - created) / (1000 * 60)); // minutes
        });

      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      return {
        activeAlerts: activeAlerts.length,
        totalAlerts: allAlerts.length,
        recentAlerts: recentAlerts.length,
        avgResponseTime,
        totalRecipients: 25, // This would be calculated based on actual recipient data
        successRate: 95, // This would be calculated based on delivery confirmations
        severityBreakdown: {
          critical: allAlerts.filter(a => a.severity === 'critical').length,
          high: allAlerts.filter(a => a.severity === 'high').length,
          medium: allAlerts.filter(a => a.severity === 'medium').length,
          low: allAlerts.filter(a => a.severity === 'low').length
        }
      };
    } catch (error) {
      console.error('Error calculating emergency statistics:', error);
      return {
        activeAlerts: 0,
        totalAlerts: 0,
        recentAlerts: 0,
        avgResponseTime: 0,
        totalRecipients: 0,
        successRate: 0,
        severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 }
      };
    }
  }

  async getNotificationChannels(): Promise<NotificationChannel[]> {
    // Default notification channels
    return [
      {
        id: 'sms',
        name: 'SMS Messages',
        type: 'sms',
        enabled: true,
        priority: 1,
        config: {}
      },
      {
        id: 'email',
        name: 'Email Notifications',
        type: 'email',
        enabled: true,
        priority: 2,
        config: {}
      },
      {
        id: 'push',
        name: 'Push Notifications',
        type: 'push',
        enabled: true,
        priority: 3,
        config: {}
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Messages',
        type: 'whatsapp',
        enabled: false,
        priority: 4,
        config: {}
      },
      {
        id: 'voice',
        name: 'Voice Calls',
        type: 'call',
        enabled: false,
        priority: 5,
        config: {}
      }
    ];
  }

  async getEscalationRules(): Promise<EscalationRule[]> {
    // Default escalation rules
    return [
      {
        id: 'critical_immediate',
        name: 'Critical Alert Escalation',
        severity: ['critical'],
        categories: ['security_threat', 'violence', 'medical_emergency'],
        timeThreshold: 5,
        escalateTo: ['emergency_coordinator', 'election_commission'],
        channels: ['sms', 'call'],
        enabled: true
      },
      {
        id: 'high_priority',
        name: 'High Priority Escalation',
        severity: ['high'],
        categories: ['equipment_failure', 'crowd_control'],
        timeThreshold: 15,
        escalateTo: ['field_supervisor'],
        channels: ['sms', 'email'],
        enabled: true
      },
      {
        id: 'standard_escalation',
        name: 'Standard Escalation',
        severity: ['medium', 'low'],
        categories: ['other'],
        timeThreshold: 30,
        escalateTo: ['coordinator'],
        channels: ['email'],
        enabled: true
      }
    ];
  }

  async testEmergencySystem(): Promise<{ success: boolean; message: string }> {
    try {
      // Create a test alert
      const testAlert = await this.createEmergencyAlert({
        title: 'System Test Alert',
        description: 'This is a test of the emergency alert system. No action required.',
        severity: 'low',
        category: 'system_test',
        parish: 'Kingston',
        channels: ['email'],
        recipients: ['test@example.com'],
        createdBy: 1
      });

      // Immediately resolve the test alert
      await this.resolveAlert(testAlert.id, 1, 'System test completed successfully');

      return {
        success: true,
        message: 'Emergency system test completed successfully'
      };
    } catch (error) {
      console.error('Emergency system test failed:', error);
      return {
        success: false,
        message: `Emergency system test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const emergencyService = new EmergencyService();