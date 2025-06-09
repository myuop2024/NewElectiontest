import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Database, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface SystemLogsProps {
  auditLogs: any[];
  isLoading: boolean;
}

export default function SystemLogs({ auditLogs, isLoading }: SystemLogsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityId && log.entityId.includes(searchTerm));
    
    const matchesAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'status-active';
    if (action.includes('UPDATE')) return 'status-warning';
    if (action.includes('DELETE')) return 'status-alert';
    if (action.includes('LOGIN')) return 'status-neutral';
    return 'status-neutral';
  };

  const exportLogs = () => {
    console.log("Exporting logs...");
    // In a real implementation, this would export filtered logs
  };

  const clearOldLogs = () => {
    console.log("Clearing old logs...");
    // In a real implementation, this would clear logs older than X days
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Log Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{auditLogs.length}</p>
              <p className="text-sm text-muted-foreground">Total Logs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {auditLogs.filter(log => log.action.includes('CREATE')).length}
              </p>
              <p className="text-sm text-muted-foreground">Create Actions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {auditLogs.filter(log => log.action.includes('UPDATE')).length}
              </p>
              <p className="text-sm text-muted-foreground">Update Actions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {auditLogs.filter(log => log.action.includes('DELETE')).length}
              </p>
              <p className="text-sm text-muted-foreground">Delete Actions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Logs */}
      <Card className="government-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              System Audit Logs
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={clearOldLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Old Logs
              </Button>
              <Button onClick={exportLogs} className="btn-caffe-primary">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by action, entity, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create Actions</SelectItem>
                <SelectItem value="update">Update Actions</SelectItem>
                <SelectItem value="delete">Delete Actions</SelectItem>
                <SelectItem value="login">Login Actions</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="check_in">Check In</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="text-sm">
                      {log.userId ? `User ${log.userId}` : 'System'}
                    </td>
                    <td>
                      <Badge className={`status-indicator ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="text-sm capitalize">{log.entityType}</td>
                    <td className="text-sm font-mono">{log.entityId || '-'}</td>
                    <td className="text-sm text-muted-foreground">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="text-sm">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => console.log('View details:', log)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || actionFilter !== 'all' || entityFilter !== 'all'
                  ? "No logs match the current filters"
                  : "No audit logs found"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
