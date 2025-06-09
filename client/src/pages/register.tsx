import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddressInput } from "@/components/ui/address-input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Vote, UserCheck, MapPin } from "lucide-react";
import caffeLogo from "@assets/caffe-logo-1__2_-removebg-preview_1749433945433.png";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    trn: "",
    parishId: "",
    address: "",
    community: "",
    role: "indoor_observer"
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch parishes for dropdown
  const { data: parishes } = useQuery({
    queryKey: ["/api/parishes"],
  });

  const selectedParish = parishes?.find((p: any) => p.id.toString() === formData.parishId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!formData.parishId) {
      setError("Please select your parish");
      return;
    }

    if (!formData.address) {
      setError("Please enter your address");
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        ...formData,
        parishId: parseInt(formData.parishId),
        ...(coordinates && {
          latitude: coordinates.lat,
          longitude: coordinates.lng
        })
      };
      await register(registrationData);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-caffe-background p-4">
      <Card className="w-full max-w-2xl government-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex flex-col items-center justify-center space-y-3">
            <img 
              src={caffeLogo} 
              alt="CAFFE Logo" 
              className="w-24 h-24 object-contain"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold caffe-primary">CAFFE</h1>
              <p className="text-xs text-muted-foreground">Citizens Action For Free And Fair Elections</p>
              <p className="text-xs text-muted-foreground">Electoral Observer Platform</p>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">Observer Registration</CardTitle>
          <CardDescription>
            Register as an electoral observer for the 2025 General Election
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="firstName" className="form-label">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="lastName" className="form-label">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Enter your last name"
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-field">
              <Label htmlFor="username" className="form-label">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Choose a username"
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label htmlFor="email" className="form-label">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email address"
                required
                className="form-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="phone" className="form-label">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter your phone number"
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="trn" className="form-label">TRN (Tax Registration Number)</Label>
                <Input
                  id="trn"
                  value={formData.trn}
                  onChange={(e) => handleInputChange("trn", e.target.value)}
                  placeholder="Enter your TRN"
                  className="form-input"
                />
              </div>
            </div>

            {/* Parish Selection */}
            <div className="form-field">
              <Label htmlFor="parish" className="form-label">Parish *</Label>
              <Select value={formData.parishId} onValueChange={(value) => handleInputChange("parishId", value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select your parish" />
                </SelectTrigger>
                <SelectContent>
                  {parishes?.map((parish: any) => (
                    <SelectItem key={parish.id} value={parish.id.toString()}>
                      {parish.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address Input with HERE API */}
            <div className="form-field">
              <AddressInput
                label="Address *"
                value={formData.address}
                onChange={(address, coords) => {
                  handleInputChange("address", address);
                  setCoordinates(coords || null);
                }}
                parish={selectedParish?.name}
                placeholder="Start typing your Jamaican address..."
                required
                className="w-full"
              />
            </div>

            {/* Community/District */}
            <div className="form-field">
              <Label htmlFor="community" className="form-label">Community/District</Label>
              <Input
                id="community"
                value={formData.community}
                onChange={(e) => handleInputChange("community", e.target.value)}
                placeholder="Enter your community or district"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label htmlFor="role" className="form-label">Observer Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select your observer role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor_observer">Indoor Observer</SelectItem>
                  <SelectItem value="roving_observer">Roving Observer</SelectItem>
                  <SelectItem value="parish_coordinator">Parish Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="password" className="form-label">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="confirmPassword" className="form-label">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="form-input"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-caffe-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Register as Observer
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="caffe-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <h4 className="text-sm font-semibold text-yellow-800">Registration Notice</h4>
              </div>
              <p className="text-xs text-yellow-700">
                Your account will undergo KYC verification before activation. 
                You will receive a unique 6-digit Observer ID upon approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
