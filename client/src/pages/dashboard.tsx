import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Smartphone, MapPin, Camera, FileText, AlertTriangle, Video, MessageSquare, BarChart3 } from "lucide-react";
import QuickStats from "@/components/dashboard/quick-stats";
import ActivityFeed from "@/components/dashboard/activity-feed";
import StationsTable from "@/components/dashboard/stations-table";
import AIAnalytics from "@/components/dashboard/ai-analytics";
import CommunicationCenter from "@/components/dashboard/communication-center";
import ObserverWeatherWidget from "@/components/weather/observer-weather-widget";
import KYCVerificationModal from "@/components/verification/kyc-verification-modal";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch enhanced user data with KYC and device status
  const { data: enhancedUser = {} } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!user
  });

  // Fetch device registration status
  const { data: devices = [] } = useQuery({
    queryKey: ['/api/devices'],
    enabled: !!user
  });

  // Fetch analytics data
  const { data: analytics = {} } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!user
  });

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-8 fade-in">
      {/* Enhanced Header with Observer Information */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Electoral Observer Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring and reporting for the 2025 General Election
            </p>
          </div>
          
          {/* Observer ID and Status Cards */}
          <div className="flex gap-4">
            {(enhancedUser as any)?.observerId && (
              <Card className="border-2 border-primary">
                <CardContent className="p-4">
                  <div className="text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Observer ID</p>
                    <p className="text-xl font-bold text-primary">{(enhancedUser as any).observerId}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="mb-2">
                    <Badge className={getKYCStatusColor((enhancedUser as any)?.kycStatus || 'pending')}>
                      {((enhancedUser as any)?.kycStatus?.toUpperCase()) || 'PENDING'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">KYC Status</p>
                  {(!(enhancedUser as any)?.kycStatus || (enhancedUser as any)?.kycStatus === 'pending') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setShowKYCModal(true)}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Verify Identity
                    </Button>
                  )}
                  {devices && devices.length > 0 && (
                    <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
                      <Smartphone className="h-3 w-3 mr-1" />
                      <span>{devices.length} device{devices.length > 1 ? 's' : ''} registered</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Enhanced Action Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Core Actions */}
        <Card className="government-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Core Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/check-in">
                <Button variant="outline" className="h-20 w-full flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground">
                  <MapPin className="h-6 w-6" />
                  <span className="text-sm">Check In</span>
                </Button>
              </Link>
              <Link href="/document-capture">
                <Button variant="outline" className="h-20 w-full flex flex-col gap-2 hover:bg-secondary hover:text-secondary-foreground">
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">Document Capture</span>
                </Button>
              </Link>
              <Link href="/incident-reporting">
                <Button variant="outline" className="h-20 w-full flex flex-col gap-2 hover:bg-green-600 hover:text-white">
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">Submit Report</span>
                </Button>
              </Link>
              <Link href="/emergency-alert">
                <Button variant="outline" className="h-20 w-full flex flex-col gap-2 hover:bg-destructive hover:text-destructive-foreground">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-sm">Emergency Alert</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Communication & Training */}
        <Card className="government-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Video className="h-5 w-5" />
              Communication & Training
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/live-chat')}>
                <Video className="h-4 w-4 mr-2" />
                Video Conference
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/live-chat')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Live Chat
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/training-center')}>
                <FileText className="h-4 w-4 mr-2" />
                Training Modules
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowKYCModal(true)}>
                <Shield className="h-4 w-4 mr-2" />
                KYC Verification
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics & Tools */}
        <Card className="government-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics & Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/ai-analytics')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                AI Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/route-navigation')}>
                <MapPin className="h-4 w-4 mr-2" />
                Route Optimization
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/form-builder')}>
                <FileText className="h-4 w-4 mr-2" />
                Form Builder
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setLocation('/settings')}>
                <Smartphone className="h-4 w-4 mr-2" />
                Device Management
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Feature Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Activity Feed */}
        <ActivityFeed />
        
        {/* Weather Conditions for Observer's Area */}
        <ObserverWeatherWidget />
      </div>

      {/* Polling Stations Status Table */}
      <StationsTable />

      {/* AI Analytics & Communication Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AIAnalytics />
        <CommunicationCenter />
      </div>

      {/* KYC Verification Modal */}
      <KYCVerificationModal
        user={enhancedUser}
        isOpen={showKYCModal}
        onOpenChange={setShowKYCModal}
      />
    </div>
  );
}
