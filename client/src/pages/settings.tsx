import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Settings as SettingsIcon, User, Bell, Shield, Database } from "lucide-react";
import ProfileSettings from "@/components/settings/profile-settings";
import SystemPreferences from "@/components/settings/system-preferences";

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const { user } = useAuth();

  const settingsSections = [
    {
      id: "profile",
      title: "Profile & Account",
      icon: User,
      description: "Manage your personal information and account details"
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      description: "Configure notification preferences and alerts"
    },
    {
      id: "security",
      title: "Security & Privacy",
      icon: Shield,
      description: "Manage security settings and privacy options"
    },
    {
      id: "system",
      title: "System Preferences",
      icon: Database,
      description: "Application settings and preferences"
    }
  ];

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <Card className="government-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                      activeSection === section.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${
                        activeSection === section.id ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div>
                        <p className={`font-medium text-sm ${
                          activeSection === section.id ? 'text-primary' : 'text-foreground'
                        }`}>
                          {section.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeSection === "profile" && <ProfileSettings user={user} />}
          
          {activeSection === "notifications" && (
            <Card className="government-card">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Alerts</h4>
                      <p className="text-sm text-muted-foreground">Critical alerts via SMS</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">WhatsApp Integration</h4>
                      <p className="text-sm text-muted-foreground">Receive updates via WhatsApp</p>
                    </div>
                    <Button variant="outline" size="sm">Setup</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeSection === "security" && (
            <Card className="government-card">
              <CardHeader>
                <CardTitle>Security & Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Change Password</h4>
                      <p className="text-sm text-muted-foreground">Update your account password</p>
                    </div>
                    <Button variant="outline" size="sm">Change</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">Setup</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Device Management</h4>
                      <p className="text-sm text-muted-foreground">Manage authorized devices</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Privacy Settings</h4>
                      <p className="text-sm text-muted-foreground">Control data sharing and privacy</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeSection === "system" && <SystemPreferences canAccessAdmin={canAccessAdmin} />}
        </div>
      </div>
    </div>
  );
}
