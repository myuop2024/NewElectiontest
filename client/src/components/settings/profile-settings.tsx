import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Edit, Save, X, Shield, CreditCard } from "lucide-react";

interface ProfileSettingsProps {
  user: any;
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    trn: user?.trn || ''
  });
  const { toast } = useToast();

  const handleSave = () => {
    // In a real implementation, this would update the user profile
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated",
    });
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      trn: user?.trn || ''
    });
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'pending': return 'status-warning';
      case 'suspended': return 'status-alert';
      default: return 'status-neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </span>
            {!isEditing ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="btn-caffe-primary"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="text-lg font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h3>
              <p className="text-muted-foreground">Observer ID: {user?.observerId}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={`status-indicator ${getStatusColor(user?.status)}`}>
                  {user?.status}
                </Badge>
                <Badge variant="outline">{user?.role}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-field">
              <Label className="form-label">First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={!isEditing}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label className="form-label">Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={!isEditing}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label className="form-label">Email Address</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label className="form-label">Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={!isEditing}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label className="form-label">TRN (Tax Registration Number)</Label>
              <Input
                value={formData.trn}
                onChange={(e) => setFormData(prev => ({ ...prev, trn: e.target.value }))}
                disabled={!isEditing}
                className="form-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">KYC Verification</h4>
              <Badge className={`status-indicator ${getStatusColor(user?.kycStatus)}`}>
                {user?.kycStatus === 'verified' ? 'Verified' : 'Pending'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Identity verification status
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Training Status</h4>
              <Badge className={`status-indicator ${getStatusColor(user?.trainingStatus)}`}>
                {user?.trainingStatus === 'completed' ? 'Certified' : 'In Progress'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Observer certification status
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Last Login</h4>
              <p className="text-sm">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Device Binding</h4>
              <p className="text-sm">
                {user?.deviceId ? 'Device Registered' : 'No Device Bound'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Financial Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Security Notice:</strong> Financial information is encrypted and masked for security. 
              Contact system administrator to update banking details.
            </p>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Banking Details</span>
              <span className="text-sm text-muted-foreground">**** **** **** 1234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Payment Method</span>
              <span className="text-sm text-muted-foreground">Bank Transfer</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
