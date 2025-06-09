import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Save
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface APIKeyValidatorProps {
  serviceKey: string;
  serviceName: string;
  currentValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  isPassword?: boolean;
  testEndpoint?: string;
}

export default function APIKeyValidator({
  serviceKey,
  serviceName,
  currentValue,
  onValueChange,
  placeholder = "Enter API key...",
  isPassword = true,
  testEndpoint
}: APIKeyValidatorProps) {
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'warning'>('idle');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await apiRequest('POST', '/api/settings', { 
        key: serviceKey, 
        value 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Saved",
        description: `${serviceName} configuration updated successfully.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: `Failed to save ${serviceName} API key.`,
        variant: "destructive"
      });
    }
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!testEndpoint) throw new Error('No test endpoint configured');
      const response = await apiRequest('POST', testEndpoint, {});
      return response.json();
    },
    onSuccess: (data) => {
      setValidationStatus(data.valid ? 'valid' : 'invalid');
      toast({
        title: data.valid ? "Validation Successful" : "Validation Failed",
        description: data.message || `${serviceName} API key ${data.valid ? 'is working correctly' : 'failed validation'}.`,
        variant: data.valid ? "default" : "destructive"
      });
    },
    onError: () => {
      setValidationStatus('invalid');
      toast({
        title: "Validation Error",
        description: `Unable to validate ${serviceName} API key.`,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsValidating(false);
    }
  });

  const handleSave = () => {
    if (currentValue.trim()) {
      saveMutation.mutate(currentValue);
    }
  };

  const handleValidate = () => {
    if (!currentValue.trim()) {
      toast({
        title: "No API Key",
        description: "Please enter an API key before validating.",
        variant: "destructive"
      });
      return;
    }
    
    setIsValidating(true);
    setValidationStatus('idle');
    validateMutation.mutate();
  };

  const getStatusBadge = () => {
    switch (validationStatus) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Key className="w-4 h-4 mr-2" />
            {serviceName} API Key
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={serviceKey}>{serviceName} API Key</Label>
          <div className="relative">
            {isPassword ? (
              <Input
                id={serviceKey}
                type={showKey ? "text" : "password"}
                value={currentValue}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={placeholder}
                className="pr-10"
              />
            ) : (
              <Textarea
                id={serviceKey}
                value={currentValue}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="resize-none"
              />
            )}
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !currentValue.trim()}
            className="flex-1"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
          
          {testEndpoint && (
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={isValidating || !currentValue.trim()}
              className="flex-1"
              size="sm"
            >
              {isValidating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isValidating ? "Testing..." : "Test"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}