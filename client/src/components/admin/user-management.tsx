import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Filter, Plus, Edit, Trash2, Shield } from "lucide-react";
import { getStatusColor } from "@/lib/utils";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Note: These queries would need proper admin endpoints
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"], // This endpoint doesn't exist yet but would be admin-only
    enabled: false // Disabled since endpoint doesn't exist
  });

  // Mock user data for demonstration
  const mockUsers = [
    {
      id: 1,
      observerId: "142857",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@email.com",
      role: "observer",
      status: "active",
      kycStatus: "verified",
      trainingStatus: "completed",
      lastLogin: "2024-01-15T10:30:00Z",
      createdAt: "2024-01-01T00:00:00Z"
    },
    {
      id: 2,
      observerId: "234567",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@email.com",
      role: "coordinator",
      status: "active",
      kycStatus: "verified",
      trainingStatus: "completed",
      lastLogin: "2024-01-15T09:15:00Z",
      createdAt: "2024-01-02T00:00:00Z"
    },
    {
      id: 3,
      observerId: "345678",
      firstName: "David",
      lastName: "Brown",
      email: "david.brown@email.com",
      role: "observer",
      status: "pending",
      kycStatus: "pending",
      trainingStatus: "incomplete",
      lastLogin: null,
      createdAt: "2024-01-14T00:00:00Z"
    }
  ];

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.observerId.includes(searchTerm);
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUserAction = (action: string, userId: number) => {
    console.log(`${action} user ${userId}`);
    // In a real implementation, these would be API calls
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
      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{mockUsers.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {mockUsers.filter(u => u.status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {mockUsers.filter(u => u.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {mockUsers.filter(u => u.kycStatus === 'verified').length}
              </p>
              <p className="text-sm text-muted-foreground">KYC Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card className="government-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Management
            </CardTitle>
            <Button className="btn-caffe-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or Observer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="observer">Observer</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Observer ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>KYC</th>
                  <th>Training</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="font-mono">{user.observerId}</td>
                    <td>
                      <Badge variant="outline" className="flex items-center">
                        {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge className={`status-indicator ${getStatusColor(user.status)}`}>
                        {user.status}
                      </Badge>
                    </td>
                    <td>
                      <Badge className={`status-indicator ${getStatusColor(user.kycStatus)}`}>
                        {user.kycStatus}
                      </Badge>
                    </td>
                    <td>
                      <Badge className={`status-indicator ${getStatusColor(user.trainingStatus)}`}>
                        {user.trainingStatus}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleUserAction('edit', user.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleUserAction('delete', user.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? "No users match the current filters"
                  : "No users found"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
