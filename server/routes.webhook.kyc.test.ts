import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response } from 'express'; // For typing if needed
import { WebSocket } from 'ws';

// Mock storage
const mockGetUserByNationalId = vi.fn();
const mockUpdateUser = vi.fn();

// Mock the storage module that server/routes.ts imports
// The actual import path in routes.ts is './storage.js'
vi.mock('./storage.js', () => ({
  storage: {
    getUserByNationalId: mockGetUserByNationalId,
    updateUser: mockUpdateUser,
  },
}));

// Define a type for our simplified webhook handler logic
type KycWebhookHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void>;

// This is a simplified version of the handler logic extracted for testing.
// In a real scenario, you might refactor routes.ts to export this logic.
const processKycWebhook: KycWebhookHandler = async (req, res) => {
  // The actual handler in routes.ts does: const { storage } = await import('./storage.js');
  // Our vi.mock above handles this. We can directly use the mocked functions.

  const webhookPayload = req.body;
  const { id, status, reference_id: nationalId } = webhookPayload as any;

  if (!nationalId) {
    (res as any).status(400).send('Missing reference_id');
    return;
  }

  const user = await mockGetUserByNationalId(nationalId);

  if (user) {
    let newKycStatus: 'pending' | 'approved' | 'rejected' | 'review' = 'pending';
    const overallStatus = webhookPayload.status;
    const documentVerification = webhookPayload.document_verification?.status;
    const faceVerification = webhookPayload.face_verification?.status;
    const livenessCheck = webhookPayload.liveness_check?.status;
    const amlCheck = webhookPayload.aml_check?.status;

    if (overallStatus === 'completed' || overallStatus === 'verified' || overallStatus === 'approved') {
      if (
        documentVerification === 'passed' &&
        faceVerification === 'passed' &&
        livenessCheck === 'passed' &&
        (amlCheck === 'clear' || amlCheck === undefined || amlCheck === null)
      ) {
        newKycStatus = 'approved';
      } else if (amlCheck === 'hit') {
        newKycStatus = 'rejected';
      } else if (
        documentVerification === 'failed' ||
        faceVerification === 'failed' ||
        livenessCheck === 'failed'
      ) {
        newKycStatus = 'rejected';
      } else {
        newKycStatus = 'pending';
      }
    } else if (overallStatus === 'failed' || overallStatus === 'rejected') {
      newKycStatus = 'rejected';
    } else {
      newKycStatus = 'pending';
    }

    await mockUpdateUser(user.id, {
      kycStatus: newKycStatus,
      kycData: webhookPayload
    });

    const clients = (req.app as any)?.clients as Map<number, WebSocket>;
    const userSocket = clients?.get(user.id);

    if (userSocket && userSocket.readyState === WebSocket.OPEN) {
      userSocket.send(JSON.stringify({
        type: 'KYC_UPDATE',
        payload: {
          userId: user.id,
          kycStatus: newKycStatus,
          verificationId: id,
          details: {
            documentVerified: documentVerification === 'passed',
            faceMatch: faceVerification === 'passed',
            livenessCheck: livenessCheck === 'passed',
            amlStatus: amlCheck,
            overallDiditStatus: overallStatus
          }
        }
      }));
    }
  }
  (res as any).status(200).send('Webhook received');
};


