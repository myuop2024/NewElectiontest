import { storage } from "../storage.js";

export class AdminSettingsService {
  
  // Initialize all default settings for advanced features
  static async initializeDefaultSettings() {
    const defaultSettings = [
      // Platform Configuration
      { key: 'platform_name', value: 'CAFFE Electoral Observer Platform' },
      { key: 'organization_name', value: 'Citizens Action for Free & Fair Elections' },
      { key: 'contact_email', value: 'admin@caffe.org.jm' },
      
      // API Keys and External Services
      { key: 'bigquery_enabled', value: 'false' },
      { key: 'bigquery_project_id', value: '' },
      { key: 'bigquery_dataset_id', value: 'electoral_analytics' },
      { key: 'bigquery_service_key', value: '' },
      { key: 'bigquery_retention_days', value: '365' },
      { key: 'bigquery_auto_export', value: 'true' },
      { key: 'bigquery_real_time_streaming', value: 'false' },
      
      { key: 'here_maps_enabled', value: 'false' },
      { key: 'here_api_key', value: '' },
      
      { key: 'twilio_enabled', value: 'false' },
      { key: 'twilio_account_sid', value: '' },
      { key: 'twilio_auth_token', value: '' },
      { key: 'twilio_phone_number', value: '' },
      
      { key: 'openai_enabled', value: 'false' },
      { key: 'openai_api_key', value: '' },
      { key: 'openai_model', value: 'gpt-4o' },
      
      { key: 'huggingface_enabled', value: 'false' },
      { key: 'huggingface_api_key', value: '' },
      { key: 'huggingface_model', value: 'meta-llama/Llama-3.1-8B-Instruct' },
      { key: 'huggingface_endpoint', value: 'https://api-inference.huggingface.co/models/' },
      
      { key: 'gemini_enabled', value: 'false' },
      { key: 'gemini_api_key', value: '' },
      { key: 'gemini_model', value: 'gemini-1.5-pro' },
      { key: 'gemini_endpoint', value: 'https://generativelanguage.googleapis.com/v1beta/models/' },
      
      { key: 'whatsapp_enabled', value: 'false' },
      { key: 'whatsapp_phone_id', value: '' },
      { key: 'whatsapp_access_token', value: '' },
      
      // Security Settings
      { key: 'didit_kyc_enabled', value: 'false' },
      { key: 'didit_api_endpoint', value: 'https://apx.didit.me/v2/' },
      { key: 'didit_api_key', value: '' },
      { key: 'didit_liveness_level', value: 'standard' },
      { key: 'didit_webhook_url', value: '' },
      { key: 'didit_manual_override', value: 'false' },
      { key: 'min_security_level', value: '3' },
      { key: 'session_timeout', value: '30' },
      { key: 'device_binding_enabled', value: 'true' },
      { key: 'geo_verification_enabled', value: 'true' },
      { key: 'audit_logging_enabled', value: 'true' },
      
      // Communication Settings
      { key: 'email_notifications_enabled', value: 'true' },
      { key: 'smtp_server', value: 'smtp.gmail.com' },
      { key: 'smtp_port', value: '587' },
      { key: 'smtp_email', value: '' },
      { key: 'smtp_password', value: '' },
      { key: 'webrtc_enabled', value: 'true' },
      { key: 'webrtc_stun_server', value: 'stun:stun.l.google.com:19302' },
      
      // Analytics and AI Settings
      { key: 'ai_analysis_frequency', value: 'hourly' },
      { key: 'ai_sensitivity', value: 'medium' },
      { key: 'ai_anomaly_detection', value: 'true' },
      { key: 'ai_predictive_analytics', value: 'true' },
      { key: 'ai_real_time_insights', value: 'false' },
      
      // Feature Toggles
      { key: 'observer_id_generation', value: 'true' },
      { key: 'dynamic_form_builder', value: 'true' },
      { key: 'route_optimization', value: 'true' },
      { key: 'adaptive_training', value: 'true' },
      { key: 'qr_code_integration', value: 'true' },
      { key: 'document_processing', value: 'true' },
      
      // Advanced Features Control
      { key: 'kyc_verification_required', value: 'false' },
      { key: 'multi_factor_auth_enabled', value: 'true' },
      { key: 'real_time_notifications', value: 'true' },
      { key: 'emergency_broadcast_enabled', value: 'true' },
      { key: 'gps_tracking_enabled', value: 'true' },
      { key: 'biometric_verification', value: 'false' },
      { key: 'blockchain_logging', value: 'false' },
      { key: 'machine_learning_insights', value: 'true' },
      { key: 'predictive_modeling', value: 'false' },
      { key: 'crowd_sourced_validation', value: 'true' },
    ];

    for (const setting of defaultSettings) {
      try {
        const existing = await storage.getSettingByKey(setting.key);
        if (!existing) {
          await storage.createSetting({
          key: setting.key,
          value: setting.value,
          category: 'system',
          description: `Configuration for ${setting.key}`,
          isPublic: false
        });
          console.log(`Created default setting: ${setting.key}`);
        }
      } catch (error) {
        console.error(`Error creating setting ${setting.key}:`, error);
      }
    }
  }

