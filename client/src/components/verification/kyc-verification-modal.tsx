import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  User,
  CreditCard,
  Eye
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface KYCVerificationModalProps {
  user: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KYCVerificationModal({ user, isOpen, onOpenChange }: KYCVerificationModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dateOfBirth: '',
    nationalId: '',
    documentType: 'national_id'
  });
  const [documentImage, setDocumentImage] = useState<string>('');
  const [selfieImage, setSelfieImage] = useState<string>('');
  const documentInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const verificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/kyc/verify', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification Submitted",
        description: "Your identity verification has been submitted for review. You'll receive an update within 24 hours."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onOpenChange(false);
      setStep(1);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to submit verification. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (file: File, type: 'document' | 'selfie') => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'document') {
        setDocumentImage(base64);
      } else {
        setSelfieImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!documentImage || !selfieImage) {
      toast({
        title: "Missing Documents",
        description: "Please upload both your ID document and selfie photo.",
        variant: "destructive"
      });
      return;
    }

    verificationMutation.mutate({
      ...formData,
      documentImage: documentImage.split(',')[1], // Remove data:image/... prefix
      selfieImage: selfieImage.split(',')[1]
    });
  };

  const getStepIcon = (stepNumber: number) => {
    if (step > stepNumber) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (step === stepNumber) return <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{stepNumber}</div>;
    return <div className="h-5 w-5 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">{stepNumber}</div>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span>Identity Verification (KYC)</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {getStepIcon(1)}
            <span className="text-sm font-medium">Personal Info</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center space-x-2">
            {getStepIcon(2)}
            <span className="text-sm font-medium">ID Document</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center space-x-2">
            {getStepIcon(3)}
            <span className="text-sm font-medium">Selfie Photo</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center space-x-2">
            {getStepIcon(4)}
            <span className="text-sm font-medium">Review</span>
          </div>
        </div>

        <Progress value={(step / 4) * 100} className="mb-6" />

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="nationalId">National ID Number</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
                    placeholder="Enter your national ID number"
                  />
                </div>

                <div>
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)}
                disabled={!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.nationalId}
              >
                Next: Upload Document
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Upload ID Document</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {documentImage ? (
                    <div>
                      <img src={documentImage} alt="ID Document" className="max-h-48 mx-auto rounded-lg" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => documentInputRef.current?.click()}
                      >
                        Change Document
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium mb-2">Upload your {formData.documentType.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600 mb-4">
                        Take a clear photo of both sides of your document
                      </p>
                      <Button onClick={() => documentInputRef.current?.click()}>
                        <Camera className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  )}
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'document');
                    }}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Document Requirements</h4>
                      <ul className="text-sm text-blue-800 mt-1 space-y-1">
                        <li>• Clear, high-quality image</li>
                        <li>• All text must be readable</li>
                        <li>• No glare or shadows</li>
                        <li>• Document must be valid and not expired</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)}
                disabled={!documentImage}
              >
                Next: Take Selfie
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Selfie Upload */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Take Selfie Photo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {selfieImage ? (
                    <div>
                      <img src={selfieImage} alt="Selfie" className="max-h-48 mx-auto rounded-lg" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => selfieInputRef.current?.click()}
                      >
                        Retake Selfie
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium mb-2">Take a selfie photo</p>
                      <p className="text-sm text-gray-600 mb-4">
                        This will be used to verify your identity against your document
                      </p>
                      <Button onClick={() => selfieInputRef.current?.click()}>
                        <Camera className="h-4 w-4 mr-2" />
                        Take Selfie
                      </Button>
                    </div>
                  )}
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'selfie');
                    }}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Selfie Guidelines</h4>
                      <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                        <li>• Look directly at the camera</li>
                        <li>• Remove glasses and hat if possible</li>
                        <li>• Ensure good lighting on your face</li>
                        <li>• Keep a neutral expression</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={() => setStep(4)}
                disabled={!selfieImage}
              >
                Next: Review
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review and Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Date of Birth</Label>
                    <p className="font-medium">{formData.dateOfBirth}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">National ID</Label>
                    <p className="font-medium">{formData.nationalId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Document Type</Label>
                    <p className="font-medium">{formData.documentType.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">ID Document</Label>
                    <img src={documentImage} alt="ID Document" className="w-full h-32 object-cover rounded-lg border mt-2" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Selfie Photo</Label>
                    <img src={selfieImage} alt="Selfie" className="w-full h-32 object-cover rounded-lg border mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Ready to Submit</h4>
                  <p className="text-sm text-green-800 mt-1">
                    Your verification will be processed within 24 hours. You'll receive an email notification with the results.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={verificationMutation.isPending}
              >
                {verificationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Verification'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}