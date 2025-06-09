import crypto from "crypto";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "caffe-electoral-observer-2024-secure-key";
const IV_LENGTH = 16;

export class SecurityService {
  
  // Generate unique 6-digit Observer ID
  static generateObserverId(): string {
    let observerId: string;
    do {
      // Generate a 6-digit number ensuring it doesn't start with 0
      observerId = Math.floor(100000 + Math.random() * 900000).toString();
    } while (observerId.length !== 6);
    
    return observerId;
  }

  // Military-grade encryption for sensitive data
  static encrypt(text: string): string {
    if (!text) return "";
    
    try {
      const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      return "";
    }
  }

  // Decrypt sensitive data
  static decrypt(encryptedText: string): string {
    if (!encryptedText) return "";
    
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("Decryption error:", error);
      return "";
    }
  }

  // Generate device fingerprint
  static generateDeviceFingerprint(userAgent: string, ipAddress: string, additionalData: any = {}): string {
    const deviceData = {
      userAgent,
      ipAddress,
      ...additionalData,
      timestamp: Date.now()
    };
    
    const fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(deviceData))
      .digest('hex');
      
    return fingerprint;
  }

  // Calculate risk level for security events
  static calculateRiskLevel(action: string, deviceFingerprint: string, knownDevice: boolean): string {
    if (!knownDevice) return "high";
    
    const sensitiveActions = ["login", "password_change", "data_export", "admin_access"];
    if (sensitiveActions.includes(action)) return "medium";
    
    return "low";
  }

  // Generate secure token for various purposes
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash password with salt
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  // Verify password
  static verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  // Validate TRN (Tax Registration Number) format
  static validateTRN(trn: string): boolean {
    // Jamaica TRN format: 9 digits
    const trnRegex = /^\d{9}$/;
    return trnRegex.test(trn);
  }

  // Generate audit trail hash
  static generateAuditHash(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data) + Date.now())
      .digest('hex');
  }
}