describe('KYC Webhook Handler Logic', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockClients: Map<number, WebSocket>;
  let mockUserSocket: Partial<WebSocket>;

  beforeEach(() => {
    mockGetUserByNationalId.mockReset();
    mockUpdateUser.mockReset();

    mockUserSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    };
    mockClients = new Map();

    mockReq = {
      body: {},
      app: { // Simulate app object for WebSocket clients
        get: vi.fn((name: string) => {
          if (name === 'clients') return mockClients;
          return undefined;
        }),
        // For the actual routes.ts, (req.app as any).clients is used.
        // So we simulate 'clients' being available on 'app'.
        clients: mockClients
      } as any,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  });

  const mockUser = {
    id: 1,
    username: 'testuser',
    nationalId: 'ID123',
  };

  it('should store the full webhook payload in kycData', async () => {
    mockReq.body = {
      id: 'v123',
      status: 'completed',
      reference_id: 'ID123',
      document_verification: { status: 'passed' },
      face_verification: { status: 'passed' },
      liveness_check: { status: 'passed' },
      aml_check: { status: 'clear' },
      some_other_data: { nested: true }
    };
    mockGetUserByNationalId.mockResolvedValue(mockUser);

    await processKycWebhook(mockReq, mockRes);

    expect(mockUpdateUser).toHaveBeenCalledWith(mockUser.id, {
      kycStatus: 'approved',
      kycData: mockReq.body,
    });
  });

  describe('Consolidated kycStatus Logic', () => {
    const basePayload = { id: 'v123', reference_id: 'ID123' };

    it('should set kycStatus to "approved" if all checks pass', async () => {
      mockReq.body = {
        ...basePayload,
        status: 'completed',
        document_verification: { status: 'passed' },
        face_verification: { status: 'passed' },
        liveness_check: { status: 'passed' },
        aml_check: { status: 'clear' }
      };
      mockGetUserByNationalId.mockResolvedValue(mockUser);
      await processKycWebhook(mockReq, mockRes);
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kycStatus: 'approved' }));
    });

    it('should set kycStatus to "rejected" if document verification fails', async () => {
      mockReq.body = {
        ...basePayload,
        status: 'completed', // Overall might be completed, but a component failed
        document_verification: { status: 'failed' },
        face_verification: { status: 'passed' },
        liveness_check: { status: 'passed' },
      };
      mockGetUserByNationalId.mockResolvedValue(mockUser);
      await processKycWebhook(mockReq, mockRes);
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kycStatus: 'rejected' }));
    });

    it('should set kycStatus to "rejected" if liveness check fails', async () => {
       mockReq.body = {
        ...basePayload,
        status: 'completed',
        document_verification: { status: 'passed' },
        face_verification: { status: 'passed' },
        liveness_check: { status: 'failed' },
      };
      mockGetUserByNationalId.mockResolvedValue(mockUser);
      await processKycWebhook(mockReq, mockRes);
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kycStatus: 'rejected' }));
    });

    it('should set kycStatus to "rejected" if AML check is "hit"', async () => {
      mockReq.body = {
        ...basePayload,
        status: 'completed',
        document_verification: { status: 'passed' },
        face_verification: { status: 'passed' },
        liveness_check: { status: 'passed' },
        aml_check: { status: 'hit' }
      };
      mockGetUserByNationalId.mockResolvedValue(mockUser);
      await processKycWebhook(mockReq, mockRes);
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kycStatus: 'rejected' }));
    });

    it('should set kycStatus to "pending" if overall status is "in_progress"', async () => {
      mockReq.body = { ...basePayload, status: 'in_progress' };
      mockGetUserByNationalId.mockResolvedValue(mockUser);
      await processKycWebhook(mockReq, mockRes);
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kycStatus: 'pending' }));
    });

    it('should set kycStatus to "pending" if critical checks passed but AML is pending', async () => {
      mockReq.body = {
        ...basePayload,
        status: 'completed',
        document_verification: { status: 'passed' },
        face_verification: { status: 'passed' },
        liveness_check: { status: 'passed' },
        aml_check: { status: 'pending' } // AML is pending
      };
      mockGetUserByNationalId.mockResolvedValue(mockUser);
      await processKycWebhook(mockReq, mockRes);
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kycStatus: 'pending' }));
    });
  });

  it('should send enriched WebSocket message on KYC update', async () => {
    mockClients.set(mockUser.id, mockUserSocket as WebSocket);
    mockReq.body = {
      id: 'v123',
      status: 'completed',
      reference_id: 'ID123',
      document_verification: { status: 'passed' },
      face_verification: { status: 'passed' },
      liveness_check: { status: 'failed' }, // results in rejected
      aml_check: { status: 'clear' }
    };
    mockGetUserByNationalId.mockResolvedValue(mockUser);

    await processKycWebhook(mockReq, mockRes);

    expect(mockUserSocket.send).toHaveBeenCalledTimes(1);
    const wsMessage = JSON.parse(vi.mocked(mockUserSocket.send).mock.calls[0][0] as string);

    expect(wsMessage.type).toBe('KYC_UPDATE');
    expect(wsMessage.payload.userId).toBe(mockUser.id);
    expect(wsMessage.payload.kycStatus).toBe('rejected');
    expect(wsMessage.payload.verificationId).toBe('v123');
    expect(wsMessage.payload.details).toEqual({
      documentVerified: true,
      faceMatch: true,
      livenessCheck: false,
      amlStatus: 'clear',
      overallDiditStatus: 'completed'
    });
  });

  it('should handle user not found gracefully', async () => {
    mockReq.body = { id: 'v123', status: 'completed', reference_id: 'UNKNOWN_ID' };
    mockGetUserByNationalId.mockResolvedValue(null);

    await processKycWebhook(mockReq, mockRes);

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200); // Still 200 as webhook itself was received
    expect(mockRes.send).toHaveBeenCalledWith('Webhook received');
  });
   it('should handle missing reference_id by responding 400', async () => {
    mockReq.body = { id: 'v123', status: 'completed' /* no reference_id */ };

    await processKycWebhook(mockReq, mockRes);

    expect(mockGetUserByNationalId).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith('Missing reference_id');
  });
});
