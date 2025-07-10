import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  ExternalLink, 
  Users, 
  Calendar, 
  Clock, 
  Plus,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Mail,
  GraduationCap
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export function GoogleClassroomHub() {
  const [activeTab, setActiveTab] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: '',
    description: '',
    section: 'Electoral Observer Training'
  });
  
  const { toast } = useToast();

  // Check connection status
  const { data: connectionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/classroom/status"],
    queryFn: async () => {
      const res = await fetch("/api/classroom/status");
      if (!res.ok) throw new Error("Failed to check status");
      return res.json();
    }
  });

  // Get user's courses
  const { data: courses, isLoading: coursesLoading, refetch: refetchCourses } = useQuery({
    queryKey: ["/api/classroom/courses"],
    queryFn: async () => {
      const res = await fetch("/api/classroom/courses");
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch courses");
      }
      return res.json();
    },
    enabled: connectionStatus?.connected
  });

  // Connect to Google Classroom
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/google/classroom");
      if (!res.ok) throw new Error("Failed to get auth URL");
      const data = await res.json();
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      const res = await fetch("/api/classroom/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create course");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Course created successfully!" });
      setShowCreateDialog(false);
      setCourseForm({ name: '', description: '', section: 'Electoral Observer Training' });
      refetchCourses();
    },
    onError: (error) => {
      toast({
        title: "Course creation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Check for connection callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'true') {
      toast({ title: "Google Classroom connected successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/classroom/status"] });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleCreateCourse = () => {
    if (!courseForm.name.trim()) {
      toast({
        title: "Course name required",
        variant: "destructive"
      });
      return;
    }
    createCourseMutation.mutate(courseForm);
  };

  const CourseCard = ({ course }: { course: any }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCourse(course)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{course.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{course.section}</p>
          </div>
          <Badge variant={course.courseState === 'ACTIVE' ? 'default' : 'secondary'}>
            {course.courseState}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {course.description || "No description available"}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{course.enrollmentCode ? 'Open' : 'Closed'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Active</span>
            </div>
          </div>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              window.open(course.alternateLink, '_blank');
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Checking Google Classroom connection...</span>
      </div>
    );
  }

  if (!connectionStatus?.connected) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Connect Google Classroom</CardTitle>
            <p className="text-muted-foreground">
              Access your Google Classroom courses directly within the electoral platform
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Access all your existing courses</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Create new electoral observer training courses</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Manage assignments and student progress</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Integrate with Google Drive and other tools</span>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll be redirected to Google to authorize access to your Classroom account. 
                This allows the platform to display your courses and manage training content.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => connectMutation.mutate()} 
              disabled={connectMutation.isPending}
              className="w-full"
              size="lg"
            >
              {connectMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <GraduationCap className="w-4 h-4 mr-2" />
              )}
              Connect Google Classroom
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Classroom Integration</h1>
          <p className="text-muted-foreground">Manage electoral observer training through Google Classroom</p>
        </div>
        
        <div className="flex items-center gap-4">
          {connectionStatus?.profile && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                {connectionStatus.profile.photoUrl ? (
                  <img 
                    src={connectionStatus.profile.photoUrl} 
                    alt={connectionStatus.profile.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div>
                <div className="font-medium">{connectionStatus.profile.name}</div>
                <div className="text-muted-foreground text-xs">{connectionStatus.profile.emailAddress}</div>
              </div>
            </div>
          )}
          
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="create">Create Course</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Courses</h2>
            <Button onClick={() => refetchCourses()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any Google Classroom courses yet.
                </p>
                <Button onClick={() => setActiveTab("create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Course
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
              <p className="text-muted-foreground">
                Create a new Google Classroom course for electoral observer training
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name</Label>
                <Input
                  id="courseName"
                  placeholder="Electoral Observer Fundamentals"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="courseDescription">Description</Label>
                <Textarea
                  id="courseDescription"
                  placeholder="Comprehensive training course for electoral observers covering procedures, documentation, and incident reporting."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="courseSection">Section</Label>
                <Input
                  id="courseSection"
                  placeholder="Electoral Observer Training"
                  value={courseForm.section}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, section: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleCreateCourse}
                disabled={createCourseMutation.isPending || !courseForm.name.trim()}
                className="w-full"
              >
                {createCourseMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Course
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Classroom Settings</CardTitle>
              <p className="text-muted-foreground">
                Manage your Google Classroom integration settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Connection Status</div>
                  <div className="text-sm text-muted-foreground">
                    Connected as {connectionStatus?.profile?.emailAddress}
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Google Classroom integration allows you to create and manage courses, assignments, 
                  and student progress directly from the electoral platform. All data remains 
                  synced with your Google Classroom account.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Course Details Dialog */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {selectedCourse.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={selectedCourse.courseState === 'ACTIVE' ? 'default' : 'secondary'}>
                  {selectedCourse.courseState}
                </Badge>
                <span className="text-sm text-muted-foreground">{selectedCourse.section}</span>
              </div>

              {selectedCourse.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Course Code</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCourse.enrollmentCode || 'Not available'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Room</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCourse.room || 'Virtual'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.open(selectedCourse.alternateLink, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Classroom
                </Button>
                <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}