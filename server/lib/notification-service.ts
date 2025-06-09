import nodemailer from 'nodemailer';
import twilio from 'twilio';

export interface NotificationRequest {
  userId?: number;
  type: 'sms' | 'whatsapp' | 'email' | 'push';
  recipient: string;
  title?: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  templateId?: number;
  variables?: Record<string, any>;
  scheduledFor?: Date;
}

export interface NotificationResponse {
  id: string;
  status: 'sent' | 'pending' | 'failed' | 'scheduled';
  provider?: string;
  cost?: number;
  deliveredAt?: Date;
  error?: string;
}

export class NotificationService {
  private static twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  private static emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Send SMS notification
  static async sendSMS(request: NotificationRequest): Promise<NotificationResponse> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: request.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: request.recipient
      });

      return {
        id: message.sid,
        status: 'sent',
        provider: 'twilio',
        cost: parseFloat(message.price || '0')
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send WhatsApp message
  static async sendWhatsApp(request: NotificationRequest): Promise<NotificationResponse> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: request.message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${request.recipient}`
      });

      return {
        id: message.sid,
        status: 'sent',
        provider: 'twilio_whatsapp',
        cost: parseFloat(message.price || '0')
      };
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send email notification
  static async sendEmail(request: NotificationRequest): Promise<NotificationResponse> {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email credentials not configured");
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: request.recipient,
        subject: request.title || 'CAFFE Electoral Observer Notification',
        text: request.message,
        html: `<p>${request.message}</p>`
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      return {
        id: info.messageId,
        status: 'sent',
        provider: 'gmail'
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send notification with fallback mechanism
  static async sendNotificationWithFallback(request: NotificationRequest): Promise<NotificationResponse[]> {
    const results: NotificationResponse[] = [];
    
    // Primary: Try WhatsApp first if enabled
    if (request.type === 'whatsapp') {
      const whatsappResult = await this.sendWhatsApp(request);
      results.push(whatsappResult);
      
      if (whatsappResult.status === 'sent') {
        return results;
      }
    }

    // Fallback: SMS if WhatsApp fails
    if (request.type === 'whatsapp' || request.type === 'sms') {
      const smsResult = await this.sendSMS({
        ...request,
        message: `[CAFFE Alert] ${request.message}`
      });
      results.push(smsResult);
      
      if (smsResult.status === 'sent') {
        return results;
      }
    }

    // Final fallback: Email
    const emailResult = await this.sendEmail(request);
    results.push(emailResult);
    
    return results;
  }

  // Send bulk notifications
  static async sendBulkNotifications(requests: NotificationRequest[]): Promise<NotificationResponse[]> {
    const results: NotificationResponse[] = [];
    
    for (const request of requests) {
      try {
        let result: NotificationResponse;
        
        switch (request.type) {
          case 'sms':
            result = await this.sendSMS(request);
            break;
          case 'whatsapp':
            result = await this.sendWhatsApp(request);
            break;
          case 'email':
            result = await this.sendEmail(request);
            break;
          default:
            result = {
              id: '',
              status: 'failed',
              error: 'Unsupported notification type'
            };
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          id: '',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Emergency broadcast system
  static async sendEmergencyBroadcast(message: string, recipients: string[]): Promise<NotificationResponse[]> {
    const emergencyRequests: NotificationRequest[] = recipients.map(recipient => ({
      type: 'sms',
      recipient,
      message: `🚨 EMERGENCY: ${message}`,
      priority: 'urgent'
    }));

    return this.sendBulkNotifications(emergencyRequests);
  }

  // Validate phone number format
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Jamaica phone number validation (+1876XXXXXXX or 876XXXXXXX)
    const jamaicaPhoneRegex = /^(\+1)?876\d{7}$/;
    return jamaicaPhoneRegex.test(phoneNumber.replace(/\s|-/g, ''));
  }

  // Format phone number for Jamaica
  static formatJamaicaPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('1876') && cleaned.length === 11) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('876') && cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 7) {
      return `+1876${cleaned}`;
    }
    
    return phoneNumber; // Return original if format is unclear
  }
}