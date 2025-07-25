import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../storage';
import { getWeatherService } from './weather-service';

interface TrafficPrediction {
  stationId: number;
  stationName: string;
  currentSeverity: string;
  predictedSeverity: string;
  confidenceScore: number;
  riskFactors: string[];
  recommendations: string[];
  analysisTimestamp: string;
  predictionHorizon: string; // e.g., "next 2 hours", "election day morning"
}

interface PredictionFactors {
  currentTraffic: any;
  weatherConditions: any;
  timeOfDay: string;
  stationLocation: any;
  historicalPatterns: string;
  electionDayFactors: string;
}

class AITrafficPredictionService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      } else {
        console.warn('No Google AI API key found. AI predictions will not be available.');
      }
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  }

  async generatePredictions(predictionType: string = 'election_day'): Promise<TrafficPrediction[]> {
    try {
      if (!this.model) {
        throw new Error('AI service not initialized. Please provide Google AI API key.');
      }

      // Get real traffic data for all stations
      const { getTrafficService } = await import('./traffic-service');
      const trafficService = getTrafficService();
      const trafficData = await trafficService.getAllStationsTraffic();
      if (!trafficData || !trafficData.stations) {
        throw new Error('No traffic data available for predictions');
      }

      const predictions: TrafficPrediction[] = [];

      // Process each station individually for more accurate predictions
      for (const station of trafficData.stations) {
        try {
          const prediction = await this.predictStationTraffic(station, predictionType);
          predictions.push(prediction);
        } catch (error) {
          console.error(`Failed to predict traffic for station ${station.stationId}:`, error);
          // Continue with other stations rather than failing completely
        }
      }

      return predictions;
    } catch (error) {
      console.error('AI Traffic Prediction Error:', error);
      throw error;
    }
  }

  private async predictStationTraffic(station: any, predictionType: string): Promise<TrafficPrediction> {
    // Gather prediction factors
    const factors = await this.gatherPredictionFactors(station, predictionType);
    
    // Generate AI analysis
    const aiAnalysis = await this.analyzeWithAI(station, factors, predictionType);
    
    return {
      stationId: station.stationId,
      stationName: station.stationName,
      currentSeverity: station.nearbyTraffic.severity,
      predictedSeverity: aiAnalysis.predictedSeverity,
      confidenceScore: aiAnalysis.confidenceScore,
      riskFactors: aiAnalysis.riskFactors,
      recommendations: aiAnalysis.recommendations,
      analysisTimestamp: new Date().toISOString(),
      predictionHorizon: this.getPredictionHorizon(predictionType)
    };
  }

  private async gatherPredictionFactors(station: any, predictionType: string): Promise<PredictionFactors> {
    const currentTime = new Date();
    const timeOfDay = this.getTimeOfDayCategory(currentTime);
    
    // Get weather data for the station's parish
    let weatherConditions = null;
    try {
      const parish = await this.getStationParish(station);
      if (parish) {
        const weatherService = getWeatherService();
        weatherConditions = await weatherService.getParishWeather(parish);
      }
    } catch (error) {
      console.log('Weather data not available for predictions');
    }

    return {
      currentTraffic: station.nearbyTraffic,
      weatherConditions,
      timeOfDay,
      stationLocation: station.location,
      historicalPatterns: this.getHistoricalContext(station, timeOfDay),
      electionDayFactors: this.getElectionDayContext(predictionType, timeOfDay)
    };
  }

  private async analyzeWithAI(station: any, factors: PredictionFactors, predictionType: string): Promise<{
    predictedSeverity: string;
    confidenceScore: number;
    riskFactors: string[];
    recommendations: string[];
  }> {
    const prompt = this.buildAnalysisPrompt(station, factors, predictionType);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return this.parseAIResponse(response, station.nearbyTraffic.severity);
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(station, factors);
    }
  }

  private buildAnalysisPrompt(station: any, factors: PredictionFactors, predictionType: string): string {
    return `You are an AI traffic analyst for Jamaica electoral monitoring. Analyze this polling station's traffic conditions and predict future traffic patterns.

STATION DATA:
- Name: ${station.stationName}
- Location: ${station.location.latitude}, ${station.location.longitude}
- Current Traffic: ${factors.currentTraffic.severity} (Speed: ${factors.currentTraffic.speed} km/h, Delay: ${factors.currentTraffic.delayMinutes} min)
- Time Context: ${factors.timeOfDay}
- Location Busyness: ${station.locationBusyness?.currentLevel || 'unknown'} (${station.locationBusyness?.percentageBusy || 0}% busy)

PREDICTION CONTEXT:
- Prediction Type: ${predictionType}
- Weather: ${factors.weatherConditions ? JSON.stringify(factors.weatherConditions) : 'No weather data'}
- Historical Context: ${factors.historicalPatterns}
- Election Day Factors: ${factors.electionDayFactors}

ANALYSIS REQUIREMENTS:
1. Predict traffic severity for the next 2-4 hours: light, moderate, heavy, or severe
2. Provide confidence score (0-100) based on data quality and pattern reliability
3. Identify specific risk factors that could worsen traffic
4. Recommend actionable steps for traffic management

Respond in this JSON format:
{
  "predictedSeverity": "moderate",
  "confidenceScore": 87,
  "riskFactors": ["Specific factor 1", "Specific factor 2"],
  "recommendations": ["Specific action 1", "Specific action 2"]
}

Base your analysis on real Jamaica traffic patterns, voting behavior, and geographic factors. Consider approach routes, parking availability, and voter turnout patterns.`;
  }

  private parseAIResponse(response: string, currentSeverity: string): {
    predictedSeverity: string;
    confidenceScore: number;
    riskFactors: string[];
    recommendations: string[];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the response
        const validSeverities = ['light', 'moderate', 'heavy', 'severe'];
        if (!validSeverities.includes(parsed.predictedSeverity)) {
          parsed.predictedSeverity = currentSeverity;
        }
        
        if (typeof parsed.confidenceScore !== 'number' || parsed.confidenceScore < 0 || parsed.confidenceScore > 100) {
          parsed.confidenceScore = 75; // Default confidence
        }
        
        if (!Array.isArray(parsed.riskFactors)) {
          parsed.riskFactors = ['AI analysis incomplete'];
        }
        
        if (!Array.isArray(parsed.recommendations)) {
          parsed.recommendations = ['Monitor traffic conditions closely'];
        }
        
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }
    
    // Fallback parsing
    return this.fallbackAnalysis({ nearbyTraffic: { severity: currentSeverity } }, {} as PredictionFactors);
  }

  private fallbackAnalysis(station: any, factors: PredictionFactors): {
    predictedSeverity: string;
    confidenceScore: number;
    riskFactors: string[];
    recommendations: string[];
  } {
    const current = station.nearbyTraffic.severity;
    
    // Simple rule-based fallback
    let predicted = current;
    if (current === 'light' && factors.timeOfDay === 'morning_peak') {
      predicted = 'moderate';
    } else if (current === 'moderate' && factors.timeOfDay === 'peak_hours') {
      predicted = 'heavy';
    }
    
    return {
      predictedSeverity: predicted,
      confidenceScore: 60, // Lower confidence for fallback
      riskFactors: [
        'Limited real-time data available',
        'Peak voting hours approaching',
        'Multiple access routes converging'
      ],
      recommendations: [
        'Deploy traffic monitors 1 hour early',
        'Prepare alternative parking arrangements',
        'Monitor real-time conditions closely'
      ]
    };
  }

  private getTimeOfDayCategory(date: Date): string {
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 9) return 'morning_peak';
    if (hour >= 9 && hour < 11) return 'mid_morning';
    if (hour >= 11 && hour < 14) return 'midday';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'evening_peak';
    return 'off_peak';
  }

  private getHistoricalContext(station: any, timeOfDay: string): string {
    // This would ideally query historical traffic data
    // For now, provide context based on time and location type
    const contexts = {
      morning_peak: 'Historically high traffic during morning commute hours (6-9 AM)',
      mid_morning: 'Moderate traffic as morning rush subsides',
      midday: 'Generally lighter traffic during midday hours',
      afternoon: 'Building traffic as afternoon activities increase',
      evening_peak: 'Heavy traffic during evening commute (5-7 PM)',
      off_peak: 'Light traffic during off-peak hours'
    };
    
    return contexts[timeOfDay as keyof typeof contexts] || 'No historical pattern data available';
  }

  private getElectionDayContext(predictionType: string, timeOfDay: string): string {
    if (predictionType !== 'election_day') {
      return 'Standard traffic patterns expected';
    }
    
    const electionContexts = {
      morning_peak: 'Election day morning: High voter turnout expected, increased traffic to polling stations',
      mid_morning: 'Election day mid-morning: Steady voter flow, moderate traffic increases',
      midday: 'Election day midday: Peak voting hours, expect significant traffic congestion',
      afternoon: 'Election day afternoon: Continued voting activity, sustained traffic levels',
      evening_peak: 'Election day evening: Final voting rush, critical traffic management period',
      off_peak: 'Election day off-peak: Reduced but still elevated traffic compared to normal'
    };
    
    return electionContexts[timeOfDay as keyof typeof electionContexts] || 'Election day traffic patterns apply';
  }

  private getPredictionHorizon(predictionType: string): string {
    switch (predictionType) {
      case 'election_day': return 'Election day (next 6-8 hours)';
      case 'next_2_hours': return 'Next 2 hours';
      case 'next_4_hours': return 'Next 4 hours';
      default: return 'Next 2-4 hours';
    }
  }

  private async getStationParish(station: any): Promise<string | null> {
    try {
      // Try to get parish from station data or geocode the location
      if (station.parish) {
        return station.parish;
      }
      
      // This is a simplified parish detection - in a real system you'd use proper geocoding
      const parishes = [
        'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
        'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth', 
        'Manchester', 'Clarendon', 'St. Catherine'
      ];
      
      // For now, return a parish based on station name or default
      for (const parish of parishes) {
        if (station.stationName.toLowerCase().includes(parish.toLowerCase())) {
          return parish;
        }
      }
      
      return 'Kingston'; // Default parish
    } catch (error) {
      console.error('Error determining station parish:', error);
      return null;
    }
  }

  async getStationPrediction(stationId: number, predictionType: string = 'election_day'): Promise<TrafficPrediction | null> {
    try {
      const station = await storage.getPollingStationById(stationId);
      if (!station) {
        throw new Error(`Station ${stationId} not found`);
      }

      // Get current traffic data for the station
      const { getTrafficService } = await import('./traffic-service');
      const trafficService = getTrafficService();
      const trafficData = await trafficService.getStationTraffic(stationId);
      if (!trafficData) {
        throw new Error(`No traffic data available for station ${stationId}`);
      }

      return await this.predictStationTraffic(trafficData, predictionType);
    } catch (error) {
      console.error(`Failed to get prediction for station ${stationId}:`, error);
      return null;
    }
  }
}

export const aiTrafficPredictionService = new AITrafficPredictionService();