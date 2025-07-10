import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Search, 
  Download, 
  Calendar,
  User,
  Award,
  Hash,
  QrCode,
  ExternalLink
} from 'lucide-react';

interface CertificateVerification {
  valid: boolean;
  certificate?: {
    id: number;
    certificateNumber: string;
    certificateType: string;
    title: string;
    description: string;
    issueDate: string;
    expiryDate?: string;
    verificationHash: string;
    qrCodeData: string;
    metadata: any;
    downloadCount: number;
    isActive: boolean;
  };
  verificationDate?: string;
  message?: string;
}

export default function CertificateVerification() {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [verificationHash, setVerificationHash] = useState('');
  const [searching, setSearching] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CertificateVerification | null>(null);

  const handleVerify = async () => {
    if (!certificateNumber.trim()) return;

    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (verificationHash.trim()) {
        params.set('hash', verificationHash);
      }

      const response = await fetch(`/api/certificates/verify/${certificateNumber}?${params}`);
      const result = await response.json();
      
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        valid: false,
        message: 'Failed to verify certificate. Please try again.'
      });
    } finally {
      setSearching(false);
    }
  };

  const formatCertificateType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date() > new Date(expiryDate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-green-600" />
            Certificate Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Verify the authenticity of CAFFE Electoral Observer Training certificates
          </p>
        </div>

        {/* Verification Form */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Certificate Lookup
            </CardTitle>
            <CardDescription>
              Enter the certificate number to verify its authenticity. For enhanced security verification, 
              also provide the verification hash from the QR code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificateNumber">Certificate Number *</Label>
              <Input
                id="certificateNumber"
                placeholder="e.g., CAFFE-1736505600000-A1B2C3D4"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verificationHash">Verification Hash (Optional)</Label>
              <Input
                id="verificationHash"
                placeholder="Enter hash from QR code for enhanced verification"
                value={verificationHash}
                onChange={(e) => setVerificationHash(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <Button 
              onClick={handleVerify}
              disabled={!certificateNumber.trim() || searching}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Search className={`h-4 w-4 mr-2 ${searching ? 'animate-spin' : ''}`} />
              {searching ? 'Verifying...' : 'Verify Certificate'}
            </Button>
          </CardContent>
        </Card>

        {/* Verification Result */}
        {verificationResult && (
          <Card className={`border-2 ${verificationResult.valid ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {verificationResult.valid ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="text-green-800 dark:text-green-200">Certificate Valid</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span className="text-red-800 dark:text-red-200">Certificate Invalid</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationResult.valid && verificationResult.certificate ? (
                <div className="space-y-6">
                  {/* Certificate Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Certificate Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Certificate #:</span>
                            <span className="font-mono text-xs">{verificationResult.certificate.certificateNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Type:</span>
                            <Badge variant="secondary">
                              {formatCertificateType(verificationResult.certificate.certificateType)}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <Badge className={verificationResult.certificate.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {verificationResult.certificate.isActive ? 'Active' : 'Revoked'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Title</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {verificationResult.certificate.title}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {verificationResult.certificate.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Dates & Validity
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Issue Date:</span>
                            <span>{new Date(verificationResult.certificate.issueDate).toLocaleDateString()}</span>
                          </div>
                          {verificationResult.certificate.expiryDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
                              <span className={isExpired(verificationResult.certificate.expiryDate) ? 'text-red-600' : ''}>
                                {new Date(verificationResult.certificate.expiryDate).toLocaleDateString()}
                                {isExpired(verificationResult.certificate.expiryDate) && ' (Expired)'}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Verified On:</span>
                            <span>{new Date(verificationResult.verificationDate!).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Recipient Details
                        </h3>
                        {verificationResult.certificate.metadata && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Name:</span>
                              <span>{verificationResult.certificate.metadata.recipientName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Observer ID:</span>
                              <span className="font-mono">{verificationResult.certificate.metadata.observerId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Course:</span>
                              <span>{verificationResult.certificate.metadata.courseName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Grade:</span>
                              <span className="font-medium">{verificationResult.certificate.metadata.grade}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Security Information */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Security & Verification
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Verification Hash</Label>
                        <Input 
                          value={verificationResult.certificate.verificationHash} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p>Download Count: {verificationResult.certificate.downloadCount}</p>
                        <p className="mt-1">
                          This certificate uses cryptographic verification to ensure authenticity and prevent forgery.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <QrCode className="h-4 w-4 mr-2" />
                      View QR Code
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Share Verification
                    </Button>
                  </div>
                </div>
              ) : (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {verificationResult.message || 'Certificate not found or invalid.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">About Certificate Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 dark:text-blue-300">
            <ul className="space-y-2">
              <li>• All CAFFE certificates are digitally signed with cryptographic verification</li>
              <li>• Each certificate has a unique number and verification hash for authenticity</li>
              <li>• QR codes on certificates contain verification data for instant validation</li>
              <li>• Expired or revoked certificates will be clearly marked during verification</li>
              <li>• This verification system ensures the integrity of our training certification program</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}