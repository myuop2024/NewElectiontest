import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Vote } from "lucide-react";
import caffeLogo from "@assets/caffe-logo-1__2_-removebg-preview_1749433945433.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ username, password });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-caffe-background p-4">
      <Card className="w-full max-w-md government-card">
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
          <CardTitle className="text-xl font-semibold">Observer Login</CardTitle>
          <CardDescription>
            Sign in to access the electoral observation system
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-field">
              <Label htmlFor="username" className="form-label">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <Label htmlFor="password" className="form-label">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="form-input"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full btn-caffe-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="caffe-primary hover:underline font-medium">
                Register as Observer
              </Link>
            </p>
            
            <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
              <h4 className="text-sm font-semibold caffe-secondary mb-2">Emergency Contact</h4>
              <p className="text-xs text-muted-foreground mb-3">
                For technical support or urgent assistance
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                <i className="fas fa-phone mr-2"></i>
                Call Election Center
              </Button>
            </div>

            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <h4 className="text-sm font-semibold caffe-primary mb-2">Active Election</h4>
              <p className="text-xs text-muted-foreground">2024 General Election</p>
              <p className="text-xs text-muted-foreground">December 15, 2024</p>
              <div className="mt-2 flex items-center text-xs text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 pulse-slow"></div>
                System Active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
