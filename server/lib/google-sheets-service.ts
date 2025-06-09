import { google } from 'googleapis';
import { storage } from '../storage';

interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  keyFile?: string;
  clientEmail?: string;
  privateKey?: string;
}

interface IncidentRow {
  timestamp: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  location: string;
  parish: string;
  pollingStation: string;
  reporterName: string;
  contactInfo: string;
  witnessCount: string;
  evidence: string;
  status: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Use service account authentication
      const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    } catch (error) {
      console.error('Failed to initialize Google Sheets auth:', error);
      throw new Error(`Google Sheets authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.auth.getClient();
      return true;
    } catch (error) {
      console.error('Google Sheets connection validation failed:', error);
      return false;
    }
  }

  async importIncidents(config: GoogleSheetsConfig): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No data found in the specified range');
      }

      // Assume first row contains headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Map column indices
      const columnMap = this.createColumnMapping(headers);

      for (let i = 0; i < dataRows.length; i++) {
        try {
          const row = dataRows[i];
          const incident = this.parseIncidentRow(row, columnMap);
          
          if (await this.isDuplicateIncident(incident)) {
            results.skipped++;
            continue;
          }

          await this.createIncidentFromSheet(incident);
          results.imported++;
        } catch (error) {
          results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Google Sheets import error:', error);
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createColumnMapping(headers: string[]): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    // Map common column names to standardized keys
    const columnMappings = {
      timestamp: ['timestamp', 'date', 'time', 'created', 'datetime'],
      title: ['title', 'subject', 'incident_title', 'summary'],
      description: ['description', 'details', 'incident_description', 'notes'],
      type: ['type', 'category', 'incident_type', 'classification'],
      priority: ['priority', 'severity', 'urgency', 'level'],
      location: ['location', 'address', 'place', 'venue'],
      parish: ['parish', 'district', 'constituency', 'region'],
      pollingStation: ['polling_station', 'station', 'station_code', 'station_id'],
      reporterName: ['reporter', 'reported_by', 'observer', 'name'],
      contactInfo: ['contact', 'phone', 'email', 'contact_info'],
      witnessCount: ['witnesses', 'witness_count', 'observers_present'],
      evidence: ['evidence', 'attachments', 'media', 'documentation'],
      status: ['status', 'state', 'progress']
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      
      for (const [key, variants] of Object.entries(columnMappings)) {
        if (variants.some(variant => normalizedHeader.includes(variant))) {
          mapping[key] = index;
          break;
        }
      }
    });

    return mapping;
  }

  private parseIncidentRow(row: string[], columnMap: Record<string, number>): IncidentRow {
    const getValue = (key: string, defaultValue = '') => {
      const index = columnMap[key];
      return index !== undefined && row[index] ? row[index].trim() : defaultValue;
    };

    return {
      timestamp: getValue('timestamp') || new Date().toISOString(),
      title: getValue('title', 'Imported Incident'),
      description: getValue('description', 'No description provided'),
      type: this.normalizeIncidentType(getValue('type', 'other')),
      priority: this.normalizePriority(getValue('priority', 'medium')),
      location: getValue('location'),
      parish: getValue('parish'),
      pollingStation: getValue('pollingStation'),
      reporterName: getValue('reporterName', 'External Source'),
      contactInfo: getValue('contactInfo'),
      witnessCount: getValue('witnessCount', '0'),
      evidence: getValue('evidence'),
      status: getValue('status', 'imported')
    };
  }

  private normalizeIncidentType(type: string): string {
    const typeMap: Record<string, string> = {
      'voter intimidation': 'voter_intimidation',
      'intimidation': 'voter_intimidation',
      'technical': 'technical_malfunction',
      'equipment': 'technical_malfunction',
      'ballot': 'ballot_irregularity',
      'voting': 'ballot_irregularity',
      'procedure': 'procedural_violation',
      'protocol': 'procedural_violation',
      'violence': 'violence',
      'threat': 'violence',
      'bribery': 'bribery',
      'corruption': 'bribery',
      'access': 'accessibility_issue',
      'disability': 'accessibility_issue'
    };

    const normalized = type.toLowerCase().trim();
    
    for (const [key, value] of Object.entries(typeMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    
    return 'other';
  }

  private normalizePriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      'urgent': 'critical',
      'high': 'high',
      'medium': 'medium',
      'normal': 'medium',
      'low': 'low',
      'minor': 'low'
    };

    const normalized = priority.toLowerCase().trim();
    return priorityMap[normalized] || 'medium';
  }

  private async isDuplicateIncident(incident: IncidentRow): Promise<boolean> {
    try {
      // Check for duplicates based on title, timestamp, and description similarity
      const existingReports = await storage.getReports();
      
      return existingReports.some(report => {
        const titleMatch = report.title.toLowerCase() === incident.title.toLowerCase();
        const timeMatch = Math.abs(
          new Date(report.createdAt).getTime() - new Date(incident.timestamp).getTime()
        ) < 300000; // 5 minutes
        
        return titleMatch && timeMatch;
      });
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  }

  private async createIncidentFromSheet(incident: IncidentRow): Promise<void> {
    try {
      // Find or create polling station
      let stationId = 1; // Default
      
      if (incident.pollingStation) {
        const stations = await storage.getPollingStations();
        const station = stations.find(s => 
          s.stationCode === incident.pollingStation || 
          s.name.toLowerCase().includes(incident.pollingStation.toLowerCase())
        );
        
        if (station) {
          stationId = station.id;
        } else {
          // Create new polling station if it doesn't exist
          const parishes = await storage.getParishes();
          const parish = parishes.find(p => 
            p.name.toLowerCase().includes(incident.parish.toLowerCase())
          );
          
          if (parish) {
            const newStation = await storage.createPollingStation({
              stationCode: incident.pollingStation,
              name: `${incident.pollingStation} - ${incident.location}`,
              address: incident.location,
              parishId: parish.id,
              isActive: true
            });
            stationId = newStation.id;
          }
        }
      }

      // Create or find user for external reporter
      let userId = 1; // Default system user
      
      if (incident.reporterName && incident.reporterName !== 'External Source') {
        try {
          const existingUser = await storage.getUserByUsername(incident.reporterName);
          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Create external user account
            const newUser = await storage.createUser({
              username: incident.reporterName,
              email: incident.contactInfo || `${incident.reporterName.replace(/\s+/g, '').toLowerCase()}@external.import`,
              password: 'external_import',
              phone: incident.contactInfo || '',
              parishId: 1,
              role: 'external_reporter',
              firstName: incident.reporterName.split(' ')[0] || incident.reporterName,
              lastName: incident.reporterName.split(' ').slice(1).join(' ') || ''
            });
            userId = newUser.id;
          }
        } catch (error) {
          console.warn('Could not create external user, using default:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Create the incident report
      await storage.createReport({
        userId,
        stationId,
        type: incident.type,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        metadata: JSON.stringify({
          importSource: 'google_sheets',
          originalData: incident,
          importedAt: new Date().toISOString(),
          witnessCount: incident.witnessCount,
          evidence: incident.evidence,
          contactInfo: incident.contactInfo
        })
      });

      // Create audit log
      await storage.createAuditLog({
        action: 'incident_imported_sheets',
        entityType: 'report',
        userId: 1, // System user
        entityId: incident.title,
        ipAddress: 'system'
      });

    } catch (error) {
      console.error('Error creating incident from sheet:', error);
      throw new Error(`Failed to create incident: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testSheetAccess(spreadsheetId: string, range: string): Promise<{
    success: boolean;
    rowCount: number;
    headers: string[];
    error?: string;
  }> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      
      return {
        success: true,
        rowCount: rows.length,
        headers: rows.length > 0 ? rows[0] : [],
      };
    } catch (error) {
      return {
        success: false,
        rowCount: 0,
        headers: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async schedulePeriodicImport(config: GoogleSheetsConfig, intervalMinutes: number = 30): Promise<void> {
    // Note: In production, you'd use a proper job scheduler like node-cron
    console.log(`Scheduling periodic import every ${intervalMinutes} minutes for sheet ${config.spreadsheetId}`);
    
    setInterval(async () => {
      try {
        console.log('Running scheduled Google Sheets import...');
        const results = await this.importIncidents(config);
        console.log('Import results:', results);
        
        // Create audit log for scheduled import
        await storage.createAuditLog({
          action: 'scheduled_sheets_import',
          entityType: 'system',
          userId: 1,
          entityId: config.spreadsheetId,
          ipAddress: 'system'
        });
      } catch (error) {
        console.error('Scheduled import failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

export const googleSheetsService = new GoogleSheetsService();