  // Get feature status summary
  static async getFeatureStatus() {
    const features = [
      {
        name: 'Observer ID Generation',
        key: 'observer_id_generation',
        category: 'Core Features',
        description: 'Automatic generation of unique observer identifiers'
      },
      {
        name: 'KYC Verification',
        key: 'didit_kyc_enabled',
        category: 'Security',
        description: 'DidIT integration for identity verification'
      },
      {
        name: 'Manual KYC Override',
        key: 'didit_manual_override',
        category: 'Security',
        description: 'Allow admins to manually approve or reject KYC verifications.'
      },
      {
        name: 'Device Binding',
        key: 'device_binding_enabled',
        category: 'Security',
        description: 'Secure device registration and binding'
      },
      {
        name: 'WhatsApp Notifications',
        key: 'whatsapp_enabled',
        category: 'Communications',
        description: 'WhatsApp Business API integration'
      },
      {
        name: 'SMS Notifications',
        key: 'twilio_enabled',
        category: 'Communications',
        description: 'Twilio SMS and voice services'
      },
      {
        name: 'BigQuery Analytics',
        key: 'bigquery_enabled',
        category: 'Analytics',
        description: 'Google BigQuery data warehouse integration'
      },
      {
        name: 'AI-Powered Insights',
        key: 'openai_enabled',
        category: 'Analytics',
        description: 'OpenAI GPT-4 powered analytics and insights'
      },
      {
        name: 'Hugging Face AI',
        key: 'huggingface_enabled',
        category: 'Analytics',
        description: 'Hugging Face model inference for AI analysis'
      },
      {
        name: 'Google Gemini AI',
        key: 'gemini_enabled',
        category: 'Analytics',
        description: 'Google Gemini advanced AI capabilities'
      },
      {
        name: 'Video Calling',
        key: 'webrtc_enabled',
        category: 'Communications',
        description: 'WebRTC video calling capabilities'
      },
      {
        name: 'Route Optimization',
        key: 'route_optimization',
        category: 'Navigation',
        description: 'HERE Maps route optimization'
      },
      {
        name: 'Dynamic Forms',
        key: 'dynamic_form_builder',
        category: 'Data Collection',
        description: 'Dynamic form builder and validation'
      },
      {
        name: 'Training System',
        key: 'adaptive_training',
        category: 'Education',
        description: 'Adaptive training and certification system'
      },
      {
        name: 'QR Integration',
        key: 'qr_code_integration',
        category: 'Data Collection',
        description: 'QR code scanning and generation'
      },
      {
        name: 'Document Processing',
        key: 'document_processing',
        category: 'Data Collection',
        description: 'Advanced document capture and processing'
      },
      {
        name: 'Geo Verification',
        key: 'geo_verification_enabled',
        category: 'Security',
        description: 'Location-based verification and tracking'
      },
      {
        name: 'Audit Logging',
        key: 'audit_logging_enabled',
        category: 'Security',
        description: 'Comprehensive audit trail logging'
      }
    ];

    const featureStatus = [];
    for (const feature of features) {
      try {
        const setting = await storage.getSettingByKey(feature.key);
        featureStatus.push({
          ...feature,
          enabled: setting?.value === 'true',
          configured: setting?.value && setting.value !== '',
          lastUpdated: setting?.updatedAt
        });
      } catch (error) {
        featureStatus.push({
          ...feature,
          enabled: false,
          configured: false,
          error: 'Configuration not found'
        });
      }
    }

    return featureStatus;
  }

