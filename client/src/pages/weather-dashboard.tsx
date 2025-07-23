import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Thermometer, 
  Wind, 
  Droplets, 
  Eye, 
  Gauge,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
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

interface AllWeatherData {
  parishes: Array<WeatherData | { parish: string; error: string; lastUpdated: string }>;
  totalParishes: number;
  successfulFetches: number;
  lastUpdated: string;
}

export default function WeatherDashboard() {
  const [selectedParish, setSelectedParish] = useState<string>("Kingston");
  const [refreshKey, setRefreshKey] = useState(0);

  // Get list of available parishes with error handling
  const { data: parishesData, error: parishesError } = useQuery<{ parishes: string[] }>({
    queryKey: ["/api/weather/parishes"],
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.error('Parishes fetch error:', error);
    }
  });

  // Get weather data for selected parish with error handling
  const { data: parishWeather, isLoading: parishLoading, error: parishError } = useQuery<WeatherData>({
    queryKey: [`/api/weather/parish/${selectedParish}/summary`, refreshKey],
    enabled: !!selectedParish,
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.error('Parish weather fetch error:', error);
    }
  });

  // Get weather data for all parishes with error handling
  const { data: allWeatherData, isLoading: allWeatherLoading, error: allError } = useQuery<AllWeatherData>({
    queryKey: ["/api/weather/all-parishes", refreshKey],
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.error('Weather data fetch error:', error);
    }
  });

  const parishes = parishesData?.parishes || [];

  useEffect(() => {
    if (parishes.length > 0 && !selectedParish) {
      setSelectedParish(parishes[0]);
    }
  }, [parishes, selectedParish]);

  const refreshWeatherData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getWeatherIcon = (condition: string | undefined) => {
    if (!condition) {
      return <Sun className="h-8 w-8 text-gray-400" />;
    }
    
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className="h-8 w-8 text-gray-500" />;
    } else {
      return <Sun className="h-8 w-8 text-yellow-500" />;
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Weather Dashboard</h1>
          <p className="text-gray-600">Real-time weather conditions for Jamaica parishes</p>
        </div>
        <Button onClick={refreshWeatherData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="parish" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="parish">Parish Weather</TabsTrigger>
          <TabsTrigger value="overview">All Parishes</TabsTrigger>
        </TabsList>

        <TabsContent value="parish" className="space-y-6">
          <div className="flex items-center space-x-4">
            <Select value={selectedParish} onValueChange={setSelectedParish}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Parish" />
              </SelectTrigger>
              <SelectContent>
                {parishes.map((parish) => (
                  <SelectItem key={parish} value={parish}>
                    {parish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parishLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading weather data...
            </div>
          )}

          {parishError && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Weather Data</AlertTitle>
              <AlertDescription>
                Unable to fetch weather data for {selectedParish}. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {parishWeather && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Conditions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Current Conditions - {parishWeather.parish}</span>
                  </CardTitle>
                  <CardDescription>
                    Last updated: {formatLastUpdated(parishWeather.lastUpdated)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getWeatherIcon(parishWeather.current.condition)}
                      <div>
                        <p className="text-2xl font-bold">{parishWeather.current.temperature}</p>
                        <p className="text-sm text-gray-600">Feels like {parishWeather.current.feelsLike}</p>
                        <p className="text-sm font-medium">{parishWeather.current.condition}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Humidity</p>
                        <p className="font-medium">{parishWeather.current.humidity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wind className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Wind</p>
                        <p className="font-medium">{parishWeather.current.windSpeed} {parishWeather.current.windDirection}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm text-gray-600">UV Index</p>
                        <p className="font-medium">{parishWeather.current.uvIndex}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CloudRain className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Rain Chance</p>
                        <p className="font-medium">{parishWeather.current.rainProbability}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Today's Forecast</h4>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getWeatherIcon(parishWeather.forecast.today.condition)}
                        <div>
                          <p className="font-medium">{parishWeather.forecast.today.condition}</p>
                          <p className="text-sm text-gray-600">Rain: {parishWeather.forecast.today.rainProbability}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{parishWeather.forecast.today.high}</p>
                        <p className="text-sm text-gray-600">{parishWeather.forecast.today.low}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Electoral Impact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getSeverityIcon(parishWeather.electoralImpact?.severity || 'low')}
                    <span>Electoral Impact</span>
                  </CardTitle>
                  <CardDescription>
                    Weather conditions analysis for electoral activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge className={getSeverityColor(parishWeather.electoralImpact?.severity || 'low')}>
                    {(parishWeather.electoralImpact?.severity || 'low').toUpperCase()} IMPACT
                  </Badge>

                  <div>
                    <h4 className="font-semibold mb-2">Potential Impacts</h4>
                    <ul className="space-y-1">
                      {(parishWeather.electoralImpact?.impacts || []).map((impact, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {impact}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {(parishWeather.electoralImpact?.recommendations || []).map((recommendation, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {allWeatherLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading weather data for all parishes...
            </div>
          )}

          {allWeatherData && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">All Parishes Weather Overview</h2>
                <div className="text-sm text-gray-600">
                  {allWeatherData.successfulFetches} of {allWeatherData.totalParishes} parishes loaded
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allWeatherData.parishes.map((parish) => (
                  <Card key={parish.parish} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedParish(parish.parish);
                          // Switch to parish tab
                          const parishTab = document.querySelector('[value="parish"]') as HTMLElement;
                          parishTab?.click();
                        }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{parish.parish}</CardTitle>
                      {'error' in parish ? (
                        <CardDescription className="text-red-600">
                          Error loading data
                        </CardDescription>
                      ) : (
                        <CardDescription>
                          {formatLastUpdated(parish.lastUpdated)}
                        </CardDescription>
                      )}
                    </CardHeader>
                    {'error' in parish ? (
                      <CardContent>
                        <p className="text-sm text-red-600">{parish.error}</p>
                      </CardContent>
                    ) : (
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getWeatherIcon(parish.current.condition)}
                            <div>
                              <p className="font-bold">{parish.current.temperature}</p>
                              <p className="text-xs text-gray-600">{parish.current.condition}</p>
                            </div>
                          </div>
                          <Badge className={getSeverityColor(parish.electoralImpact?.severity || 'low')} variant="outline">
                            {parish.electoralImpact?.severity || 'low'}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          <p>Rain: {parish.current.rainProbability}</p>
                          <p>Wind: {parish.current.windSpeed}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}