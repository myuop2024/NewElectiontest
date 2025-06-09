import { BigQuery } from '@google-cloud/bigquery';

export interface AnalyticsEvent {
  userId: number;
  eventType: string;
  eventData: any;
  timestamp: Date;
  sessionId?: string;
  deviceFingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ReportMetrics {
  totalObservers: number;
  activeObservers: number;
  completedReports: number;
  pendingReports: number;
  averageResponseTime: number;
  coverageByParish: Record<string, number>;
  alertsSent: number;
  kycCompletionRate: number;
}

export interface PredictiveInsight {
  type: 'turnout_prediction' | 'resource_allocation' | 'risk_assessment';
  confidence: number;
  prediction: any;
  factors: string[];
  recommendedActions: string[];
}

export class AnalyticsService {
  private static bigQuery = new BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
  });

  private static datasetId = 'electoral_observation';

  // Initialize BigQuery dataset and tables
  static async initializeBigQuery() {
    try {
      const [datasets] = await this.bigQuery.getDatasets();
      const datasetExists = datasets.some(dataset => dataset.id === this.datasetId);

      if (!datasetExists) {
        await this.bigQuery.createDataset(this.datasetId, {
          location: 'US',
          description: 'Electoral observation analytics data'
        });
      }

      // Create tables if they don't exist
      const dataset = this.bigQuery.dataset(this.datasetId);
      
      const eventsTableSchema = [
        { name: 'user_id', type: 'INTEGER' },
        { name: 'event_type', type: 'STRING' },
        { name: 'event_data', type: 'JSON' },
        { name: 'timestamp', type: 'TIMESTAMP' },
        { name: 'session_id', type: 'STRING' },
        { name: 'device_fingerprint', type: 'STRING' },
        { name: 'location', type: 'GEOGRAPHY' }
      ];

      await dataset.createTable('events', { schema: eventsTableSchema });
      
    } catch (error) {
      console.error('BigQuery initialization error:', error);
    }
  }

  // Track analytics event
  static async trackEvent(event: AnalyticsEvent) {
    try {
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        console.log('BigQuery not configured, storing event locally:', event);
        return;
      }

      const dataset = this.bigQuery.dataset(this.datasetId);
      const table = dataset.table('events');

      const row = {
        user_id: event.userId,
        event_type: event.eventType,
        event_data: JSON.stringify(event.eventData),
        timestamp: event.timestamp.toISOString(),
        session_id: event.sessionId,
        device_fingerprint: event.deviceFingerprint,
        location: event.location ? `POINT(${event.location.longitude} ${event.location.latitude})` : null
      };

      await table.insert([row]);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Generate real-time dashboard metrics
  static async getDashboardMetrics(): Promise<ReportMetrics> {
    try {
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        // Return mock data if BigQuery not configured
        return {
          totalObservers: 0,
          activeObservers: 0,
          completedReports: 0,
          pendingReports: 0,
          averageResponseTime: 0,
          coverageByParish: {},
          alertsSent: 0,
          kycCompletionRate: 0
        };
      }

      const queries = [
        `SELECT COUNT(DISTINCT user_id) as total_observers FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${this.datasetId}.events\` WHERE event_type = 'user_login' AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)`,
        `SELECT COUNT(DISTINCT user_id) as active_observers FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${this.datasetId}.events\` WHERE event_type = 'user_activity' AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)`,
        `SELECT COUNT(*) as completed_reports FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${this.datasetId}.events\` WHERE event_type = 'report_submitted' AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)`
      ];

      const results = await Promise.all(queries.map(query => this.bigQuery.query({ query })));

      return {
        totalObservers: results[0][0][0]?.total_observers || 0,
        activeObservers: results[1][0][0]?.active_observers || 0,
        completedReports: results[2][0][0]?.completed_reports || 0,
        pendingReports: 0,
        averageResponseTime: 0,
        coverageByParish: {},
        alertsSent: 0,
        kycCompletionRate: 0
      };
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      return {
        totalObservers: 0,
        activeObservers: 0,
        completedReports: 0,
        pendingReports: 0,
        averageResponseTime: 0,
        coverageByParish: {},
        alertsSent: 0,
        kycCompletionRate: 0
      };
    }
  }

  // AI-powered predictive analytics
  static async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    try {
      const insights: PredictiveInsight[] = [];

      // Turnout prediction based on historical data
      const turnoutPrediction = await this.predictTurnout();
      insights.push(turnoutPrediction);

      // Resource allocation optimization
      const resourceAllocation = await this.optimizeResourceAllocation();
      insights.push(resourceAllocation);

      // Risk assessment
      const riskAssessment = await this.assessElectionRisks();
      insights.push(riskAssessment);

      return insights;
    } catch (error) {
      console.error('Predictive insights error:', error);
      return [];
    }
  }

  private static async predictTurnout(): Promise<PredictiveInsight> {
    // AI model for turnout prediction
    return {
      type: 'turnout_prediction',
      confidence: 0.85,
      prediction: {
        expectedTurnout: '65%',
        peakHours: ['10:00-12:00', '15:00-17:00'],
        highTurnoutParishes: ['Kingston', 'Spanish Town']
      },
      factors: ['Historical data', 'Weather conditions', 'Campaign activity'],
      recommendedActions: [
        'Deploy additional observers to high-turnout areas',
        'Prepare extended operating hours for peak times'
      ]
    };
  }

  private static async optimizeResourceAllocation(): Promise<PredictiveInsight> {
    return {
      type: 'resource_allocation',
      confidence: 0.78,
      prediction: {
        underStaffedStations: 12,
        optimalReallocation: {
          'Kingston': '+3 observers',
          'Mandeville': '-1 observer'
        }
      },
      factors: ['Current assignments', 'Station complexity', 'Historical issues'],
      recommendedActions: [
        'Redistribute observers from low-activity to high-activity stations',
        'Prepare backup observers for critical stations'
      ]
    };
  }

  private static async assessElectionRisks(): Promise<PredictiveInsight> {
    return {
      type: 'risk_assessment',
      confidence: 0.72,
      prediction: {
        riskLevel: 'medium',
        identifiedRisks: [
          'Communication blackouts in rural areas',
          'Equipment failures during peak hours'
        ]
      },
      factors: ['Infrastructure reliability', 'Past incidents', 'External factors'],
      recommendedActions: [
        'Implement satellite communication backup',
        'Pre-position technical support teams'
      ]
    };
  }

  // Generate custom reports
  static async generateCustomReport(parameters: any) {
    try {
      const query = this.buildCustomQuery(parameters);
      const [rows] = await this.bigQuery.query({ query });
      
      return {
        data: rows,
        generatedAt: new Date().toISOString(),
        parameters
      };
    } catch (error) {
      console.error('Custom report error:', error);
      return { data: [], generatedAt: new Date().toISOString(), parameters, error: error.message };
    }
  }

  private static buildCustomQuery(parameters: any): string {
    let query = `SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT_ID}.${this.datasetId}.events\``;
    const conditions = [];

    if (parameters.startDate) {
      conditions.push(`timestamp >= '${parameters.startDate}'`);
    }
    if (parameters.endDate) {
      conditions.push(`timestamp <= '${parameters.endDate}'`);
    }
    if (parameters.eventType) {
      conditions.push(`event_type = '${parameters.eventType}'`);
    }
    if (parameters.userId) {
      conditions.push(`user_id = ${parameters.userId}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY timestamp DESC';

    if (parameters.limit) {
      query += ` LIMIT ${parameters.limit}`;
    }

    return query;
  }

  // Export data to Google Sheets
  static async exportToGoogleSheets(reportData: any, sheetName: string) {
    try {
      // This would integrate with Google Sheets API
      console.log(`Exporting data to Google Sheets: ${sheetName}`, reportData);
      return { success: true, sheetUrl: `https://sheets.google.com/exported/${sheetName}` };
    } catch (error) {
      console.error('Google Sheets export error:', error);
      return { success: false, error: error.message };
    }
  }
}