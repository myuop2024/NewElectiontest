import { storage } from "../storage.js";
import { AdminSettingsService } from "./admin-settings-service.js";

export class FeatureTester {
  
  // Test all admin features comprehensively
  static async testAllFeatures() {
    const testResults = {
      overall: 'testing',
      totalFeatures: 0,
      passedFeatures: 0,
      failedFeatures: 0,
      warningFeatures: 0,
      results: [] as any[],
      systemHealth: 'unknown',
      timestamp: new Date().toISOString()
    };

    const criticalServices = [
      'bigquery', 'twilio', 'openai', 'here', 'huggingface', 
      'googlegeminiai', 'whatsapp', 'email', 'didit'
    ];

    // Test each critical service
    for (const service of criticalServices) {
      try {
        const validation = await AdminSettingsService.validateAPIConfiguration(service);
        const enabled = await storage.getSettingByKey(`${service}_enabled`) || 
                       await storage.getSettingByKey(`${service === 'here' ? 'here_maps' : service === 'googlegeminiai' ? 'gemini' : service === 'email' ? 'email_notifications' : service}_enabled`);
        
        let status = 'disabled';
        let severity = 'info';
        
        if (enabled?.value === 'true') {
          if (validation.valid) {
            status = 'active';
            severity = 'success';
            testResults.passedFeatures++;
          } else {
            status = 'error';
            severity = 'error';
            testResults.failedFeatures++;
          }
        } else {
          testResults.warningFeatures++;
        }

        testResults.results.push({
          service,
          status,
          severity,
          message: validation.message,
          enabled: enabled?.value === 'true',
          testTimestamp: new Date().toISOString()
        });
        
        testResults.totalFeatures++;
      } catch (error: any) {
        testResults.results.push({
          service,
          status: 'error',
          severity: 'error',
          message: `Test failed: ${error.message}`,
          enabled: false,
          testTimestamp: new Date().toISOString()
        });
        testResults.failedFeatures++;
        testResults.totalFeatures++;
      }
    }

    // Determine overall system health
    const successRate = testResults.passedFeatures / Math.max(testResults.totalFeatures, 1);
    if (successRate >= 0.8) {
      testResults.overall = 'healthy';
      testResults.systemHealth = 'excellent';
    } else if (successRate >= 0.6) {
      testResults.overall = 'degraded';
      testResults.systemHealth = 'good';
    } else if (successRate >= 0.4) {
      testResults.overall = 'warning';
      testResults.systemHealth = 'fair';
    } else {
      testResults.overall = 'critical';
      testResults.systemHealth = 'poor';
    }

    return testResults;
  }

  // Test specific feature functionality
  static async testFeatureConnectivity(serviceName: string) {
    try {
      const validation = await AdminSettingsService.validateAPIConfiguration(serviceName);
      return {
        service: serviceName,
        success: validation.valid,
        message: validation.message,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        service: serviceName,
        success: false,
        message: `Connection test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Emergency system validation
  static async validateEmergencyFeatures() {
    const emergencyFeatures = {
      smsAlerts: false,
      emailNotifications: false,
      realTimeChat: false,
      locationTracking: false,
      escalationProtocol: false,
      adminNotifications: false
    };

    try {
      // Check Twilio SMS capability
      const twilioEnabled = await storage.getSettingByKey('twilio_enabled');
      emergencyFeatures.smsAlerts = twilioEnabled?.value === 'true';

      // Check email notifications
      const emailEnabled = await storage.getSettingByKey('email_notifications_enabled');
      emergencyFeatures.emailNotifications = emailEnabled?.value === 'true';

      // Check real-time chat (WebRTC)
      const webrtcEnabled = await storage.getSettingByKey('webrtc_enabled');
      emergencyFeatures.realTimeChat = webrtcEnabled?.value === 'true';

      // Check GPS tracking
      const gpsEnabled = await storage.getSettingByKey('gps_tracking_enabled');
      emergencyFeatures.locationTracking = gpsEnabled?.value === 'true';

      // Check emergency broadcast
      const emergencyEnabled = await storage.getSettingByKey('emergency_broadcast_enabled');
      emergencyFeatures.escalationProtocol = emergencyEnabled?.value === 'true';

      // Check admin notifications
      const adminNotifEnabled = await storage.getSettingByKey('real_time_notifications');
      emergencyFeatures.adminNotifications = adminNotifEnabled?.value === 'true';

      const enabledCount = Object.values(emergencyFeatures).filter(Boolean).length;
      const totalFeatures = Object.keys(emergencyFeatures).length;
      
      return {
        features: emergencyFeatures,
        readinessScore: (enabledCount / totalFeatures) * 100,
        status: enabledCount >= 4 ? 'ready' : enabledCount >= 2 ? 'partial' : 'insufficient',
        recommendations: generateEmergencyRecommendations(emergencyFeatures)
      };
    } catch (error: any) {
      return {
        features: emergencyFeatures,
        readinessScore: 0,
        status: 'error',
        error: error.message,
        recommendations: ['Fix database connectivity issues before testing emergency features']
      };
    }
  }

  // Database connectivity and performance test
  static async testDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const testUser = await storage.getUserByUsername('admin');
      const connectTime = Date.now() - startTime;

      // Test settings retrieval
      const settingsStart = Date.now();
      const settings = await storage.getSettings();
      const settingsTime = Date.now() - settingsStart;

      // Test chat rooms
      const chatStart = Date.now();
      const chatRooms = await storage.getChatRooms();
      const chatTime = Date.now() - chatStart;

      return {
        status: 'healthy',
        connectivity: connectTime < 1000 ? 'excellent' : connectTime < 3000 ? 'good' : 'slow',
        performance: {
          userQuery: connectTime,
          settingsQuery: settingsTime,
          chatQuery: chatTime,
          averageResponseTime: (connectTime + settingsTime + chatTime) / 3
        },
        statistics: {
          totalSettings: Array.isArray(settings) ? settings.length : 0,
          totalChatRooms: Array.isArray(chatRooms) ? chatRooms.length : 0,
          adminUser: !!testUser
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        connectivity: 'failed',
        error: error.message,
        performance: null,
        statistics: null
      };
    }
  }
}

function generateEmergencyRecommendations(features: any): string[] {
  const recommendations = [];
  
  if (!features.smsAlerts) {
    recommendations.push('Configure Twilio SMS for emergency text alerts');
  }
  if (!features.emailNotifications) {
    recommendations.push('Set up SMTP email notifications for critical alerts');
  }
  if (!features.realTimeChat) {
    recommendations.push('Enable WebRTC for emergency video communication');
  }
  if (!features.locationTracking) {
    recommendations.push('Activate GPS tracking for observer safety monitoring');
  }
  if (!features.escalationProtocol) {
    recommendations.push('Enable emergency broadcast system for mass alerts');
  }
  if (!features.adminNotifications) {
    recommendations.push('Configure real-time admin notifications');
  }

  if (recommendations.length === 0) {
    recommendations.push('Emergency system fully configured and operational');
  }

  return recommendations;
}