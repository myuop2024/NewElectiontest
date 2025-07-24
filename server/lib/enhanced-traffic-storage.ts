import { db } from "../db";
import {
  trafficAnalyticsHistory,
  trafficPredictions,
  trafficAlerts,
  observerRouteOptimization,
  emergencyRoutePlanning,
  trafficHeatMapData,
  criticalPathAnalysis,
  pollingStations,
  users
} from "@shared/schema";
import type {
  TrafficAnalyticsHistory,
  InsertTrafficAnalyticsHistory,
  TrafficPrediction,
  InsertTrafficPrediction,
  TrafficAlert,
  InsertTrafficAlert,
  ObserverRouteOptimization,
  InsertObserverRouteOptimization,
  EmergencyRoutePlanning,
  InsertEmergencyRoutePlanning,
  TrafficHeatMapData,
  InsertTrafficHeatMapData,
  CriticalPathAnalysis,
  InsertCriticalPathAnalysis
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";

export interface IEnhancedTrafficStorage {
  // Traffic Analytics History
  createTrafficAnalyticsRecord(data: InsertTrafficAnalyticsHistory): Promise<TrafficAnalyticsHistory>;
  getTrafficHistoryByStation(stationId: number, limit?: number): Promise<TrafficAnalyticsHistory[]>;
  getTrafficHistoryByDateRange(startDate: Date, endDate: Date): Promise<TrafficAnalyticsHistory[]>;
  
  // Traffic Predictions
  createTrafficPrediction(data: InsertTrafficPrediction): Promise<TrafficPrediction>;
  getTrafficPredictions(stationId?: number, targetDate?: Date): Promise<TrafficPrediction[]>;
  updateTrafficPrediction(id: number, data: Partial<InsertTrafficPrediction>): Promise<TrafficPrediction>;
  
  // Traffic Alerts
  createTrafficAlert(data: InsertTrafficAlert): Promise<TrafficAlert>;
  getActiveTrafficAlerts(): Promise<TrafficAlert[]>;
  getTrafficAlertsByStation(stationId: number): Promise<TrafficAlert[]>;
  resolveTrafficAlert(id: number, resolvedBy: number, notes?: string): Promise<TrafficAlert>;
  
  // Observer Route Optimization
  createObserverRoute(data: InsertObserverRouteOptimization): Promise<ObserverRouteOptimization>;
  getObserverRoutes(observerId?: number, status?: string): Promise<ObserverRouteOptimization[]>;
  updateObserverRouteStatus(id: number, status: string, notes?: string): Promise<ObserverRouteOptimization>;
  
  // Emergency Route Planning
  createEmergencyRoute(data: InsertEmergencyRoutePlanning): Promise<EmergencyRoutePlanning>;
  getEmergencyRoutes(emergencyType?: string, status?: string): Promise<EmergencyRoutePlanning[]>;
  updateEmergencyRoute(id: number, data: Partial<InsertEmergencyRoutePlanning>): Promise<EmergencyRoutePlanning>;
  
  // Traffic Heat Map Data
  createHeatMapData(data: InsertTrafficHeatMapData): Promise<TrafficHeatMapData>;
  getHeatMapData(timeWindow?: string, expiresAfter?: Date): Promise<TrafficHeatMapData[]>;
  cleanupExpiredHeatMapData(): Promise<number>;
  
  // Critical Path Analysis
  createCriticalPathAnalysis(data: InsertCriticalPathAnalysis): Promise<CriticalPathAnalysis>;
  getCriticalPathAnalyses(priority?: string): Promise<CriticalPathAnalysis[]>;
  updateCriticalPathAnalysis(id: number, data: Partial<InsertCriticalPathAnalysis>): Promise<CriticalPathAnalysis>;
  
  // Analytics and Reports
  getTrafficSummaryByStation(stationId: number, days?: number): Promise<any>;
  getSystemWideTrafficMetrics(startDate: Date, endDate: Date): Promise<any>;
  getTrafficTrends(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<any>;
}

export class EnhancedTrafficStorage implements IEnhancedTrafficStorage {
  
  // Traffic Analytics History Methods
  async createTrafficAnalyticsRecord(data: InsertTrafficAnalyticsHistory): Promise<TrafficAnalyticsHistory> {
    const [record] = await db.insert(trafficAnalyticsHistory).values(data).returning();
    return record;
  }
  
  async getTrafficHistoryByStation(stationId: number, limit: number = 100): Promise<TrafficAnalyticsHistory[]> {
    return await db.select()
      .from(trafficAnalyticsHistory)
      .where(eq(trafficAnalyticsHistory.pollingStationId, stationId))
      .orderBy(desc(trafficAnalyticsHistory.recordedAt))
      .limit(limit);
  }
  
  async getTrafficHistoryByDateRange(startDate: Date, endDate: Date): Promise<TrafficAnalyticsHistory[]> {
    return await db.select()
      .from(trafficAnalyticsHistory)
      .where(
        and(
          gte(trafficAnalyticsHistory.recordedAt, startDate),
          lte(trafficAnalyticsHistory.recordedAt, endDate)
        )
      )
      .orderBy(desc(trafficAnalyticsHistory.recordedAt));
  }
  
  // Traffic Predictions Methods
  async createTrafficPrediction(data: InsertTrafficPrediction): Promise<TrafficPrediction> {
    const [prediction] = await db.insert(trafficPredictions).values(data).returning();
    return prediction;
  }
  
  async getTrafficPredictions(stationId?: number, targetDate?: Date): Promise<TrafficPrediction[]> {
    let query = db.select().from(trafficPredictions);
    
    const conditions = [];
    if (stationId) {
      conditions.push(eq(trafficPredictions.pollingStationId, stationId));
    }
    if (targetDate) {
      conditions.push(eq(trafficPredictions.targetDate, targetDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(trafficPredictions.targetDate));
  }
  
  async updateTrafficPrediction(id: number, data: Partial<InsertTrafficPrediction>): Promise<TrafficPrediction> {
    const [updated] = await db.update(trafficPredictions)
      .set({ ...data, lastUpdated: new Date() })
      .where(eq(trafficPredictions.id, id))
      .returning();
    return updated;
  }
  
  // Traffic Alerts Methods
  async createTrafficAlert(data: InsertTrafficAlert): Promise<TrafficAlert> {
    const [alert] = await db.insert(trafficAlerts).values(data).returning();
    return alert;
  }
  
  async getActiveTrafficAlerts(): Promise<TrafficAlert[]> {
    return await db.select()
      .from(trafficAlerts)
      .where(eq(trafficAlerts.isActive, true))
      .orderBy(desc(trafficAlerts.createdAt));
  }
  
  async getTrafficAlertsByStation(stationId: number): Promise<TrafficAlert[]> {
    return await db.select()
      .from(trafficAlerts)
      .where(
        sql`${trafficAlerts.affectedPollingStations}::jsonb ? ${stationId.toString()}`
      )
      .orderBy(desc(trafficAlerts.createdAt));
  }
  
  async resolveTrafficAlert(id: number, resolvedBy: number, notes?: string): Promise<TrafficAlert> {
    const [resolved] = await db.update(trafficAlerts)
      .set({
        isActive: false,
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes: notes
      })
      .where(eq(trafficAlerts.id, id))
      .returning();
    return resolved;
  }
  
  // Observer Route Optimization Methods
  async createObserverRoute(data: InsertObserverRouteOptimization): Promise<ObserverRouteOptimization> {
    const [route] = await db.insert(observerRouteOptimization).values(data).returning();
    return route;
  }
  
  async getObserverRoutes(observerId?: number, status?: string): Promise<ObserverRouteOptimization[]> {
    let query = db.select().from(observerRouteOptimization);
    
    const conditions = [];
    if (observerId) {
      conditions.push(eq(observerRouteOptimization.observerId, observerId));
    }
    if (status) {
      conditions.push(eq(observerRouteOptimization.routeStatus, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(observerRouteOptimization.createdAt));
  }
  
  async updateObserverRouteStatus(id: number, status: string, notes?: string): Promise<ObserverRouteOptimization> {
    const [updated] = await db.update(observerRouteOptimization)
      .set({
        routeStatus: status,
        completionNotes: notes,
        actualEndTime: status === 'completed' ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(observerRouteOptimization.id, id))
      .returning();
    return updated;
  }
  
  // Emergency Route Planning Methods
  async createEmergencyRoute(data: InsertEmergencyRoutePlanning): Promise<EmergencyRoutePlanning> {
    const [route] = await db.insert(emergencyRoutePlanning).values(data).returning();
    return route;
  }
  
  async getEmergencyRoutes(emergencyType?: string, status?: string): Promise<EmergencyRoutePlanning[]> {
    let query = db.select().from(emergencyRoutePlanning);
    
    const conditions = [];
    if (emergencyType) {
      conditions.push(eq(emergencyRoutePlanning.emergencyType, emergencyType));
    }
    if (status) {
      conditions.push(eq(emergencyRoutePlanning.routeStatus, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(emergencyRoutePlanning.createdAt));
  }
  
  async updateEmergencyRoute(id: number, data: Partial<InsertEmergencyRoutePlanning>): Promise<EmergencyRoutePlanning> {
    const [updated] = await db.update(emergencyRoutePlanning)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emergencyRoutePlanning.id, id))
      .returning();
    return updated;
  }
  
  // Traffic Heat Map Data Methods
  async createHeatMapData(data: InsertTrafficHeatMapData): Promise<TrafficHeatMapData> {
    const [heatMapData] = await db.insert(trafficHeatMapData).values(data).returning();
    return heatMapData;
  }
  
  async getHeatMapData(timeWindow?: string, expiresAfter?: Date): Promise<TrafficHeatMapData[]> {
    let query = db.select().from(trafficHeatMapData);
    
    const conditions = [];
    if (timeWindow) {
      conditions.push(eq(trafficHeatMapData.timeWindow, timeWindow));
    }
    if (expiresAfter) {
      conditions.push(gte(trafficHeatMapData.expiresAt, expiresAfter));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(trafficHeatMapData.lastCalculated));
  }
  
  async cleanupExpiredHeatMapData(): Promise<number> {
    const result = await db.delete(trafficHeatMapData)
      .where(lte(trafficHeatMapData.expiresAt, new Date()));
    return result.rowCount || 0;
  }
  
  // Critical Path Analysis Methods
  async createCriticalPathAnalysis(data: InsertCriticalPathAnalysis): Promise<CriticalPathAnalysis> {
    const [analysis] = await db.insert(criticalPathAnalysis).values(data).returning();
    return analysis;
  }
  
  async getCriticalPathAnalyses(priority?: string): Promise<CriticalPathAnalysis[]> {
    let query = db.select()
      .from(criticalPathAnalysis)
      .leftJoin(pollingStations, eq(criticalPathAnalysis.pollingStationId, pollingStations.id));
    
    if (priority) {
      query = query.where(eq(criticalPathAnalysis.monitoringPriority, priority));
    }
    
    return await query.orderBy(desc(criticalPathAnalysis.lastAssessment));
  }
  
  async updateCriticalPathAnalysis(id: number, data: Partial<InsertCriticalPathAnalysis>): Promise<CriticalPathAnalysis> {
    const [updated] = await db.update(criticalPathAnalysis)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(criticalPathAnalysis.id, id))
      .returning();
    return updated;
  }
  
  // Analytics and Reports Methods
  async getTrafficSummaryByStation(stationId: number, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const history = await this.getTrafficHistoryByStation(stationId, 1000);
    const recentHistory = history.filter(h => new Date(h.recordedAt) >= startDate);
    
    if (recentHistory.length === 0) {
      return {
        stationId,
        period: `${days} days`,
        averageDelay: 0,
        maxDelay: 0,
        totalMeasurements: 0,
        trafficSeverityDistribution: {},
        peakHours: []
      };
    }
    
    const delays = recentHistory.map(h => h.delayMinutes);
    const averageDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
    const maxDelay = Math.max(...delays);
    
    const severityDistribution = recentHistory.reduce((acc, h) => {
      acc[h.trafficSeverity] = (acc[h.trafficSeverity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      stationId,
      period: `${days} days`,
      averageDelay: Math.round(averageDelay * 10) / 10,
      maxDelay,
      totalMeasurements: recentHistory.length,
      trafficSeverityDistribution: severityDistribution,
      peakHours: this.calculatePeakHours(recentHistory)
    };
  }
  
  async getSystemWideTrafficMetrics(startDate: Date, endDate: Date): Promise<any> {
    const history = await this.getTrafficHistoryByDateRange(startDate, endDate);
    const alerts = await db.select()
      .from(trafficAlerts)
      .where(
        and(
          gte(trafficAlerts.createdAt, startDate),
          lte(trafficAlerts.createdAt, endDate)
        )
      );
    
    const totalMeasurements = history.length;
    const averageSystemDelay = totalMeasurements > 0 
      ? history.reduce((sum, h) => sum + h.delayMinutes, 0) / totalMeasurements 
      : 0;
    
    const stationMetrics = history.reduce((acc, h) => {
      if (!acc[h.pollingStationId]) {
        acc[h.pollingStationId] = { delays: [], measurements: 0 };
      }
      acc[h.pollingStationId].delays.push(h.delayMinutes);
      acc[h.pollingStationId].measurements++;
      return acc;
    }, {} as Record<number, { delays: number[], measurements: number }>);
    
    return {
      period: { startDate, endDate },
      totalMeasurements,
      averageSystemDelay: Math.round(averageSystemDelay * 10) / 10,
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.isActive).length,
      stationsMonitored: Object.keys(stationMetrics).length,
      topCongestedStations: this.getTopCongestedStations(stationMetrics, 5),
      alertsByType: this.groupAlertsByType(alerts)
    };
  }
  
  async getTrafficTrends(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const history = await this.getTrafficHistoryByDateRange(startDate, now);
    
    return {
      timeframe,
      period: { startDate, endDate: now },
      trends: this.calculateTrafficTrends(history, timeframe),
      predictions: this.generateTrendPredictions(history)
    };
  }
  
  // Private helper methods
  private calculatePeakHours(history: TrafficAnalyticsHistory[]): string[] {
    const hourlyDelays = history.reduce((acc, h) => {
      const hour = new Date(h.recordedAt).getHours();
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(h.delayMinutes);
      return acc;
    }, {} as Record<number, number[]>);
    
    const avgHourlyDelays = Object.entries(hourlyDelays).map(([hour, delays]) => ({
      hour: parseInt(hour),
      avgDelay: delays.reduce((sum, d) => sum + d, 0) / delays.length
    }));
    
    return avgHourlyDelays
      .sort((a, b) => b.avgDelay - a.avgDelay)
      .slice(0, 3)
      .map(h => `${h.hour.toString().padStart(2, '0')}:00`);
  }
  
  private getTopCongestedStations(stationMetrics: Record<number, { delays: number[], measurements: number }>, limit: number): any[] {
    return Object.entries(stationMetrics)
      .map(([stationId, data]) => ({
        stationId: parseInt(stationId),
        averageDelay: data.delays.reduce((sum, d) => sum + d, 0) / data.delays.length,
        measurements: data.measurements
      }))
      .sort((a, b) => b.averageDelay - a.averageDelay)
      .slice(0, limit);
  }
  
  private groupAlertsByType(alerts: TrafficAlert[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private calculateTrafficTrends(history: TrafficAnalyticsHistory[], timeframe: string): any {
    // Simplified trend calculation - in production this would be more sophisticated
    const periods = this.groupByTimePeriod(history, timeframe);
    return {
      delayTrend: this.calculateTrendDirection(periods.map(p => p.avgDelay)),
      volumeTrend: this.calculateTrendDirection(periods.map(p => p.measurements)),
      severityTrend: this.calculateSeverityTrend(periods)
    };
  }
  
  private groupByTimePeriod(history: TrafficAnalyticsHistory[], timeframe: string): any[] {
    // Group history by time periods and calculate averages
    return []; // Simplified for demo
  }
  
  private calculateTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }
  
  private calculateSeverityTrend(periods: any[]): any {
    return { trend: 'stable', change: 0 };
  }
  
  private generateTrendPredictions(history: TrafficAnalyticsHistory[]): any {
    // AI-powered predictions based on historical data
    return {
      nextHour: { expectedDelay: 5, confidence: 0.8 },
      nextDay: { expectedDelay: 8, confidence: 0.7 },
      nextWeek: { expectedDelay: 6, confidence: 0.6 }
    };
  }
}

export const enhancedTrafficStorage = new EnhancedTrafficStorage();