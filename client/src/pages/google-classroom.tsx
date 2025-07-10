import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  GraduationCap,
  LinkIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface Course {
  id: string;
  name: string;
  description?: string;
  section?: string;
  room?: string;
  ownerId: string;
  courseState: string;
  alternateLink?: string;
  enrollmentCode?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  creationTime?: string;
  updateTime?: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  materials?: any[];
  state: string;
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: any;
  dueTime?: any;
}

export default function GoogleClassroom() {
  const [activeTab, setActiveTab] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: '',
    description: '',
    section: 'Electoral Observer Training',
    room: ''
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Get assignments for selected course
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/classroom/courses", selectedCourse?.id, "coursework"],
    queryFn: async () => {
      const res = await fetch(`/api/classroom/courses/${selectedCourse?.id}/coursework`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: !!selectedCourse
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
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create new course
  const createCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      const res = await fetch("/api/classroom/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData)
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Created",
        description: "Your Google Classroom course has been created successfully!"
      });
      setShowCreateDialog(false);
      setCourseForm({ name: '', description: '', section: 'Electoral Observer Training', room: '' });
      refetchCourses();
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Course name is required",
        variant: "destructive"
      });
      return;
    }
    createCourseMutation.mutate(courseForm);
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!connectionStatus?.connected) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Connect to Google Classroom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Google Classroom Integration</h3>
              <p className="text-muted-foreground mb-6">
                Connect your Google account to access Google Classroom for electoral observer training management.
              </p>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Professional Training Platform:</strong> Leverage Google's proven education platform with built-in mobile apps, 
                notifications, grade tracking, and seamless integration with Google Drive and other services.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h4 className="font-semibold">Features included:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Course creation and management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Assignment distribution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Student enrollment and progress tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Mobile app access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Google Drive integration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Automatic notifications
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => connectMutation.mutate()} 
              disabled={connectMutation.isPending}
              className="w-full"
              size="lg"
            >
              {connectMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect to Google Classroom
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Classroom</h1>
          <p className="text-muted-foreground">
            Manage electoral observer training through Google Classroom
          </p>
        </div>
        <div className="flex items-center gap-3">
          {connectionStatus?.profile && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{connectionStatus.profile.name}</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          )}
          {user?.role === 'admin' && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Course Name *</Label>
                    <Input
                      id="name"
                      value={courseForm.name}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Electoral Observer Training 2025"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Comprehensive training for electoral observers..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={courseForm.section}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="Electoral Observer Training"
                    />
                  </div>
                  <div>
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      value={courseForm.room}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, room: e.target.value }))}
                      placeholder="Training Room A"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createCourseMutation.isPending} className="flex-1">
                      {createCourseMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Course'
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            My Courses
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Assignments
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {user?.role === 'admin' 
                    ? "Create your first course to get started with training management."
                    : "You haven't been enrolled in any courses yet."
                  }
                </p>
                {user?.role === 'admin' && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Course
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses?.map((course: Course) => (
                <Card 
                  key={course.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCourse(course)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{course.name}</CardTitle>
                        {course.section && (
                          <p className="text-sm text-muted-foreground">{course.section}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{course.courseState}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {course.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Classroom</span>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={course.alternateLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {!selectedCourse ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a course</h3>
                <p className="text-muted-foreground text-center">
                  Choose a course from the Courses tab to view its assignments.
                </p>
              </CardContent>
            </Card>
          ) : assignmentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Assignments for {selectedCourse.name}</h2>
                <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                  Back to Courses
                </Button>
              </div>
              {assignments?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No assignments</h3>
                    <p className="text-muted-foreground text-center">
                      This course doesn't have any assignments yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assignments?.map((assignment: Assignment) => (
                    <Card key={assignment.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{assignment.title}</CardTitle>
                            {assignment.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {assignment.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={assignment.state === 'PUBLISHED' ? 'default' : 'secondary'}>
                            {assignment.state}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {assignment.dueDate 
                                  ? new Date(assignment.dueDate).toLocaleDateString()
                                  : 'No due date'
                                }
                              </span>
                            </div>
                          </div>
                          {assignment.alternateLink && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={assignment.alternateLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}