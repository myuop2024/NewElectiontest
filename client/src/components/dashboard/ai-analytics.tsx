import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Circle } from "lucide-react";

export default function AIAnalytics() {
  // Mock AI analytics data - in real app this would come from AI service
  const analytics = {
    voterTurnoutPrediction: 72.3,
    sentiment: {
      positive: 89,
      neutral: 8,
      negative: 3
    },
    keyInsights: [
      "High compliance rate across all stations",
      "Minimal queue times reported",
      "Weather conditions favorable", 
      "Security presence adequate"
    ],
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  };

  return (
    <Card className="government-card">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">AI Analytics</CardTitle>
          <div className="flex items-center space-x-2">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="text-xs text-green-600">Live Processing</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold caffe-primary">Voter Turnout Prediction</h4>
              <span className="text-xs text-muted-foreground">Updated 5 min ago</span>
            </div>
            <p className="text-2xl font-bold caffe-primary">{analytics.voterTurnoutPrediction}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on current patterns and historical data
            </p>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold caffe-secondary">Report Sentiment</h4>
              <span className="text-xs text-muted-foreground">AI Analysis</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-green-600">Positive</span>
                <span className="text-xs font-bold text-green-600">{analytics.sentiment.positive}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-green-500 h-1.5 rounded-full" 
                  style={{ width: `${analytics.sentiment.positive}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-yellow-600">Neutral</span>
                <span className="text-xs font-bold text-yellow-600">{analytics.sentiment.neutral}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-yellow-500 h-1.5 rounded-full" 
                  style={{ width: `${analytics.sentiment.neutral}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-red-600">Negative</span>
                <span className="text-xs font-bold text-red-600">{analytics.sentiment.negative}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-red-500 h-1.5 rounded-full" 
                  style={{ width: `${analytics.sentiment.negative}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-2">Key Insights</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {analytics.keyInsights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
