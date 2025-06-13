import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KYCService } from './kyc-service'; // Adjust path as needed

// Mock storage
const mockStorageGetSettingByKey = vi.fn();

vi.mock('../storage', () => ({
  storage: {
    getSettingByKey: mockStorageGetSettingByKey,
    // Mock other storage functions if KYCService starts using them directly
  },
}));

// Mock environment variables
const originalEnv = { ...process.env };

describe('KYCService', () => {
  beforeEach(() => {
    // Reset mocks and environment variables before each test
    mockStorageGetSettingByKey.mockReset();
    process.env = { ...originalEnv }; // Restore original env
  });

  afterEach(() => {
    process.env = originalEnv; // Cleanup env changes
  });

  describe('getConfiguration', () => {
    it('should return default values when no settings are in storage and no env vars', async () => {
      mockStorageGetSettingByKey.mockResolvedValue(null); // Simulate no settings in storage

      // Explicitly clear relevant env vars for this test
      delete process.env.DIDIT_API_ENDPOINT;
      delete process.env.DIDIT_CLIENT_ID;
      delete process.env.DIDIT_CLIENT_SECRET;
      delete process.env.DIDIT_API_KEY;

      const config = await (KYCService as any).getConfiguration(); // Access private method for testing

      expect(config.apiUrl).toBe('https://apx.didit.me/v2/');
      expect(config.clientId).toBeUndefined(); // Or specific default if defined for clientId
      expect(config.clientSecret).toBeUndefined(); // Or specific default
      expect(config.apiKey).toBeUndefined(); // Or specific default
      expect(config.livenessMode).toBe('console_default');
      expect(config.livenessLevel).toBe('standard');
      expect(config.amlCheckEnabled).toBe('false');
      expect(config.amlSensitivity).toBe('medium');
      expect(config.ageEstimationEnabled).toBe('false');
      expect(config.proofOfAddressEnabled).toBe('false');
    });

    it('should return values from storage when available', async () => {
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        const settings: Record<string, { value: string }> = {
          'didit_api_endpoint': { value: 'https://custom.endpoint.com/api/' },
          'didit_client_id': { value: 'test_client_id' },
          'didit_client_secret': { value: 'test_client_secret' },
          'didit_liveness_mode': { value: 'passive' },
          'didit_liveness_level': { value: 'high' },
          'didit_aml_check_enabled': { value: 'true' },
          'didit_aml_sensitivity': { value: 'high' },
          'didit_age_estimation_enabled': { value: 'true' },
          'didit_proof_of_address_enabled': { value: 'true' },
        };
        return settings[key] || null;
      });
      process.env.DIDIT_API_KEY = 'env_api_key'; // API key from env

      const config = await (KYCService as any).getConfiguration();

      expect(config.apiUrl).toBe('https://custom.endpoint.com/api/');
      expect(config.clientId).toBe('test_client_id');
      expect(config.clientSecret).toBe('test_client_secret');
      expect(config.apiKey).toBe('env_api_key');
      expect(config.livenessMode).toBe('passive');
      expect(config.livenessLevel).toBe('high');
      expect(config.amlCheckEnabled).toBe('true');
      expect(config.amlSensitivity).toBe('high');
      expect(config.ageEstimationEnabled).toBe('true');
      expect(config.proofOfAddressEnabled).toBe('true');
    });

    it('should prioritize environment variables for core API settings', async () => {
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        // Simulate some values in storage
        if (key === 'didit_api_endpoint') return { value: 'storage_endpoint' };
        return null;
      });
      process.env.DIDIT_API_ENDPOINT = 'env_endpoint';
      process.env.DIDIT_CLIENT_ID = 'env_client_id';
      process.env.DIDIT_CLIENT_SECRET = 'env_client_secret';
      process.env.DIDIT_API_KEY = 'env_api_key';

      const config = await (KYCService as any).getConfiguration();

      expect(config.apiUrl).toBe('env_endpoint'); // Env var should override storage for this
      expect(config.clientId).toBe('env_client_id');
      expect(config.clientSecret).toBe('env_client_secret');
      expect(config.apiKey).toBe('env_api_key');
      // New settings should still come from storage or their defaults
      expect(config.livenessMode).toBe('console_default');
    });
  });

  describe('verifyWithDidIT', () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;

      // Default mock for storage.getSettingByKey to return basic enabled KYC
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_kyc_enabled') return { value: 'true' };
        if (key === 'didit_api_key') return { value: 'test_api_key' }; // getApiKey needs this
        if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        // Return defaults for new settings unless overridden in a specific test
        if (key === 'didit_liveness_mode') return { value: 'console_default' };
        if (key === 'didit_liveness_level') return { value: 'standard' };
        if (key === 'didit_aml_check_enabled') return { value: 'false' };
        if (key === 'didit_aml_sensitivity') return { value: 'medium' };
        if (key === 'didit_age_estimation_enabled') return { value: 'false' };
        if (key === 'didit_proof_of_address_enabled') return { value: 'false' };
        return null;
      });
      process.env.DIDIT_API_KEY = 'test_api_key'; // Ensure API key is available via env as per getApiKey logic
    });

    const baseRequest: DidITVerificationRequest = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      nationalId: '123456789',
      documentType: 'passport',
      documentImage: 'base64docimage',
      selfieImage: 'base64selfieimage',
    };

    it('should construct basic payload correctly', async () => {
      mockFetch.mockResolvedValueOnce({ // For status check
        ok: true,
        json: async () => ({ status: 'ok' }),
      }).mockResolvedValueOnce({ // For identity/verify
        ok: true,
        json: async () => ({ verification_id: 'v123', status: 'pending' }),
      });

      await KYCService.verifyWithDidIT(baseRequest);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const verifyCall = mockFetch.mock.calls[1];
      expect(verifyCall[0]).toBe('https://apx.didit.me/v2/identity/verify');
      const payload = JSON.parse(verifyCall[1].body);

      expect(payload.biometric.liveness_required).toBe(true); // console_default means liveness is on
      expect(payload.aml).toBeUndefined();
      expect(payload.age_estimation).toBeUndefined();
      expect(payload.proof_of_address).toBeUndefined();
    });

    it('should disable liveness if liveness_mode is "none"', async () => {
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_liveness_mode') return { value: 'none' };
        if (key === 'didit_api_key') return { value: 'test_api_key' };
        if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        return null;
      });
       mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
               .mockResolvedValueOnce({ ok: true, json: async () => ({ verification_id: 'v123', status: 'pending' }) });

      await KYCService.verifyWithDidIT(baseRequest);
      const payload = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(payload.biometric.liveness_required).toBe(false);
    });

    it('should include liveness mode and level if specified and not console_default', async () => {
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_liveness_mode') return { value: 'passive' };
        if (key === 'didit_liveness_level') return { value: 'high' };
        if (key === 'didit_api_key') return { value: 'test_api_key' };
        if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        return null;
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
              .mockResolvedValueOnce({ ok: true, json: async () => ({ verification_id: 'v123', status: 'pending' }) });

      await KYCService.verifyWithDidIT(baseRequest);
      const payload = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(payload.biometric.liveness_required).toBe(true);
      expect(payload.biometric.mode).toBe('passive');
      expect(payload.biometric.level).toBe('high');
    });

    it('should include AML check in payload if amlCheckEnabled is true', async () => {
       mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_aml_check_enabled') return { value: 'true' };
        if (key === 'didit_aml_sensitivity') return { value: 'high' };
         if (key === 'didit_api_key') return { value: 'test_api_key' };
         if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        return null;
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
              .mockResolvedValueOnce({ ok: true, json: async () => ({ verification_id: 'v123', status: 'pending' }) });

      await KYCService.verifyWithDidIT(baseRequest);
      const payload = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(payload.aml).toEqual({ required: true, sensitivity: 'high' });
    });

    it('should include age estimation if ageEstimationEnabled is true', async () => {
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_age_estimation_enabled') return { value: 'true' };
        if (key === 'didit_api_key') return { value: 'test_api_key' };
        if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        return null;
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
              .mockResolvedValueOnce({ ok: true, json: async () => ({ verification_id: 'v123', status: 'pending' }) });

      await KYCService.verifyWithDidIT(baseRequest);
      const payload = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(payload.age_estimation).toEqual({ required: true });
    });

    it('should include proof of address if proofOfAddressEnabled is true', async () => {
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_proof_of_address_enabled') return { value: 'true' };
        if (key === 'didit_api_key') return { value: 'test_api_key' };
        if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        return null;
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
              .mockResolvedValueOnce({ ok: true, json: async () => ({ verification_id: 'v123', status: 'pending' }) });

      await KYCService.verifyWithDidIT(baseRequest);
      const payload = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(payload.proof_of_address).toEqual({ required: true });
    });

    it('should handle API response and parse new fields correctly', async () => {
      const mockDiditResponse = {
        verification_id: 'v789',
        status: 'completed',
        confidence_score: 95,
        similarity_score: 92,
        document_verification: { status: 'passed' },
        face_verification: { status: 'passed' },
        liveness_check: { status: 'passed' },
        document_type: 'passport',
        extracted_fields: { name: 'John Doe' },
        aml_check: { status: 'clear', details: { risk_score: 5 } },
        age_estimation_result: { age: 30, confidence: 0.9 },
        proof_of_address: { status: 'verified', source: 'utility_bill' }
      };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
              .mockResolvedValueOnce({ ok: true, json: async () => mockDiditResponse });

      const result = await KYCService.verifyWithDidIT(baseRequest);

      expect(result.verificationId).toBe('v789');
      expect(result.status).toBe('approved');
      expect(result.details.amlStatus).toBe('clear');
      expect(result.details.amlDetails).toEqual({ risk_score: 5 });
      expect(result.details.ageEstimation).toEqual({ age: 30, confidence: 0.9 });
      expect(result.details.proofOfAddressStatus).toBe('verified');
    });
     it('should handle API response with missing new fields gracefully', async () => {
      const mockDiditResponse = { // Response without new fields
        verification_id: 'v789',
        status: 'completed',
        // ... other existing fields
      };
       mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
               .mockResolvedValueOnce({ ok: true, json: async () => mockDiditResponse });

      const result = await KYCService.verifyWithDidIT(baseRequest);

      expect(result.details.amlStatus).toBeNull();
      expect(result.details.amlDetails).toBeNull();
      expect(result.details.ageEstimation).toBeNull();
      expect(result.details.proofOfAddressStatus).toBeNull();
    });
  });

  describe('checkVerificationStatus', () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      process.env.DIDIT_API_KEY = 'test_api_key'; // Ensure API key is available
      mockStorageGetSettingByKey.mockImplementation(async (key: string) => {
        if (key === 'didit_api_endpoint') return { value: 'https://apx.didit.me/v2/' };
        if (key === 'didit_api_key') return { value: 'test_api_key_from_storage_not_used_if_env_present' };
        return null;
      });
    });

    it('should parse new fields correctly from status check response', async () => {
      const mockDiditStatusResponse = {
        id: 'v456',
        status: 'verified', // maps to 'approved'
        overall_score: 90,
        biometric: { face_match_score: 91, liveness_result: 'real' },
        documents: [{ verification_status: 'verified', type: 'id_card', extracted_data: { name: 'Jane Doe' } }],
        aml_check: { status: 'hit', details: { reason: 'sanctions list' } },
        age_estimation_result: { age: 25, confidence: 0.85 },
        proof_of_address: { status: 'pending' }
      };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockDiditStatusResponse });

      const result = await KYCService.checkVerificationStatus('v456');

      expect(result.verificationId).toBe('v456');
      expect(result.status).toBe('approved');
      expect(result.details.amlStatus).toBe('hit');
      expect(result.details.amlDetails).toEqual({ reason: 'sanctions list' });
      expect(result.details.ageEstimation).toEqual({ age: 25, confidence: 0.85 });
      expect(result.details.proofOfAddressStatus).toBe('pending');
    });

    it('should handle missing new fields gracefully in status check response', async () => {
      const mockDiditStatusResponse = { // Response without new fields
        id: 'v456',
        status: 'pending',
        // ... other existing fields
      };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockDiditStatusResponse });

      const result = await KYCService.checkVerificationStatus('v456');

      expect(result.details.amlStatus).toBeNull();
      expect(result.details.amlDetails).toBeNull();
      expect(result.details.ageEstimation).toBeNull();
      expect(result.details.proofOfAddressStatus).toBeNull();
    });
  });
});
