import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, MapPin, Clock, Send, FileText, Camera } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocation } from "wouter";
import { AIIncidentAnalysis } from "@/components/analytics/ai-incident-analysis";

const INCIDENT_TYPES = [
  { value: "voter_intimidation", label: "Voter Intimidation", priority: "high" },
  { value: "technical_malfunction", label: "Technical Malfunction", priority: "medium" },
  { value: "ballot_irregularity", label: "Ballot Irregularity", priority: "high" },
  { value: "procedural_violation", label: "Procedural Violation", priority: "medium" },
  { value: "violence", label: "Violence/Threat", priority: "critical" },
  { value: "bribery", label: "Bribery/Corruption", priority: "high" },
  { value: "accessibility_issue", label: "Accessibility Issue", priority: "medium" },
  { value: "other", label: "Other", priority: "low" }
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" }
];

export default function IncidentReporting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { position, getCurrentPosition } = useGeolocation({ enableHighAccuracy: true });
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [incidentForm, setIncidentForm] = useState({
    type: "",
    severity: "",
    title: "",
    description: "",
    location: "",
    pollingStationId: "",
    witnessCount: "",
    evidenceNotes: ""
  });

  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  const { data: pollingStations = [] } = useQuery<any[]>({
    queryKey: ["/api/polling-stations"],
  });

  const { data: userReports = [] } = useQuery<any[]>({
    queryKey: ["/api/reports", "user", user?.id],
    enabled: !!user?.id
  });

  // Load incident form template
  const { data: formTemplate } = useQuery<any>({
    queryKey: ["/api/forms/templates", "incident"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/forms/templates");
      const templates = await response.json();
      return templates.find((t: any) => t.type === "incident" && t.isActive) || null;
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (incident: any) => {
      const response = await apiRequest("POST", "/api/reports", {
        ...incident,
        stationId: incident.pollingStationId || 1, // Map pollingStationId to stationId and provide default
        latitude: position?.coords?.latitude || null,
        longitude: position?.coords?.longitude || null,
        submittedBy: user?.id,
        status: "pending"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Incident Reported",
        description: "Your incident report has been submitted successfully.",
      });
      setIncidentForm({
        type: "",
        severity: "",
        title: "",
        description: "",
        location: "",
        pollingStationId: "",
        witnessCount: "",
        evidenceNotes: ""
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.type || !incidentForm.severity || !incidentForm.title || !incidentForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    createIncidentMutation.mutate(incidentForm);
  };

  const getPriorityColor = (severity: string) => {
    const level = SEVERITY_LEVELS.find(s => s.value === severity);
    return level?.color || "bg-gray-100 text-gray-800";
  };

  // Handler functions for action buttons
  const handleDocumentEvidence = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      toast({
        title: "Evidence Captured",
        description: `${file.name} ready for upload with report`,
      });
      setIncidentForm(prev => ({ 
        ...prev, 
        evidenceNotes: prev.evidenceNotes + (prev.evidenceNotes ? ', ' : '') + file.name 
      }));
    }
  };

  const handleEmergencyAlert = () => {
    setLocation("/emergency-alert");
  };

  const handleLocationTracker = () => {
    if (position) {
      const locationString = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      setIncidentForm(prev => ({ ...prev, location: locationString }));
      toast({
        title: "Location Updated",
        description: "GPS coordinates added to incident form",
      });
    } else {
      getCurrentPosition();
      toast({
        title: "Getting Location",
        description: "Requesting GPS coordinates...",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Incident Reporting</h1>
          <p className="text-muted-foreground">Report electoral irregularities and incidents in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Form */}
          <Card className="government-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>New Incident Report</span>
              </CardTitle>
              <CardDescription>
                Submit detailed incident reports for immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Incident Type *</Label>
                    <Select 
                      value={incidentForm.type} 
                      onValueChange={(value) => setIncidentForm(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INCIDENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="severity">Severity Level *</Label>
                    <Select 
                      value={incidentForm.severity} 
                      onValueChange={(value) => setIncidentForm(prev => ({ ...prev, severity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Incident Title *</Label>
                  <Input
                    id="title"
                    value={incidentForm.title}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief title describing the incident"
                  />
                </div>

                <div>
                  <Label htmlFor="pollingStation">Polling Station</Label>
                  <Select 
                    value={incidentForm.pollingStationId} 
                    onValueChange={(value) => setIncidentForm(prev => ({ ...prev, pollingStationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select polling station (if applicable)" />
                    </SelectTrigger>
                    <SelectContent>
                      {pollingStations.map((station: any) => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.name} - {station.parish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location Details</Label>
                  <Input
                    id="location"
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Specific location or address"
                  />
                  {position && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      GPS: {position.coords.latitude.toFixed(6)}, {position.coords.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide a detailed description of what occurred..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="witnessCount">Number of Witnesses</Label>
                    <Input
                      id="witnessCount"
                      type="number"
                      value={incidentForm.witnessCount}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, witnessCount: e.target.value }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="evidenceNotes">Evidence Notes</Label>
                    <Input
                      id="evidenceNotes"
                      value={incidentForm.evidenceNotes}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, evidenceNotes: e.target.value }))}
                      placeholder="Photos, videos, documents available"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createIncidentMutation.isPending}
                >
                  {createIncidentMutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Incident Report
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* AI Analysis Panel */}
          <div className="space-y-6">
            {/* AI Analysis Trigger */}
            {incidentForm.title && incidentForm.description && !showAIAnalysis && (
              <Card className="government-card">
                <CardContent className="p-4">
                  <Button 
                    onClick={() => setShowAIAnalysis(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Get AI Analysis
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Component */}
            {showAIAnalysis && incidentForm.title && incidentForm.description && (
              <AIIncidentAnalysis
                incidentData={incidentForm}
                onAnalysisComplete={(analysis) => {
                  // Auto-populate severity if not set
                  if (!incidentForm.severity && analysis.severity.level) {
                    setIncidentForm(prev => ({ ...prev, severity: analysis.severity.level }));
                  }
                }}
              />
            )}

            {/* Recent Reports */}
            <Card className="government-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Your Recent Reports</span>
                </CardTitle>
                <CardDescription>
                  Track your submitted incident reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userReports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No reports submitted yet</p>
                  ) : (
                    userReports.slice(0, 5).map((report: any) => (
                      <div key={report.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{report.title}</h4>
                          <Badge className={getPriorityColor(report.severity)}>
                            {report.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline">
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hidden file input for evidence capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          multiple
        />

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="government-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleDocumentEvidence}
          >
            <CardContent className="p-4 text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-medium">Document Evidence</h3>
              <p className="text-sm text-muted-foreground">Capture photos and videos</p>
            </CardContent>
          </Card>

          <Card 
            className="government-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleEmergencyAlert}
          >
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <h3 className="font-medium">Emergency Alert</h3>
              <p className="text-sm text-muted-foreground">Send immediate alert</p>
            </CardContent>
          </Card>

          <Card 
            className="government-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleLocationTracker}
          >
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-medium">Location Tracker</h3>
              <p className="text-sm text-muted-foreground">Share precise location</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}