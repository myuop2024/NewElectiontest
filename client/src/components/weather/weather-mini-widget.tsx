import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  MapPin,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";

interface WeatherData {
  parish: string;
  current: {
    condition: string;
    temperature: string;
    rainProbability: string;
  };
  electoralImpact: {
    severity: "low" | "medium" | "high";
  };
}

interface Assignment {
  id: number;
  pollingStation: {
    parish: {
      name: string;
    };
  };
}

export default function WeatherMiniWidget() {
  const { user } = useAuth();

  // Get observer's assignments
  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments/my"],
    enabled: !!user
  });

  // Get the parish from the first assignment
  const assignedParish = assignments?.[0]?.pollingStation?.parish?.name;

  // Get weather data for assigned parish
  const { data: weatherData, isLoading } = useQuery<WeatherData>({
    queryKey: ["/api/weather/parish", assignedParish, "summary"],
    enabled: !!assignedParish,
    refetchInterval: 300000, // Refresh every 5 minutes
    select: (data) => ({
      parish: data.parish,
      current: {
        condition: data.current.condition,
        temperature: data.current.temperature,
        rainProbability: data.current.rainProbability
      },
      electoralImpact: {
        severity: data.electoralImpact.severity
      }
    })
  });

  const getWeatherIcon = (condition: string | undefined, size = "h-4 w-4") => {
    if (!condition) {
      return <Sun className={`${size} text-gray-400`} />;
    }
    
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
      return <CloudRain className={`${size} text-blue-500`} />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className={`${size} text-gray-500`} />;
    } else {
      return <Sun className={`${size} text-yellow-500`} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  if (!user || !assignedParish || isLoading) {
    return null;
  }

  if (!weatherData) {
    return (
      <Card className="border-l-4 border-l-gray-300">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <Cloud className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Weather unavailable</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 border-l-${getSeverityColor(weatherData.electoralImpact.severity).replace('bg-', '')}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getWeatherIcon(weatherData.current.condition)}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">{weatherData.current.temperature}</span>
                <span className="text-xs text-gray-600">{weatherData.current.condition}</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{weatherData.parish}</span>
                {weatherData.current.rainProbability !== "0%" && (
                  <>
                    <span>•</span>
                    <span>Rain {weatherData.current.rainProbability}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div 
              className={`w-2 h-2 rounded-full ${getSeverityColor(weatherData.electoralImpact.severity)}`}
              title={`${weatherData.electoralImpact.severity} impact`}
            />
            <Link href="/weather-dashboard">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}