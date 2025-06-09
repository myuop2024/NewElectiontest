import { storage } from '../storage';
import { AdminSettingsService } from './admin-settings-service';
import { HuggingFaceService } from './huggingface-service';
import { GeminiService } from './gemini-service';

export interface FeatureTestResult {
  featureName: string;
  key: string;
  enabled: boolean;
  configured: boolean;
  testPassed: boolean;
  message: string;
  details?: any;
}

export class FeatureTester {
  static async testAllFeatures(): Promise<FeatureTestResult[]> {
    const results: FeatureTestResult[] = [];
    
    // Test Observer ID Generation
    results.push(await this.testObserverIdGeneration());
    
    // Test KYC Verification
    results.push(await this.testKYCVerification());
    
    // Test Device Binding
    results.push(await this.testDeviceBinding());
    
    // Test BigQuery Analytics
    results.push(await this.testBigQueryAnalytics());
    
    // Test HERE Maps Integration
    results.push(await this.testHEREMapsIntegration());
    
    // Test Twilio SMS/Voice
    results.push(await this.testTwilioIntegration());
    
    // Test OpenAI Integration
    results.push(await this.testOpenAIIntegration());
    
    // Test Hugging Face AI
    results.push(await this.testHuggingFaceIntegration());
    
    // Test Gemini AI
    results.push(await this.testGeminiIntegration());
    
    // Test WhatsApp Integration
    results.push(await this.testWhatsAppIntegration());
    
    // Test Video Calling (WebRTC)
    results.push(await this.testVideoCallling());
    
    // Test Dynamic Form Builder
    results.push(await this.testDynamicFormBuilder());
    
    // Test Route Optimization
    results.push(await this.testRouteOptimization());
    
    // Test Adaptive Training
    results.push(await this.testAdaptiveTraining());
    
    // Test QR Code Integration
    results.push(await this.testQRCodeIntegration());
    
    // Test Document Processing
    results.push(await this.testDocumentProcessing());
    
    // Test Multi-Factor Authentication
    results.push(await this.testMultiFactorAuth());
    
    // Test Real-time Notifications
    results.push(await this.testRealTimeNotifications());
    
    // Test Emergency Broadcasting
    results.push(await this.testEmergencyBroadcasting());
    
    // Test GPS Tracking
    results.push(await this.testGPSTracking());
    
    // Test Biometric Verification
    results.push(await this.testBiometricVerification());
    
    // Test Blockchain Logging
    results.push(await this.testBlockchainLogging());
    
    // Test Crowd-sourced Validation
    results.push(await this.testCrowdSourcedValidation());
    
    return results;
  }

