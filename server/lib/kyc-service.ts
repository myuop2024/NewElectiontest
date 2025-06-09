import { SecurityService } from "./security.js";

export interface DidITVerificationRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationalId: string;
  documentType: string;
  documentImage: string; // Base64 encoded
  selfieImage: string; // Base64 encoded
}

export interface DidITVerificationResponse {
  verificationId: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence: number;
  matchScore: number;
  details: {
    documentVerified: boolean;
    faceMatch: boolean;
    livenessCheck: boolean;
    documentType: string;
    extractedData: any;
  };
}

export class KYCService {
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  // Get configuration from database settings
  private static async getConfiguration() {
    const { storage } = await import('../storage.js');
    const endpoint = await storage.getSettingByKey('didit_api_endpoint');
    const clientId = await storage.getSettingByKey('didit_client_id');
    const clientSecret = await storage.getSettingByKey('didit_client_secret');
    
    return {
      apiUrl: endpoint?.value || 'https://api.didit.me/v2/',
      clientId: clientId?.value,
      clientSecret: clientSecret?.value
    };
  }

  // Get OAuth access token
  private static async getAccessToken(): Promise<string> {
    const config = await this.getConfiguration();
    
    if (!config.clientId || !config.clientSecret) {
      throw new Error("DidIT client credentials not configured");
    }

    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${config.apiUrl}oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

      return this.accessToken!;
    } catch (error) {
      console.error('DidIT OAuth error:', error);
      throw new Error('Failed to obtain DidIT access token');
    }
  }

  // Automatic KYC verification using DidIT API
  static async verifyWithDidIT(request: DidITVerificationRequest): Promise<DidITVerificationResponse> {
    const config = await this.getConfiguration();
    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(`${config.apiUrl}verifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-API-Version': '2.0'
        },
        body: JSON.stringify({
          reference_id: request.nationalId,
          user: {
            first_name: request.firstName,
            last_name: request.lastName,
            date_of_birth: request.dateOfBirth
          },
          documents: [{
            type: request.documentType.toLowerCase(),
            front_image: request.documentImage,
            country: 'JM'
          }],
          biometric: {
            selfie_image: request.selfieImage,
            liveness_required: true
          },
          webhook_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/kyc/webhook`,
          metadata: {
            source: 'electoral_observer_app',
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`DidIT API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        verificationId: data.verification_id || data.id,
        status: data.status === 'completed' ? 'approved' : data.status === 'failed' ? 'rejected' : 'pending',
        confidence: data.confidence_score || 0,
        matchScore: data.similarity_score || 0,
        details: {
          documentVerified: data.document_verification?.status === 'passed' || false,
          faceMatch: data.face_verification?.status === 'passed' || false,
          livenessCheck: data.liveness_check?.status === 'passed' || false,
          documentType: data.document_type || request.documentType,
          extractedData: data.extracted_fields || {}
        }
      };
    } catch (error) {
      console.error('DidIT verification error:', error);
      throw new Error('KYC verification failed');
    }
  }

  // Manual verification for admin override
  static async manualVerification(userId: number, verifiedBy: number, approved: boolean, notes: string) {
    return {
      verificationId: SecurityService.generateSecureToken(16),
      status: approved ? 'approved' : 'rejected',
      confidence: approved ? 100 : 0,
      matchScore: approved ? 100 : 0,
      details: {
        documentVerified: approved,
        faceMatch: approved,
        livenessCheck: approved,
        documentType: 'manual',
        extractedData: { notes, verifiedBy, verificationDate: new Date().toISOString() }
      }
    };
  }

  // Check verification status
  static async checkVerificationStatus(verificationId: string): Promise<DidITVerificationResponse> {
    const config = await this.getConfiguration();
    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(`${config.apiUrl}verifications/${verificationId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Version': '2.0'
        }
      });

      if (!response.ok) {
        throw new Error(`DidIT API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        verificationId: data.id || data.verification_id,
        status: data.status === 'verified' ? 'approved' : data.status === 'failed' ? 'rejected' : 'pending',
        confidence: data.overall_score || data.confidence_score || 0,
        matchScore: data.biometric?.face_match_score || data.similarity_score || 0,
        details: {
          documentVerified: data.documents?.[0]?.verification_status === 'verified' || false,
          faceMatch: data.biometric?.face_match_result === 'match' || false,
          livenessCheck: data.biometric?.liveness_result === 'real' || false,
          documentType: data.documents?.[0]?.type || 'unknown',
          extractedData: data.documents?.[0]?.extracted_data || data.extracted_fields || {}
        }
      };
    } catch (error) {
      console.error('DidIT status check error:', error);
      throw new Error('Failed to check verification status');
    }
  }

  // Extract data from Jamaica National ID
  static extractJamaicaIDData(extractedData: any) {
    return {
      nationalId: extractedData.id_number,
      firstName: extractedData.first_name,
      lastName: extractedData.last_name,
      dateOfBirth: extractedData.date_of_birth,
      address: extractedData.address,
      parish: extractedData.parish,
      gender: extractedData.gender,
      expiryDate: extractedData.expiry_date
    };
  }

  // Validate extracted data against user input
  static validateExtractedData(userInput: any, extractedData: any): boolean {
    const tolerance = 0.8; // 80% match tolerance
    
    const firstNameMatch = this.calculateStringSimilarity(userInput.firstName, extractedData.first_name);
    const lastNameMatch = this.calculateStringSimilarity(userInput.lastName, extractedData.last_name);
    
    return firstNameMatch >= tolerance && lastNameMatch >= tolerance;
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}