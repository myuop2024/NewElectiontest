import crypto from "crypto";
import QRCode from "qrcode";

export interface QRData {
  type: string;
  data: any;
  timestamp: string;
  signature?: string;
}

export function generateQRData(type: string, data: any): QRData {
  const timestamp = new Date().toISOString();
  const qrData: QRData = {
    type,
    data,
    timestamp
  };

  // Generate a simple signature (in production, use proper cryptographic signing)
  const dataString = JSON.stringify({ type, data, timestamp });
  qrData.signature = generateSignature(dataString);

  return qrData;
}

export function verifyQRData(qrData: QRData): boolean {
  try {
    const { signature, ...dataToVerify } = qrData;
    const dataString = JSON.stringify(dataToVerify);
    const expectedSignature = generateSignature(dataString);
    
    // Check signature
    if (signature !== expectedSignature) {
      return false;
    }

    // Check timestamp (valid for 24 hours)
    const qrTime = new Date(qrData.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - qrTime.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff <= 24;
  } catch (error) {
    return false;
  }
}

function generateSignature(data: string): string {
  // In production, use a proper secret key and stronger algorithm
  const secret = "caffe-electoral-observer-secret";
  return crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 16);
}

export function parseQRCode(qrString: string): QRData | null {
  try {
    const parsed = JSON.parse(qrString);
    
    // Validate required fields
    if (!parsed.type || !parsed.data || !parsed.timestamp) {
      return null;
    }

    return parsed as QRData;
  } catch (error) {
    return null;
  }
}

export function formatQRDataForDisplay(qrData: QRData): string {
  switch (qrData.type) {
    case 'observer_id':
      return `Observer ID: ${qrData.data.observerId}\nName: ${qrData.data.name}\nGenerated: ${new Date(qrData.timestamp).toLocaleString()}`;
    
    case 'station_info':
      return `Station: ${qrData.data.stationId}\nGenerated: ${new Date(qrData.timestamp).toLocaleString()}`;
    
    case 'custom':
      return `Custom Data: ${qrData.data.data}\nGenerated: ${new Date(qrData.timestamp).toLocaleString()}`;
    
    default:
      return JSON.stringify(qrData, null, 2);
  }
}

export function createQRCodeURL(data: QRData): string {
  // In production, you'd use a proper QR code generation library
  // This is a placeholder that creates a data URL
  const qrString = JSON.stringify(data);
  return `data:text/plain;base64,${btoa(qrString)}`;
}

export function validateObserverQR(qrData: QRData): {
  isValid: boolean;
  observerId?: string;
  name?: string;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (qrData.type !== 'observer_id') {
    errors.push('Invalid QR code type');
  }
  
  if (!qrData.data.observerId) {
    errors.push('Missing Observer ID');
  }
  
  if (!qrData.data.name) {
    errors.push('Missing observer name');
  }
  
  if (!verifyQRData(qrData)) {
    errors.push('Invalid signature or expired QR code');
  }
  
  return {
    isValid: errors.length === 0,
    observerId: qrData.data.observerId,
    name: qrData.data.name,
    errors
  };
}

export async function createQRCodeSVG(data: string): Promise<string> {
  try {
    return await QRCode.toString(data, {
      type: 'svg',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}