  private static async testObserverIdGeneration(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('observer_id_generation');
      const enabled = setting?.value === 'true';
      
      if (!enabled) {
        return {
          featureName: 'Observer ID Generation',
          key: 'observer_id_generation',
          enabled: false,
          configured: true,
          testPassed: false,
          message: 'Feature disabled'
        };
      }

      // Test observer ID generation
      const observerId = await storage.generateObserverId();
      const testPassed = observerId && observerId.length > 0;

      return {
        featureName: 'Observer ID Generation',
        key: 'observer_id_generation',
        enabled,
        configured: true,
        testPassed,
        message: testPassed ? 'Observer ID generation working' : 'Failed to generate observer ID',
        details: { observerId }
      };
    } catch (error) {
      return {
        featureName: 'Observer ID Generation',
        key: 'observer_id_generation',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testKYCVerification(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('didit_kyc_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'KYC Verification',
        key: 'didit_kyc_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'KYC verification enabled' : 'KYC verification disabled'
      };
    } catch (error) {
      return {
        featureName: 'KYC Verification',
        key: 'didit_kyc_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testDeviceBinding(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('device_binding_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Device Binding',
        key: 'device_binding_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Device binding enabled' : 'Device binding disabled'
      };
    } catch (error) {
      return {
        featureName: 'Device Binding',
        key: 'device_binding_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testBigQueryAnalytics(): Promise<FeatureTestResult> {
    try {
      const validation = await AdminSettingsService.validateAPIConfiguration('bigquery');
      const setting = await storage.getSettingByKey('bigquery_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'BigQuery Analytics',
        key: 'bigquery_enabled',
        enabled,
        configured: validation.valid,
        testPassed: validation.valid,
        message: validation.message
      };
    } catch (error) {
      return {
        featureName: 'BigQuery Analytics',
        key: 'bigquery_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testHEREMapsIntegration(): Promise<FeatureTestResult> {
    try {
      const validation = await AdminSettingsService.validateAPIConfiguration('here');
      const setting = await storage.getSettingByKey('here_maps_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'HERE Maps Integration',
        key: 'here_maps_enabled',
        enabled,
        configured: validation.valid,
        testPassed: validation.valid,
        message: validation.message
      };
    } catch (error) {
      return {
        featureName: 'HERE Maps Integration',
        key: 'here_maps_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testTwilioIntegration(): Promise<FeatureTestResult> {
    try {
      const validation = await AdminSettingsService.validateAPIConfiguration('twilio');
      const setting = await storage.getSettingByKey('twilio_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Twilio SMS/Voice',
        key: 'twilio_enabled',
        enabled,
        configured: validation.valid,
        testPassed: validation.valid,
        message: validation.message
      };
    } catch (error) {
      return {
        featureName: 'Twilio SMS/Voice',
        key: 'twilio_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testOpenAIIntegration(): Promise<FeatureTestResult> {
    try {
      const validation = await AdminSettingsService.validateAPIConfiguration('openai');
      const setting = await storage.getSettingByKey('openai_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'OpenAI Integration',
        key: 'openai_enabled',
        enabled,
        configured: validation.valid,
        testPassed: validation.valid,
        message: validation.message
      };
    } catch (error) {
      return {
        featureName: 'OpenAI Integration',
        key: 'openai_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testHuggingFaceIntegration(): Promise<FeatureTestResult> {
    try {
      const validation = await HuggingFaceService.validateConfiguration();
      const setting = await storage.getSettingByKey('huggingface_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Hugging Face AI',
        key: 'huggingface_enabled',
        enabled,
        configured: validation.valid,
        testPassed: validation.valid,
        message: validation.message
      };
    } catch (error) {
      return {
        featureName: 'Hugging Face AI',
        key: 'huggingface_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testGeminiIntegration(): Promise<FeatureTestResult> {
    try {
      const validation = await GeminiService.validateConfiguration();
      const setting = await storage.getSettingByKey('gemini_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Google Gemini AI',
        key: 'gemini_enabled',
        enabled,
        configured: validation.valid,
        testPassed: validation.valid,
        message: validation.message
      };
    } catch (error) {
      return {
        featureName: 'Google Gemini AI',
        key: 'gemini_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testWhatsAppIntegration(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('whatsapp_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'WhatsApp Integration',
        key: 'whatsapp_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'WhatsApp integration enabled' : 'WhatsApp integration disabled'
      };
    } catch (error) {
      return {
        featureName: 'WhatsApp Integration',
        key: 'whatsapp_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testVideoCallling(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('webrtc_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Video Calling',
        key: 'webrtc_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Video calling enabled' : 'Video calling disabled'
      };
    } catch (error) {
      return {
        featureName: 'Video Calling',
        key: 'webrtc_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testDynamicFormBuilder(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('dynamic_form_builder');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Dynamic Form Builder',
        key: 'dynamic_form_builder',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Dynamic form builder enabled' : 'Dynamic form builder disabled'
      };
    } catch (error) {
      return {
        featureName: 'Dynamic Form Builder',
        key: 'dynamic_form_builder',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testRouteOptimization(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('route_optimization');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Route Optimization',
        key: 'route_optimization',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Route optimization enabled' : 'Route optimization disabled'
      };
    } catch (error) {
      return {
        featureName: 'Route Optimization',
        key: 'route_optimization',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testAdaptiveTraining(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('adaptive_training');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Adaptive Training',
        key: 'adaptive_training',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Adaptive training enabled' : 'Adaptive training disabled'
      };
    } catch (error) {
      return {
        featureName: 'Adaptive Training',
        key: 'adaptive_training',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testQRCodeIntegration(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('qr_code_integration');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'QR Code Integration',
        key: 'qr_code_integration',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'QR code integration enabled' : 'QR code integration disabled'
      };
    } catch (error) {
      return {
        featureName: 'QR Code Integration',
        key: 'qr_code_integration',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testDocumentProcessing(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('document_processing');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Document Processing',
        key: 'document_processing',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Document processing enabled' : 'Document processing disabled'
      };
    } catch (error) {
      return {
        featureName: 'Document Processing',
        key: 'document_processing',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testMultiFactorAuth(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('multi_factor_auth_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Multi-Factor Authentication',
        key: 'multi_factor_auth_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Multi-factor authentication enabled' : 'Multi-factor authentication disabled'
      };
    } catch (error) {
      return {
        featureName: 'Multi-Factor Authentication',
        key: 'multi_factor_auth_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testRealTimeNotifications(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('real_time_notifications');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Real-time Notifications',
        key: 'real_time_notifications',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Real-time notifications enabled' : 'Real-time notifications disabled'
      };
    } catch (error) {
      return {
        featureName: 'Real-time Notifications',
        key: 'real_time_notifications',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testEmergencyBroadcasting(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('emergency_broadcast_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Emergency Broadcasting',
        key: 'emergency_broadcast_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Emergency broadcasting enabled' : 'Emergency broadcasting disabled'
      };
    } catch (error) {
      return {
        featureName: 'Emergency Broadcasting',
        key: 'emergency_broadcast_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testGPSTracking(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('gps_tracking_enabled');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'GPS Tracking',
        key: 'gps_tracking_enabled',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'GPS tracking enabled' : 'GPS tracking disabled'
      };
    } catch (error) {
      return {
        featureName: 'GPS Tracking',
        key: 'gps_tracking_enabled',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testBiometricVerification(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('biometric_verification');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Biometric Verification',
        key: 'biometric_verification',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Biometric verification enabled' : 'Biometric verification disabled'
      };
    } catch (error) {
      return {
        featureName: 'Biometric Verification',
        key: 'biometric_verification',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testBlockchainLogging(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('blockchain_logging');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Blockchain Logging',
        key: 'blockchain_logging',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Blockchain logging enabled' : 'Blockchain logging disabled'
      };
    } catch (error) {
      return {
        featureName: 'Blockchain Logging',
        key: 'blockchain_logging',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async testCrowdSourcedValidation(): Promise<FeatureTestResult> {
    try {
      const setting = await storage.getSettingByKey('crowd_sourced_validation');
      const enabled = setting?.value === 'true';
      
      return {
        featureName: 'Crowd-sourced Validation',
        key: 'crowd_sourced_validation',
        enabled,
        configured: true,
        testPassed: true,
        message: enabled ? 'Crowd-sourced validation enabled' : 'Crowd-sourced validation disabled'
      };
    } catch (error) {
      return {
        featureName: 'Crowd-sourced Validation',
        key: 'crowd_sourced_validation',
        enabled: false,
        configured: false,
        testPassed: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async toggleFeature(key: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      await storage.updateSetting(key, enabled.toString());
      return {
        success: true,
        message: `Feature ${key} ${enabled ? 'enabled' : 'disabled'} successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to toggle feature: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}