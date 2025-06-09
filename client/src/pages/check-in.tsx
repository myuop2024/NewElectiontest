import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Clock, CheckCircle, AlertCircle, Navigation, Wifi, WifiOff } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EnhancedMap from "@/components/maps/enhanced-map";

interface CheckInData {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  notes?: string;
}

export default function CheckIn() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const { user } = useAuth();
  const { position, getCurrentPosition, isLoading: locationLoading, error: locationError } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's latest check-in
  const { data: userCheckIns } = useQuery({
    queryKey: ['/api/check-ins/user', user?.id],
    enabled: !!user?.id
  });

  // Get assigned polling stations
  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/assignments/user', user?.id],
    enabled: !!user?.id
  });

  const checkInMutation = useMutation({
    mutationFn: async (checkInData: CheckInData) => {
      const response = await apiRequest('POST', '/api/check-ins', checkInData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Check-in Successful",
        description: "Your location has been recorded successfully."
      });
      setLastCheckIn(data);
      queryClient.invalidateQueries({ queryKey: ['/api/check-ins/user', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Check-in Failed",
        description: "Unable to record your check-in. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCheckIn = async () => {
    if (!user || !position) return;

    setIsCheckingIn(true);
    
    try {
      await getCurrentPosition();
      
      const checkInData: CheckInData = {
        userId: user.id,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy || 0,
        timestamp: new Date().toISOString(),
        notes: "Manual check-in from mobile app"
      };

      await checkInMutation.mutateAsync(checkInData);
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to get your current location. Please enable GPS.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getLocationStatus = () => {
    if (locationError) return { status: 'error', text: 'Location Error', color: 'bg-red-500' };
    if (locationLoading) return { status: 'loading', text: 'Getting Location...', color: 'bg-yellow-500' };
    if (position) return { status: 'success', text: 'Location Found', color: 'bg-green-500' };
    return { status: 'waiting', text: 'Waiting for GPS', color: 'bg-gray-500' };
  };

  const locationStatus = getLocationStatus();

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Check In</h2>
        <p className="text-muted-foreground">Record your location and attendance</p>
      </div>

      {/* Location Status */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${locationStatus.color}`}></div>
              <span className="font-medium">{locationStatus.text}</span>
            </div>
            {position ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-gray-400" />}
          </div>

          {position && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Latitude</p>
                <p className="font-mono text-sm">{position.latitude.toFixed(6)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Longitude</p>
                <p className="font-mono text-sm">{position.longitude.toFixed(6)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-sm">{position.accuracy ? `±${position.accuracy.toFixed(0)}m` : 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="text-sm">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          )}

          {locationError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to access your location. Please enable GPS and allow location permissions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Check-in Action */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Check-in Action
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCheckIn}
            disabled={!position || isCheckingIn || checkInMutation.isPending}
            className="w-full btn-caffe-primary h-12"
          >
            {isCheckingIn || checkInMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Recording Check-in...
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5 mr-2" />
                Check In Now
              </>
            )}
          </Button>

          {lastCheckIn && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Last check-in recorded at {new Date(lastCheckIn.timestamp).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Map Display */}
      {position && (
        <Card className="government-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <EnhancedMap
              height="400px"
              center={{ lat: position.latitude, lng: position.longitude }}
              zoom={16}
              markers={[
                {
                  lat: position.latitude,
                  lng: position.longitude,
                  title: "Your Location"
                }
              ]}
              interactive={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Assignment Information */}
      {assignments && Array.isArray(assignments) && assignments.length > 0 && (
        <Card className="government-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.map((assignment: any) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">{assignment.stationName}</p>
                    <p className="text-sm text-muted-foreground">{assignment.parish}</p>
                  </div>
                  <Badge variant="outline">{assignment.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}