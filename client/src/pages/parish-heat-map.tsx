import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Activity, TrendingUp, BarChart3, Layers, AlertTriangle, Users, Eye } from "lucide-react";
import ParishHeatMap from "@/components/maps/parish-heat-map";

export default function ParishHeatMapPage() {
  const [selectedTab, setSelectedTab] = useState("heatmap");

  // Fetch parish comparison data
  const { data: comparison } = useQuery({
    queryKey: ["/api/analytics/parish-comparison"],
    refetchInterval: 60000,
  });

  // Fetch total statistics
  const { data: totals } = useQuery({
    queryKey: ["/api/analytics/parish-totals"],
    refetchInterval: 30000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parish Election Analytics</h1>
          <p className="text-muted-foreground">
            Real-time parish-level statistics and interactive heat map visualization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Data
          </Badge>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Parishes</p>
                  <p className="text-2xl font-bold">{totals.totalParishes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                  <p className="text-2xl font-bold">{totals.totalIncidents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                  <p className="text-2xl font-bold">{totals.totalCritical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Observers</p>
                  <p className="text-2xl font-bold">{totals.totalObservers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Turnout</p>
                  <p className="text-2xl font-bold">{totals.averageTurnout}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Insights */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="font-medium text-red-800 dark:text-red-200">Most Incidents</p>
                <p className="text-red-600 dark:text-red-400">{comparison.highestIncidents}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-medium text-green-800 dark:text-green-200">Highest Turnout</p>
                <p className="text-green-600 dark:text-green-400">{comparison.highestTurnout}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-medium text-blue-800 dark:text-blue-200">Most Observers</p>
                <p className="text-blue-600 dark:text-blue-400">{comparison.mostObservers}</p>
              </div>
            </div>
            
            {comparison.criticalAlerts && comparison.criticalAlerts.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Critical Alerts</p>
                <div className="space-y-1">
                  {comparison.criticalAlerts.map((alert: string, index: number) => (
                    <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">• {alert}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="heatmap">Interactive Heat Map</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-4">
          <ParishHeatMap 
            height="700px" 
            showLegend={true}
            autoRefresh={true}
            selectedMetric="incidents"
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incidents by Metric Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Parish Comparison by Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <ParishHeatMap 
                  height="400px" 
                  showLegend={false}
                  autoRefresh={true}
                  selectedMetric="incidents"
                />
              </CardContent>
            </Card>

            {/* Turnout by Parish Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Parish Comparison by Voter Turnout</CardTitle>
              </CardHeader>
              <CardContent>
                <ParishHeatMap 
                  height="400px" 
                  showLegend={false}
                  autoRefresh={true}
                  selectedMetric="turnout"
                />
              </CardContent>
            </Card>

            {/* Critical Incidents */}
            <Card>
              <CardHeader>
                <CardTitle>Critical Incidents Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ParishHeatMap 
                  height="400px" 
                  showLegend={false}
                  autoRefresh={true}
                  selectedMetric="critical"
                />
              </CardContent>
            </Card>

            {/* Observer Coverage */}
            <Card>
              <CardHeader>
                <CardTitle>Observer Coverage by Parish</CardTitle>
              </CardHeader>
              <CardContent>
                <ParishHeatMap 
                  height="400px" 
                  showLegend={false}
                  autoRefresh={true}
                  selectedMetric="observers"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Real-time Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time monitoring active</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Auto-refresh: 30s intervals</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}