import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Thermometer, 
  Wind, 
  Droplets, 
  AlertTriangle,
  MapPin,
  RefreshCw
} from "lucide-react";

interface WeatherData {
  parish: string;
  current: {
    condition: string;
    temperature: string;
    feelsLike: string;
    humidity: string;
    windSpeed: string;
    windDirection: string;
    uvIndex: number;
    rainProbability: string;
  };
  forecast: {
    today: {
      high: string;
      low: string;
      condition: string;
      rainProbability: string;
    };
  };
  electoralImpact: {
    severity: "low" | "medium" | "high";
    impacts: string[];
    recommendations: string[];
  };
  lastUpdated: string;
}

interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  pollingStation: {
    id: number;
    name: string;
    parish: {
      id: number;
      name: string;
    };
  };
}

export default function ObserverWeatherWidget({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();

  // Get observer's assignments
  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments/my"],
    enabled: !!user
  });

  // Get the parish from the first assignment
  const assignedParish = assignments?.[0]?.pollingStation?.parish?.name;

  // Get weather data for assigned parish
  const { data: weatherData, isLoading: weatherLoading, error: weatherError } = useQuery<WeatherData>({
    queryKey: ["/api/weather/parish", assignedParish, "summary"],
    enabled: !!assignedParish
  });

  const getWeatherIcon = (condition: string | undefined, size = "h-6 w-6") => {
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
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${Math.floor(diffMinutes / 60)}h ago`;
  };

  if (!user) {
    return null;
  }

  if (!assignedParish) {
    return (
      <Card className={compact ? "w-full" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Cloud className="h-4 w-4" />
            <span>Weather Conditions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No assignment found. Weather data unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  if (weatherLoading) {
    return (
      <Card className={compact ? "w-full" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading Weather...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Getting weather for {assignedParish}...</p>
        </CardContent>
      </Card>
    );
  }

  if (weatherError || !weatherData) {
    return (
      <Card className={compact ? "w-full" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>Weather Unavailable</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Unable to load weather for {assignedParish}</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{weatherData.parish} Weather</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Updated: {formatLastUpdated(weatherData.lastUpdated)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getWeatherIcon(weatherData.current.condition)}
              <div>
                <p className="font-bold text-lg">{weatherData.current.temperature}</p>
                <p className="text-xs text-gray-600">{weatherData.current.condition}</p>
              </div>
            </div>
            <Badge className={getSeverityColor(weatherData.electoralImpact.severity)} variant="outline">
              {weatherData.electoralImpact.severity.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Droplets className="h-3 w-3 text-blue-500" />
              <span>{weatherData.current.humidity}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Wind className="h-3 w-3 text-gray-500" />
              <span>{weatherData.current.windSpeed.split(' ')[0]} km/h</span>
            </div>
            <div className="flex items-center space-x-1">
              <CloudRain className="h-3 w-3 text-blue-500" />
              <span>{weatherData.current.rainProbability}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Sun className="h-3 w-3 text-yellow-500" />
              <span>UV {weatherData.current.uvIndex}</span>
            </div>
          </div>

          {weatherData.electoralImpact.severity !== "low" && (
            <Alert className="mt-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {weatherData.electoralImpact.impacts[0]}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Weather for {weatherData.parish}</span>
        </CardTitle>
        <CardDescription>
          Your assigned area • Updated {formatLastUpdated(weatherData.lastUpdated)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getWeatherIcon(weatherData.current.condition, "h-12 w-12")}
            <div>
              <p className="text-3xl font-bold">{weatherData.current.temperature}</p>
              <p className="text-sm text-gray-600">Feels like {weatherData.current.feelsLike}</p>
              <p className="text-sm font-medium">{weatherData.current.condition}</p>
            </div>
          </div>
          <Badge className={getSeverityColor(weatherData.electoralImpact.severity)} variant="outline">
            {weatherData.electoralImpact.severity.toUpperCase()} IMPACT
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Humidity</p>
              <p className="font-medium">{weatherData.current.humidity}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Wind className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Wind</p>
              <p className="font-medium">{weatherData.current.windSpeed.split(' ')[0]} km/h {weatherData.current.windDirection}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">UV Index</p>
              <p className="font-medium">{weatherData.current.uvIndex}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <CloudRain className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Rain Chance</p>
              <p className="font-medium">{weatherData.current.rainProbability}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold mb-2">Today's Forecast</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getWeatherIcon(weatherData.forecast.today.condition)}
              <div>
                <p className="font-medium">{weatherData.forecast.today.condition}</p>
                <p className="text-sm text-gray-600">Rain: {weatherData.forecast.today.rainProbability}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{weatherData.forecast.today.high}</p>
              <p className="text-sm text-gray-600">{weatherData.forecast.today.low}</p>
            </div>
          </div>
        </div>

        {weatherData.electoralImpact.impacts.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Electoral Impact</h4>
            <div className="space-y-2">
              {weatherData.electoralImpact.impacts.map((impact, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{impact}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {weatherData.electoralImpact.recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {weatherData.electoralImpact.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}