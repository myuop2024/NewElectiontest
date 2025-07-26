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
  predictionHorizon: string;
}

interface PredictionFactors {
  currentTraffic: any;
  weatherConditions: any;
  timeOfDay: string;
  stationLocation: any;
  observerContext: string;
  electionDayFactors: string;
}

class AITrafficPredictionService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      console.log('[AI PREDICTION] Initializing AI service...');
      console.log('[AI PREDICTION] API key available:', !!apiKey);
      
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.isInitialized = true;
        console.log('[AI PREDICTION] Google AI initialized successfully');
      } else {
        console.error('[AI PREDICTION] No Google AI API key found. AI predictions will not be available.');
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('[AI PREDICTION] Failed to initialize AI service:', error);
      this.isInitialized = false;
    }
  }

  // Test Google AI API connection
  async testConnection(): Promise<boolean> {
    try {
      if (!this.model) {
        console.error('[AI PREDICTION] Model not initialized');
        return false;
      }
      
      const testPrompt = "Hello, can you respond with just 'OK'?";
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('[AI PREDICTION] API test successful:', text.trim());
      return true;
    } catch (error) {
      console.error('[AI PREDICTION] API test failed:', error);
      return false;
    }
  }

  async generatePredictions(predictionType: string = 'election_day'): Promise<TrafficPrediction[]> {
    try {
      console.log('[AI PREDICTION] Starting prediction generation...');
      console.log('[AI PREDICTION] Prediction type:', predictionType);
      
      // Get all polling stations for predictions
      const pollingStations = await storage.getPollingStations();
      console.log('[AI PREDICTION] Retrieved', pollingStations.length, 'polling stations');
      
      if (pollingStations.length === 0) {
        console.log('[AI PREDICTION] No polling stations found, returning empty predictions');
        return [];
      }

      const predictions: TrafficPrediction[] = [];

      // Generate predictions for each station
      for (const station of pollingStations) {
        try {
          const prediction = await this.generateStationPrediction(station, predictionType);
          if (prediction) {
            predictions.push(prediction);
          }
        } catch (error) {
          console.error(`[AI PREDICTION] Failed to generate prediction for station ${station.id}:`, error);
          // Continue with other stations
        }
      }

      console.log('[AI PREDICTION] Generated', predictions.length, 'predictions successfully');
      return predictions;
    } catch (error) {
      console.error('[AI PREDICTION] Error generating predictions:', error);
      throw error;
    }
  }

  private async generateStationPrediction(station: any, predictionType: string): Promise<TrafficPrediction | null> {
    try {
      // Get Jamaica-specific election data for this station
      const electionData = await this.generateJamaicaElectionTrafficData(station);
      
      // Generate time-based predictions
      const currentHour = new Date().getHours();
      const timeContext = this.getTimeContext(currentHour);
      
      // Calculate severity based on multiple factors
      const severity = this.calculateTrafficSeverity(electionData, timeContext, currentHour);
      const predictedSeverity = this.predictFutureSeverity(electionData, timeContext, currentHour + 2);
      
      // Generate risk factors specific to Jamaica elections
      const riskFactors = this.generateRiskFactors(electionData, timeContext);
      
      // Generate observer-focused recommendations
      const recommendations = this.generateObserverRecommendations(electionData, severity, predictedSeverity);
      
      // Calculate confidence score based on data quality
      const confidenceScore = this.calculateConfidenceScore(electionData, station);

      return {
        stationId: station.id,
        stationName: station.name,
        currentSeverity: severity,
        predictedSeverity: predictedSeverity,
        confidenceScore: confidenceScore,
        riskFactors: riskFactors,
        recommendations: recommendations,
        analysisTimestamp: new Date().toISOString(),
        predictionHorizon: this.getPredictionHorizon(predictionType)
      };
    } catch (error) {
      console.error(`[AI PREDICTION] Error generating prediction for station ${station.id}:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive Jamaica election day traffic predictions using database data
   */
  private async generateJamaicaElectionTrafficData(station: any): Promise<any> {
    try {
      // Import the historical election service
      const { historicalElectionService } = await import('./historical-election-service');
      
      // Get most recent historical data for the station's parish
      const historicalData = await historicalElectionService.getMostRecentParishData(station.parish || 'Kingston');
      
      if (historicalData) {
        console.log(`[AI PREDICTION] Using authentic historical data for ${station.parish}`);
        
        // Convert database data to AI prediction format
        const parishData = {
          baseTraffic: historicalData.baseTrafficLevel,
          peakHours: historicalData.peakHours,
          voterTurnout: parseFloat(historicalData.voterTurnout.toString()),
          publicTransportDensity: historicalData.publicTransportDensity,
          roadInfrastructure: historicalData.roadInfrastructure,
          weatherConditions: historicalData.weatherConditions,
          specialEvents: historicalData.specialEvents,
          observedTrafficPatterns: historicalData.observedTrafficPatterns,
          dataSource: historicalData.dataSource,
          dataQuality: historicalData.dataQuality
        };

        // Generate realistic polling station traffic scenario
        const stationTypes: Record<string, any> = {
          'school': { trafficMultiplier: 1.3, parkingLimited: true },
          'church': { trafficMultiplier: 1.1, parkingModerate: true },
          'community_center': { trafficMultiplier: 1.0, parkingAdequate: true },
          'government': { trafficMultiplier: 1.2, parkingLimited: true }
        };

        const stationType = this.determineStationType(station.name);
        const stationMultiplier = stationTypes[stationType]?.trafficMultiplier || 1.0;

        return {
          parish: station.parish || 'Kingston',
          parishData,
          stationType,
          stationMultiplier,
          coordinates: {
            lat: station.latitude,
            lng: station.longitude
          },
          historicalDataSource: 'authentic_database',
          historicalElectionDate: historicalData.electionDate
        };
      } else {
        console.log(`[AI PREDICTION] No historical data found for ${station.parish}, using fallback`);
        
        // Fallback to basic data if no historical data available
        const fallbackData = {
          baseTraffic: 'moderate',
          peakHours: ['07:00-09:00', '16:00-18:00'],
          voterTurnout: 0.68,
          publicTransportDensity: 'moderate',
          roadInfrastructure: 'suburban'
        };

        return {
          parish: station.parish || 'Kingston',
          parishData: fallbackData,
          stationType: this.determineStationType(station.name),
          stationMultiplier: 1.0,
          coordinates: {
            lat: station.latitude,
            lng: station.longitude
          },
          historicalDataSource: 'fallback_default'
        };
      }
    } catch (error) {
      console.error('[AI PREDICTION] Error fetching historical data:', error);
      
      // Fallback on error
      const fallbackData = {
        baseTraffic: 'moderate',
        peakHours: ['07:00-09:00', '16:00-18:00'],
        voterTurnout: 0.68,
        publicTransportDensity: 'moderate',
        roadInfrastructure: 'suburban'
      };

      return {
        parish: station.parish || 'Kingston',
        parishData: fallbackData,
        stationType: this.determineStationType(station.name),
        stationMultiplier: 1.0,
        coordinates: {
          lat: station.latitude,
          lng: station.longitude
        },
        historicalDataSource: 'error_fallback'
      };
    }
  }

  private determineStationType(stationName: string): string {
    const name = stationName.toLowerCase();
    if (name.includes('school') || name.includes('college') || name.includes('university')) return 'school';
    if (name.includes('church') || name.includes('cathedral') || name.includes('chapel')) return 'church';
    if (name.includes('community') || name.includes('center') || name.includes('hall')) return 'community_center';
    if (name.includes('government') || name.includes('office') || name.includes('municipal')) return 'government';
    return 'community_center';
  }

  private getTimeContext(hour: number): string {
    if (hour >= 6 && hour < 9) return 'morning_rush';
    if (hour >= 9 && hour < 12) return 'mid_morning';
    if (hour >= 12 && hour < 15) return 'afternoon';
    if (hour >= 15 && hour < 18) return 'evening_rush';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'off_peak';
  }

  private calculateTrafficSeverity(electionData: any, timeContext: string, hour: number): string {
    let severityScore = 0;
    
    // Base parish traffic level
    const parishTraffic = electionData.parishData.baseTraffic;
    if (parishTraffic === 'heavy') severityScore += 3;
    else if (parishTraffic === 'moderate') severityScore += 2;
    else severityScore += 1;
    
    // Station type multiplier
    severityScore *= electionData.stationMultiplier;
    
    // Time of day impact
    const peakHours = electionData.parishData.peakHours;
    const currentTime = `${hour.toString().padStart(2, '0')}:00`;
    const isInPeakHour = peakHours.some((peak: string) => {
      const [start, end] = peak.split('-');
      return currentTime >= start && currentTime < end;
    });
    
    if (isInPeakHour) severityScore += 2;
    if (timeContext.includes('rush')) severityScore += 1;
    
    // Convert to severity categories
    if (severityScore >= 5) return 'critical';
    if (severityScore >= 4) return 'high';
    if (severityScore >= 2.5) return 'medium';
    return 'low';
  }

  private predictFutureSeverity(electionData: any, timeContext: string, futureHour: number): string {
    // Predict severity 2 hours ahead
    const adjustedHour = futureHour % 24;
    const futureTimeContext = this.getTimeContext(adjustedHour);
    
    // Calculate predicted severity with trend analysis
    let baseSeverity = this.calculateTrafficSeverity(electionData, futureTimeContext, adjustedHour);
    
    // Apply trend adjustments for election day patterns
    if (futureTimeContext === 'morning_rush' && electionData.parishData.voterTurnout > 0.7) {
      // High turnout parishes see increased morning traffic
      baseSeverity = this.upgradeSeverity(baseSeverity);
    }
    
    return baseSeverity;
  }

  private upgradeSeverity(current: string): string {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  private generateRiskFactors(electionData: any, timeContext: string): string[] {
    const factors = [];
    
    // Parish-specific factors
    if (electionData.parish === 'Kingston' || electionData.parish === 'St. Andrew') {
      factors.push('Urban congestion in high-density area');
      factors.push('Limited alternative routes during peak hours');
    }
    
    // Station type factors
    if (electionData.stationType === 'school') {
      factors.push('School zone traffic restrictions may apply');
      factors.push('Limited parking availability near educational facilities');
    }
    
    // Time-based factors
    if (timeContext.includes('rush')) {
      factors.push('Commuter traffic overlap with voting hours');
    }
    
    // Election-specific factors
    factors.push('Increased pedestrian activity near polling station');
    factors.push('Potential for observer vehicle concentration');
    
    // Infrastructure factors
    if (electionData.parishData.publicTransportDensity === 'low') {
      factors.push('High dependency on private vehicles due to limited public transport');
    }
    
    return factors;
  }

  private generateObserverRecommendations(electionData: any, currentSeverity: string, predictedSeverity: string): string[] {
    const recommendations = [];
    
    // Time-based recommendations
    if (currentSeverity === 'high' || currentSeverity === 'critical') {
      recommendations.push('Allow extra 15-20 minutes for travel to this station');
      recommendations.push('Consider alternative routes via secondary roads');
    }
    
    if (predictedSeverity === 'critical') {
      recommendations.push('Plan station visit outside peak voting hours if possible');
    }
    
    // Station type recommendations
    if (electionData.stationType === 'school') {
      recommendations.push('Park away from main school entrance to avoid congestion');
      recommendations.push('Use designated observer parking if available');
    }
    
    // Parish-specific recommendations
    if (electionData.parish === 'Kingston') {
      recommendations.push('Consider using public transport during peak hours');
      recommendations.push('Coordinate with other observers to minimize vehicle trips');
    }
    
    // General observer recommendations
    recommendations.push('Monitor real-time traffic updates before departure');
    recommendations.push('Have emergency contact numbers ready for coordination team');
    
    return recommendations;
  }

  private calculateConfidenceScore(electionData: any, station: any): number {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for well-known parishes
    if (['Kingston', 'St. Andrew', 'St. Catherine'].includes(electionData.parish)) {
      confidence += 0.15;
    }
    
    // Higher confidence if we have coordinates
    if (station.latitude && station.longitude) {
      confidence += 0.1;
    }
    
    // Adjust for data completeness
    if (electionData.parishData.voterTurnout) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  private getPredictionHorizon(predictionType: string): string {
    switch (predictionType) {
      case 'election_day':
        return 'Election day 6:00 AM - 6:00 PM';
      case 'peak_hours':
        return 'Next 4 hours during peak voting times';
      case 'emergency_scenario':
        return 'Next 2 hours for emergency response planning';
      default:
        return 'Next 2-4 hours based on current conditions';
    }
  }

  async getStationPrediction(stationId: number, predictionType: string = 'election_day'): Promise<TrafficPrediction | null> {
    try {
      console.log(`[AI PREDICTION] Getting individual prediction for station ${stationId}`);
      
      const station = await storage.getPollingStationById(stationId);
      if (!station) {
        console.error(`[AI PREDICTION] Station ${stationId} not found`);
        return null;
      }

      return await this.generateStationPrediction(station, predictionType);
    } catch (error) {
      console.error(`[AI PREDICTION] Error getting station prediction for ${stationId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
const aiTrafficPredictionService = new AITrafficPredictionService();
export { aiTrafficPredictionService };