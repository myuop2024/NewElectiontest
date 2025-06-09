import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface ChartsProps {
  reports: any[];
  stations: any[];
  timeRange: string;
  reportType: string;
}

export default function Charts({ reports, stations, timeRange, reportType }: ChartsProps) {
  // Process data for charts
  const processReportsData = () => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredReports = reports.filter(report => {
      const reportDate = new Date(report.createdAt);
      return reportDate >= last24Hours && (reportType === 'all' || report.type === reportType);
    });

    // Group by hour for line chart
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const reportsInHour = filteredReports.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= hourStart && reportDate < hourEnd;
      });

      hourlyData.push({
        time: hourStart.getHours().toString().padStart(2, '0') + ':00',
        reports: reportsInHour.length,
        hour: hourStart.getHours()
      });
    }

    return hourlyData;
  };

  const processStationData = () => {
    const stationReports = stations.map(station => {
      const stationReportsCount = reports.filter(report => report.stationId === station.id).length;
      return {
        name: station.stationCode,
        reports: stationReportsCount,
        address: station.address.split(',')[0] // Get parish/area
      };
    }).slice(0, 10); // Top 10 stations

    return stationReports;
  };

  const processReportTypes = () => {
    const typeData = reports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeData).map(([type, count]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: count as number
    }));
  };

  const processPriorityData = () => {
    const priorityData = reports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(priorityData).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      count: count as number
    }));
  };

  const hourlyData = processReportsData();
  const stationData = processStationData();
  const reportTypeData = processReportTypes();
  const priorityData = processPriorityData();

  const COLORS = ['hsl(217, 92%, 33%)', 'hsl(158, 85%, 39%)', 'hsl(43, 96%, 56%)', 'hsl(0, 84%, 60%)'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Reports Over Time */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle>Reports Over Time (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="reports" 
                stroke="hsl(217, 92%, 33%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(217, 92%, 33%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Reports by Station */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle>Reports by Station (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stationData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="reports" fill="hsl(158, 85%, 39%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Report Types Distribution */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle>Report Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Levels */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle>Report Priority Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(43, 96%, 56%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
