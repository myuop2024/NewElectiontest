import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, Thermometer, Droplets, Wind, RefreshCw } from "lucide-react";

interface StationWeatherStatusProps {
  parish: string;
  compact?: boolean;
}

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('shower')) return <CloudRain className="h-3 w-3" />;
  if (lower.includes('cloud') || lower.includes('overcast')) return <Cloud className="h-3 w-3" />;
  return <Sun className="h-3 w-3" />;
};

const getImpactColor = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function StationWeatherStatus({ parish, compact = false }: StationWeatherStatusProps) {
  const { data: weatherData, isLoading, refetch } = useQuery({
    queryKey: ["/api/weather/parish", parish, "summary"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Loading weather...
      </div>
    );
  }

  if (!weatherData?.current) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cloud className="h-3 w-3" />
        No weather data
      </div>
    );
  }

  const { current, impact } = weatherData;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm">
          {getWeatherIcon(current.condition)}
          <span className="font-medium">{Math.round(current.temperature)}°C</span>
        </div>
        {impact && (
          <Badge 
            variant="outline" 
            className={`text-xs ${getImpactColor(impact.level)}`}
          >
            {impact.level} Impact
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather Conditions
          </h4>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Current Conditions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Conditions:</span>
            <div className="flex items-center gap-2">
              {getWeatherIcon(current.condition)}
              <span className="text-sm font-medium">{current.condition}</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Temperature:</span>
            <div className="flex items-center gap-2">
              <Thermometer className="h-3 w-3" />
              <span className="text-sm font-medium">{Math.round(current.temperature)}°C</span>
            </div>
          </div>

          {/* Humidity */}
          {current.humidity && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Humidity:</span>
              <div className="flex items-center gap-2">
                <Droplets className="h-3 w-3" />
                <span className="text-sm font-medium">{current.humidity}%</span>
              </div>
            </div>
          )}

          {/* Wind */}
          {current.wind && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wind:</span>
              <div className="flex items-center gap-2">
                <Wind className="h-3 w-3" />
                <span className="text-sm font-medium">{current.wind.speed} km/h</span>
              </div>
            </div>
          )}

          {/* Electoral Impact */}
          {impact && (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Electoral Impact:</span>
                <Badge className={getImpactColor(impact.level)}>
                  {impact.level} Impact
                </Badge>
              </div>
              {impact.recommendations && impact.recommendations.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                  <strong>Recommendations:</strong> {impact.recommendations.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Precipitation Probability */}
          {current.precipitationProbability !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rain Probability:</span>
              <span className="text-sm font-medium">{current.precipitationProbability}%</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-3 text-center">
          Last updated: {new Date(current.timestamp || Date.now()).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}