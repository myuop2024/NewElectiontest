import { storage } from "../storage";

interface WeatherLocation {
  latitude: number;
  longitude: number;
}

interface CurrentWeatherCondition {
  iconBaseUri: string;
  description: {
    text: string;
    languageCode: string;
  };
  type: string;
}

interface Temperature {
  degrees: number;
  unit: string;
}

interface Wind {
  direction: {
    degrees: number;
    cardinal: string;
  };
  speed: {
    value: number;
    unit: string;
  };
}

interface Precipitation {
  probability: {
    percent: number;
    type: string;
  };
  qpf?: {
    quantity: number;
    unit: string;
  };
  snowQpf?: {
    quantity: number;
    unit: string;
  };
}

interface CurrentWeatherData {
  currentTime: string;
  timeZone: {
    id: string;
  };
  isDaytime: boolean;
  weatherCondition: CurrentWeatherCondition;
  temperature: Temperature;
  feelsLikeTemperature: Temperature;
  relativeHumidity: number;
  uvIndex: number;
  precipitation: Precipitation;
  wind: Wind;
  cloudCover?: number;
  dewPoint?: Temperature;
  airPressure?: {
    meanSeaLevelMillibars: number;
  };
  visibility?: {
    distance: number;
    unit: string;
  };
  thunderstormProbability?: number;
}

interface DayForecast {
  displayDate: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast: {
    weatherCondition: CurrentWeatherCondition;
    temperature: {
      high: Temperature;
      low: Temperature;
    };
    precipitation: Precipitation;
    wind: Wind;
  };
  nighttimeForecast?: {
    weatherCondition: CurrentWeatherCondition;
    temperature: {
      low: Temperature;
    };
    precipitation: Precipitation;
    wind: Wind;
  };
}

interface HourlyForecast {
  time: string;
  weatherCondition: CurrentWeatherCondition;
  temperature: Temperature;
  precipitation: Precipitation;
  wind: Wind;
  relativeHumidity: number;
}

interface WeatherApiResponse {
  currentConditions?: CurrentWeatherData;
  forecastDays?: DayForecast[];
  forecastHours?: HourlyForecast[];
}

// Jamaica Parish coordinates - major towns/centers
const JAMAICA_PARISH_COORDINATES: Record<string, WeatherLocation> = {
  "Kingston": { latitude: 17.9970, longitude: -76.7936 },
  "St. Andrew": { latitude: 18.0179, longitude: -76.8099 },
  "St. Thomas": { latitude: 17.9890, longitude: -76.3590 },
  "Portland": { latitude: 18.1818, longitude: -76.4656 },
  "St. Mary": { latitude: 18.3573, longitude: -76.9204 },
  "St. Ann": { latitude: 18.4745, longitude: -77.1945 },
  "Trelawny": { latitude: 18.3510, longitude: -77.6113 },
  "St. James": { latitude: 18.4762, longitude: -77.9194 },
  "Hanover": { latitude: 18.4262, longitude: -78.1344 },
  "Westmoreland": { latitude: 18.2988, longitude: -78.1344 },
  "St. Elizabeth": { latitude: 18.0333, longitude: -77.7500 },
  "Manchester": { latitude: 18.0333, longitude: -77.5000 },
  "Clarendon": { latitude: 17.9667, longitude: -77.2500 },
  "St. Catherine": { latitude: 17.9667, longitude: -77.0000 }
};

