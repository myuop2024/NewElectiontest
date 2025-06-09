import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone, MessageSquare, Shield, Clock, MapPin, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const EMERGENCY_TYPES = [
  { value: "violence", label: "Violence/Physical Threat", priority: "critical", color: "bg-red-500" },
  { value: "security_breach", label: "Security Breach", priority: "critical", color: "bg-red-500" },
  { value: "medical_emergency", label: "Medical Emergency", priority: "critical", color: "bg-red-500" },
  { value: "election_fraud", label: "Election Fraud", priority: "high", color: "bg-orange-500" },
  { value: "equipment_failure", label: "Critical Equipment Failure", priority: "high", color: "bg-orange-500" },
  { value: "crowd_control", label: "Crowd Control Issue", priority: "medium", color: "bg-yellow-500" },
  { value: "other", label: "Other Emergency", priority: "medium", color: "bg-yellow-500" }
];

export default function EmergencyAlert() {
  const [alertType, setAlertType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { position, getCurrentPosition } = useGeolocation({ enableHighAccuracy: true });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emergencyMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const response = await apiRequest('POST', '/api/emergency-alert', alertData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Emergency Alert Sent",
        description: "Your emergency alert has been dispatched to all relevant authorities."
      });
      setAlertType("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: () => {
      toast({
        title: "Alert Failed",
        description: "Failed to send emergency alert. Please try again or contact support directly.",
        variant: "destructive"
      });
    }
  });

  const handleEmergencyAlert = async () => {
    if (!alertType || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an emergency type and provide a description.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await getCurrentPosition();
      
      const alertData = {
        type: alertType,
        description: description.trim(),
        priority: EMERGENCY_TYPES.find(t => t.value === alertType)?.priority || 'medium',
        latitude: position?.latitude,
        longitude: position?.longitude,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        status: 'active'
      };

      await emergencyMutation.mutateAsync(alertData);
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to get location. Alert sent without GPS coordinates.",
        variant: "destructive"
      });
      
      // Send alert anyway without location
      const alertData = {
        type: alertType,
        description: description.trim(),
        priority: EMERGENCY_TYPES.find(t => t.value === alertType)?.priority || 'medium',
        timestamp: new Date().toISOString(),
        userId: user?.id,
        status: 'active'
      };

      await emergencyMutation.mutateAsync(alertData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmergencyType = EMERGENCY_TYPES.find(type => type.value === alertType);

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Emergency Alert</h2>
        <p className="text-muted-foreground">Immediate assistance and rapid response</p>
      </div>

      {/* Critical Notice */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>This is for genuine emergencies only.</strong> Misuse of this system may result in penalties.
          For non-urgent issues, use regular incident reporting.
        </AlertDescription>
      </Alert>

      {/* Emergency Type Selection */}
      <Card className="government-card border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Shield className="h-5 w-5" />
            Emergency Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={alertType} onValueChange={setAlertType}>
            <SelectTrigger className="border-red-200">
              <SelectValue placeholder="Select type of emergency" />
            </SelectTrigger>
            <SelectContent>
              {EMERGENCY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                    <span>{type.label}</span>
                    <Badge variant="outline" className="ml-auto">
                      {type.priority}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEmergencyType && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${selectedEmergencyType.color}`}></div>
                <span className="font-medium text-red-800">{selectedEmergencyType.label}</span>
                <Badge variant="destructive">{selectedEmergencyType.priority.toUpperCase()}</Badge>
              </div>
              <p className="text-sm text-red-700">
                This alert will be sent immediately to emergency response teams and supervisors.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="government-card border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <MessageSquare className="h-5 w-5" />
            Emergency Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the emergency situation. Be specific about location, people involved, and immediate threats..."
            rows={5}
            className="border-red-200 focus:border-red-400"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">
              Characters: {description.length}/500
            </p>
            {position && (
              <p className="text-xs text-green-600 flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                GPS Location Available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="government-card">
          <CardContent className="p-4 text-center">
            <Phone className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Call Police</h3>
            <p className="text-xs text-muted-foreground mb-3">Jamaica Constabulary Force</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('tel:119', '_self')}
            >
              Call 119
            </Button>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Medical Emergency</h3>
            <p className="text-xs text-muted-foreground mb-3">Emergency Medical Services</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('tel:110', '_self')}
            >
              Call 110
            </Button>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Fire Service</h3>
            <p className="text-xs text-muted-foreground mb-3">Jamaica Fire Brigade</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('tel:116', '_self')}
            >
              Call 116
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Send Alert Button */}
      <Card className="government-card border-red-200">
        <CardContent className="p-6">
          <Button
            onClick={handleEmergencyAlert}
            disabled={!alertType || !description.trim() || isSubmitting || emergencyMutation.isPending}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting || emergencyMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Emergency Alert...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Send Emergency Alert
              </>
            )}
          </Button>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center">
              <Clock className="h-3 w-3 mr-1" />
              Alert will be sent immediately to all emergency contacts
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}