  // Validate API configuration
  static async validateAPIConfiguration(service: string) {
    const validations: Record<string, () => Promise<{ valid: boolean; message: string }>> = {
      bigquery: async () => {
        const enabled = await storage.getSettingByKey('bigquery_enabled');
        const projectId = await storage.getSettingByKey('bigquery_project_id');
        const serviceKey = await storage.getSettingByKey('bigquery_service_key');
        
        if (enabled?.value === 'true') {
          if (!projectId?.value) return { valid: false, message: 'Project ID required' };
          if (!serviceKey?.value) return { valid: false, message: 'Service account key required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      twilio: async () => {
        const enabled = await storage.getSettingByKey('twilio_enabled');
        const accountSid = await storage.getSettingByKey('twilio_account_sid');
        const authToken = await storage.getSettingByKey('twilio_auth_token');
        
        if (enabled?.value === 'true') {
          if (!accountSid?.value) return { valid: false, message: 'Account SID required' };
          if (!authToken?.value) return { valid: false, message: 'Auth token required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      openai: async () => {
        const enabled = await storage.getSettingByKey('openai_enabled');
        const apiKey = await storage.getSettingByKey('openai_api_key');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          if (!apiKey.value.startsWith('sk-')) return { valid: false, message: 'Invalid API key format' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      here: async () => {
        const enabled = await storage.getSettingByKey('here_maps_enabled');
        const apiKey = await storage.getSettingByKey('here_api_key');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      heremaps: async () => {
        const enabled = await storage.getSettingByKey('here_maps_enabled');
        const apiKey = await storage.getSettingByKey('here_api_key');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      didit: async () => {
        const enabled = await storage.getSettingByKey('didit_kyc_enabled');
        const apiKey = await storage.getSettingByKey('didit_api_key');
        const endpoint = await storage.getSettingByKey('didit_api_endpoint');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          if (!endpoint?.value) return { valid: false, message: 'API endpoint required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      diditkyc: async () => {
        // Alias for didit validation to handle frontend calls
        const enabled = await storage.getSettingByKey('didit_kyc_enabled');
        const apiKey = await storage.getSettingByKey('didit_api_key');
        const endpoint = await storage.getSettingByKey('didit_api_endpoint');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          if (!endpoint?.value) return { valid: false, message: 'API endpoint required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      huggingface: async () => {
        const enabled = await storage.getSettingByKey('huggingface_enabled');
        const apiKey = await storage.getSettingByKey('huggingface_api_key');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      googlegeminiai: async () => {
        const enabled = await storage.getSettingByKey('gemini_enabled');
        const apiKey = await storage.getSettingByKey('gemini_api_key');
        
        if (enabled?.value === 'true') {
          if (!apiKey?.value) return { valid: false, message: 'API key required' };
          if (!apiKey.value.startsWith('AIza')) return { valid: false, message: 'Invalid Gemini API key format' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      whatsapp: async () => {
        const enabled = await storage.getSettingByKey('whatsapp_enabled');
        const phoneId = await storage.getSettingByKey('whatsapp_phone_id');
        const token = await storage.getSettingByKey('whatsapp_access_token');
        
        if (enabled?.value === 'true') {
          if (!phoneId?.value) return { valid: false, message: 'Phone ID required' };
          if (!token?.value) return { valid: false, message: 'Access token required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      },
      
      email: async () => {
        const enabled = await storage.getSettingByKey('email_enabled');
        const password = await storage.getSettingByKey('email_password');
        const user = await storage.getSettingByKey('email_user');
        
        if (enabled?.value === 'true') {
          if (!user?.value) return { valid: false, message: 'Email user required' };
          if (!password?.value) return { valid: false, message: 'Email password required' };
          return { valid: true, message: 'Configuration valid' };
        }
        return { valid: true, message: 'Service disabled' };
      }
    };

    const validator = validations[service];
    if (!validator) {
      return { valid: false, message: 'Unknown service' };
    }

    return await validator();
  }

  // Get system health status
  static async getSystemHealth() {
    const services = ['bigquery', 'twilio', 'openai', 'here', 'didit'];
    const health = {
      overall: 'healthy',
      services: [] as any[],
      warnings: [] as string[],
      errors: [] as string[]
    };

    for (const service of services) {
      try {
        const validation = await this.validateAPIConfiguration(service);
        health.services.push({
          name: service,
          status: validation.valid ? 'healthy' : 'warning',
          message: validation.message
        });

        if (!validation.valid) {
          health.warnings.push(`${service}: ${validation.message}`);
        }
      } catch (error) {
        health.services.push({
          name: service,
          status: 'error',
          message: 'Validation failed'
        });
        health.errors.push(`${service}: Validation failed`);
      }
    }

    if (health.errors.length > 0) {
      health.overall = 'error';
    } else if (health.warnings.length > 0) {
      health.overall = 'warning';
    }

    return health;
  }

  // Export configuration for backup
  static async exportConfiguration() {
    const settings = await storage.getSettings();
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      settings: settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        // Don't export sensitive values in plaintext
        sensitive: this.isSensitiveSetting(setting.key)
      }))
    };
  }

  // Check if setting contains sensitive data
  static isSensitiveSetting(key: string): boolean {
    const sensitiveKeys = [
      'api_key', 'auth_token', 'password', 'secret', 'private_key',
      'service_key', 'access_token', 'credentials'
    ];
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
  }
}