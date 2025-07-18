import { storage } from '../storage';
import { getTrafficService } from './traffic-service';
import { getWeatherService } from './weather-service';
import { XSentimentService } from './x-sentiment-service';

class MapsService {
  private xSentimentService: XSentimentService;

  constructor() {
    this.xSentimentService = new XSentimentService();
  }

  async getHeatMapData() {
    const stations = await storage.getPollingStations();
    const trafficService = getTrafficService();
    const weatherService = getWeatherService();

    const heatMapData = await Promise.all(
      stations.map(async (station) => {
        const [traffic, weather, sentiment, incidents] = await Promise.all([
          trafficService.getPollingStationTraffic(station.id),
          weatherService.getElectoralWeatherSummary(station.parish || 'Kingston'),
          this.xSentimentService.getPollingStationSentimentAnalysis(station.id),
          this.getStationIncidents(station.id),
        ]);

        return {
          ...station,
          traffic,
          weather,
          sentiment,
          incidents,
        };
      })
    );

    return heatMapData;
  }

  private async getStationIncidents(stationId: number) {
    const reports = await storage.getReports();
    const stationReports = reports.filter(
      (report: any) =>
        report.pollingStationId === stationId &&
        new Date(report.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );

    let severity = 'low';
    if (stationReports.length > 5) severity = 'high';
    else if (stationReports.length > 2) severity = 'medium';

    const highPriorityIncidents = stationReports.filter(
      (report: any) => report.priority === 'high' || report.priority === 'critical'
    );

    if (highPriorityIncidents.length > 0) severity = 'high';

    return {
      severity,
      count: stationReports.length,
      highPriority: highPriorityIncidents.length,
      recentIncidents: stationReports.slice(0, 3),
      lastIncident: stationReports[0]?.timestamp || null,
    };
  }
}

export const mapsService = new MapsService();