export class WeatherService {
  private apiKey: string;
  private baseUrl = "https://weather.googleapis.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Test the Weather API endpoint with detailed error information
   */
  private async testAPIEndpoint(): Promise<{ success: boolean; error?: string; response?: any }> {
    const url = `${this.baseUrl}/currentConditions:lookup`;
    const kingston = JAMAICA_PARISH_COORDINATES["Kingston"];
    const params = new URLSearchParams({
      key: this.apiKey,
      "location.latitude": kingston.latitude.toString(),
      "location.longitude": kingston.longitude.toString(),
      unitsSystem: "METRIC"
    });

    try {
      console.log(`Testing Weather API: ${url}?${params}`);
      const response = await fetch(`${url}?${params}`);
      const responseText = await response.text();
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`Response body:`, responseText);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          response: responseText
        };
      }

      const data = JSON.parse(responseText);
      return { success: true, response: data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        response: null
      };
    }
  }

  /**
   * Get current weather conditions for a specific location
   */
  async getCurrentWeather(latitude: number, longitude: number, units: "METRIC" | "IMPERIAL" = "METRIC"): Promise<CurrentWeatherData> {
    const url = `${this.baseUrl}/currentConditions:lookup`;
    const params = new URLSearchParams({
      key: this.apiKey,
      "location.latitude": latitude.toString(),
      "location.longitude": longitude.toString(),
      unitsSystem: units
    });

    try {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data: CurrentWeatherData = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching current weather:", error);
      throw error;
    }
  }

  /**
   * Get daily weather forecast for a specific location
   */
  async getDailyForecast(latitude: number, longitude: number, days: number = 7, units: "METRIC" | "IMPERIAL" = "METRIC"): Promise<DayForecast[]> {
    const url = `${this.baseUrl}/forecast/days:lookup`;
    const params = new URLSearchParams({
      key: this.apiKey,
      "location.latitude": latitude.toString(),
      "location.longitude": longitude.toString(),
      days: Math.min(days, 10).toString(), // API supports max 10 days
      unitsSystem: units
    });

    try {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.forecastDays || [];
    } catch (error) {
      console.error("Error fetching daily forecast:", error);
      // Return empty array if forecast is not available
      return [];
    }
  }

  /**
   * Get hourly weather forecast for a specific location
   */
  async getHourlyForecast(latitude: number, longitude: number, hours: number = 24, units: "METRIC" | "IMPERIAL" = "METRIC"): Promise<HourlyForecast[]> {
    const url = `${this.baseUrl}/forecast/hours:lookup`;
    const params = new URLSearchParams({
      key: this.apiKey,
      "location.latitude": latitude.toString(),
      "location.longitude": longitude.toString(),
      hours: Math.min(hours, 240).toString(), // API supports max 240 hours
      unitsSystem: units
    });

    try {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data: WeatherApiResponse = await response.json();
      return data.forecastHours || [];
    } catch (error) {
      console.error("Error fetching hourly forecast:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive weather data for a Jamaica parish
   */
  async getParishWeather(parishName: string) {
    const coordinates = JAMAICA_PARISH_COORDINATES[parishName];
    if (!coordinates) {
      throw new Error(`Unknown parish: ${parishName}`);
    }

    try {
      const [currentWeather, dailyForecast, hourlyForecast] = await Promise.all([
        this.getCurrentWeather(coordinates.latitude, coordinates.longitude),
        this.getDailyForecast(coordinates.latitude, coordinates.longitude, 2), // Today + tomorrow
        this.getHourlyForecast(coordinates.latitude, coordinates.longitude, 24) // Next 24 hours
      ]);

      return {
        parish: parishName,
        coordinates,
        current: currentWeather,
        daily: dailyForecast,
        hourly: hourlyForecast,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching weather for ${parishName}:`, error);
      throw error;
    }
  }

  /**
   * Get weather data for all Jamaica parishes
   */
  async getAllParishesWeather() {
    const parishNames = Object.keys(JAMAICA_PARISH_COORDINATES);
    const weatherPromises = parishNames.map(parish => 
      this.getParishWeather(parish).catch(error => ({
        parish,
        error: error.message,
        lastUpdated: new Date().toISOString()
      }))
    );

    const results = await Promise.all(weatherPromises);
    
    return {
      parishes: results,
      totalParishes: parishNames.length,
      successfulFetches: results.filter(r => !('error' in r)).length,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get weather summary for electoral observation purposes
   */
  async getElectoralWeatherSummary(parishName: string) {
    try {
      const coordinates = JAMAICA_PARISH_COORDINATES[parishName];
      if (!coordinates) {
        throw new Error(`Unknown parish: ${parishName}`);
      }

      // Get current weather only for now (forecast API may not be available)
      const current = await this.getCurrentWeather(coordinates.latitude, coordinates.longitude);

      // Create basic forecast from current data
      const basicForecast = {
        high: `${Math.round(current.temperature.degrees + 5)}°${current.temperature.unit === 'CELSIUS' ? 'C' : 'F'}`,
        low: `${Math.round(current.temperature.degrees - 5)}°${current.temperature.unit === 'CELSIUS' ? 'C' : 'F'}`,
        condition: current.weatherCondition.description.text,
        rainProbability: `${current.precipitation.probability.percent}%`
      };

      // Analyze weather conditions for electoral activities
      const weatherImpact = this.analyzeWeatherImpact(current, basicForecast);

      return {
        parish: parishName,
        current: {
          condition: current.weatherCondition.description.text,
          temperature: `${current.temperature.degrees}°${current.temperature.unit === 'CELSIUS' ? 'C' : 'F'}`,
          feelsLike: `${current.feelsLikeTemperature.degrees}°${current.feelsLikeTemperature.unit === 'CELSIUS' ? 'C' : 'F'}`,
          humidity: `${current.relativeHumidity}%`,
          windSpeed: `${current.wind.speed.value} ${current.wind.speed.unit}`,
          windDirection: current.wind.direction.cardinal,
          uvIndex: current.uvIndex,
          rainProbability: `${current.precipitation.probability.percent}%`
        },
        forecast: {
          today: basicForecast
        },
        electoralImpact: weatherImpact,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error getting electoral weather summary for ${parishName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze weather impact on electoral activities
   */
  private analyzeWeatherImpact(current: CurrentWeatherData, forecast: any) {
    const impacts = [];
    let severity = "low";

    // Temperature analysis
    const temp = current.temperature.degrees;
    if (temp > 35) {
      impacts.push("Very hot conditions may affect voter turnout and observer comfort");
      severity = "high";
    } else if (temp > 30) {
      impacts.push("Hot conditions - ensure adequate hydration for field staff");
      severity = "medium";
    } else if (temp < 18) {
      impacts.push("Cool conditions - observers should dress appropriately");
    }

    // Rain analysis
    const rainProb = current.precipitation.probability.percent;
    if (rainProb > 70) {
      impacts.push("High probability of rain - may impact voter turnout and outdoor activities");
      severity = "high";
    } else if (rainProb > 40) {
      impacts.push("Possible rain - observers should carry rain protection");
      severity = severity === "high" ? "high" : "medium";
    }

    // Wind analysis
    const windSpeed = current.wind.speed.value;
    if (windSpeed > 25) {
      impacts.push("Strong winds may affect outdoor polling station setup");
      severity = "high";
    }

    // UV Index analysis
    if (current.uvIndex > 8) {
      impacts.push("Very high UV levels - use sun protection for outdoor activities");
    } else if (current.uvIndex > 5) {
      impacts.push("High UV levels - recommend sun protection");
    }

    // Overall assessment
    if (impacts.length === 0) {
      impacts.push("Favorable weather conditions for electoral activities");
    }

    return {
      severity,
      impacts,
      recommendations: this.getWeatherRecommendations(severity, current)
    };
  }

  /**
   * Get weather-based recommendations for electoral activities
   */
  private getWeatherRecommendations(severity: string, current: CurrentWeatherData) {
    const recommendations = [];

    switch (severity) {
      case "high":
        recommendations.push("Consider adjusting outdoor activity schedules");
        recommendations.push("Ensure emergency protocols are in place");
        recommendations.push("Increase communication with field teams");
        break;
      case "medium":
        recommendations.push("Monitor weather conditions closely");
        recommendations.push("Prepare contingency plans");
        break;
      default:
        recommendations.push("Standard weather precautions apply");
    }

    // UV-specific recommendations
    if (current.uvIndex > 5) {
      recommendations.push("Provide sun protection for outdoor staff");
    }

    // Rain-specific recommendations
    if (current.precipitation.probability.percent > 40) {
      recommendations.push("Ensure rain protection is available");
      recommendations.push("Check polling station accessibility in wet conditions");
    }

    return recommendations;
  }

  /**
   * Validate Google Weather API configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; message: string; error?: string }> {
    try {
      const testResult = await this.testAPIEndpoint();
      
      if (testResult.success) {
        return {
          valid: true,
          message: "Google Weather API connection successful"
        };
      } else {
        return {
          valid: false,
          message: "Google Weather API connection failed",
          error: testResult.error
        };
      }
    } catch (error) {
      return {
        valid: false,
        message: "Google Weather API validation error",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get available parishes
   */
  getAvailableParishes(): string[] {
    return Object.keys(JAMAICA_PARISH_COORDINATES);
  }

  /**
   * Get parish coordinates
   */
  getParishCoordinates(parishName: string): WeatherLocation | null {
    return JAMAICA_PARISH_COORDINATES[parishName] || null;
  }
}

// Export factory function for dependency injection
export function createWeatherService(apiKey?: string): WeatherService {
  if (!apiKey) {
    throw new Error("Google Weather API key is required");
  }
  return new WeatherService(apiKey);
}

// Export singleton for convenience
let weatherServiceInstance: WeatherService | null = null;

export function getWeatherService(): WeatherService {
  if (!weatherServiceInstance) {
    const apiKey = process.env.GOOGLE_WEATHER_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_WEATHER_API_KEY or GOOGLE_API_KEY environment variable is required");
    }
    weatherServiceInstance = new WeatherService(apiKey);
  }
  return weatherServiceInstance;
}