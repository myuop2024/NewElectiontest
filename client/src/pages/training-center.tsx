import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { 
  GraduationCap, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  Award, 
  BookOpen,
  Users,
  Download
} from "lucide-react";

export default function TrainingCenter() {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments } = useQuery({
    queryKey: ["/api/enrollments/my"],
  });

  // Mock training data - in real app this would come from API
  const mockCourses = [
    {
      id: 1,
      title: "Electoral Observation Fundamentals",
      description: "Basic principles and procedures for electoral observation",
      role: "observer",
      duration: 120,
      passingScore: 80,
      modules: [
        { title: "Introduction to Electoral Observation", duration: 30, completed: true },
        { title: "Legal Framework and Standards", duration: 45, completed: true },
        { title: "Observation Techniques", duration: 30, completed: false },
        { title: "Reporting and Documentation", duration: 15, completed: false }
      ],
      progress: 60,
      status: "in_progress",
      certificateAvailable: false
    },
    {
      id: 2,
      title: "Indoor Agent Training",
      description: "Specialized training for polling station agents",
      role: "indoor_agent",
      duration: 90,
      passingScore: 85,
      modules: [
        { title: "Polling Station Setup", duration: 25, completed: true },
        { title: "Voter Verification", duration: 30, completed: true },
        { title: "Ballot Security", duration: 20, completed: true },
        { title: "Incident Management", duration: 15, completed: true }
      ],
      progress: 100,
      status: "completed",
      certificateAvailable: true,
      completedDate: "2024-11-15",
      score: 92
    },
    {
      id: 3,
      title: "Roving Observer Procedures",
      description: "Training for mobile observation teams",
      role: "roving_observer", 
      duration: 150,
      passingScore: 80,
      modules: [
        { title: "Route Planning", duration: 30, completed: false },
        { title: "Multi-Station Coordination", duration: 45, completed: false },
        { title: "Emergency Protocols", duration: 30, completed: false },
        { title: "Real-time Reporting", duration: 45, completed: false }
      ],
      progress: 0,
      status: "available",
      certificateAvailable: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-active';
      case 'in_progress': return 'status-warning';
      case 'available': return 'status-neutral';
      case 'locked': return 'bg-gray-100 text-gray-500';
      default: return 'status-neutral';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress > 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (coursesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Training Center</h2>
          <p className="text-muted-foreground">Electoral observer certification and training</p>
        </div>
        <Button className="btn-caffe-primary">
          <Award className="h-4 w-4 mr-2" />
          View Certificates
        </Button>
      </div>

      {!selectedCourse ? (
        <>
          {/* Training Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available Courses</p>
                    <p className="text-2xl font-bold text-blue-600">{mockCourses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mockCourses.filter(c => c.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {mockCourses.filter(c => c.status === 'in_progress').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockCourses.map((course) => (
              <Card key={course.id} className="government-card hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{course.title}</CardTitle>
                    <Badge className={`status-indicator ${getStatusColor(course.status)}`}>
                      {course.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(course.progress)}`}
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{course.modules.length} modules</span>
                    </div>
                  </div>

                  {course.status === 'completed' && course.score && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-800">Final Score</span>
                        <span className="text-sm font-bold text-green-600">{course.score}%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1 btn-caffe-primary"
                      onClick={() => setSelectedCourse(course)}
                    >
                      {course.status === 'completed' ? (
                        <>
                          <BookOpen className="h-4 w-4 mr-1" />
                          Review
                        </>
                      ) : course.status === 'in_progress' ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Continue
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                    
                    {course.certificateAvailable && (
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* Course Detail View */
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedCourse(null)}
            >
              ← Back to Courses
            </Button>
            <div>
              <h3 className="text-xl font-bold">{selectedCourse.title}</h3>
              <p className="text-muted-foreground">{selectedCourse.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="government-card">
                <CardHeader>
                  <CardTitle>Course Modules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCourse.modules.map((module: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          module.completed 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {module.completed ? <CheckCircle className="h-5 w-5" /> : <div className="w-3 h-3 border-2 border-current rounded-full" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{module.title}</h4>
                          <p className="text-sm text-muted-foreground">{module.duration} minutes</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant={module.completed ? "outline" : "default"}
                        className={!module.completed ? "btn-caffe-primary" : ""}
                      >
                        {module.completed ? "Review" : "Start"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="government-card">
                <CardHeader>
                  <CardTitle>Course Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold caffe-primary">{selectedCourse.progress}%</div>
                    <p className="text-sm text-muted-foreground">Complete</p>
                  </div>
                  
                  <Progress value={selectedCourse.progress} className="w-full" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Modules completed:</span>
                      <span>{selectedCourse.modules.filter((m: any) => m.completed).length}/{selectedCourse.modules.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passing score:</span>
                      <span>{selectedCourse.passingScore}%</span>
                    </div>
                    {selectedCourse.status === 'completed' && (
                      <div className="flex justify-between font-medium text-green-600">
                        <span>Your score:</span>
                        <span>{selectedCourse.score}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedCourse.certificateAvailable && (
                <Card className="government-card border-green-200">
                  <CardContent className="p-6 text-center">
                    <Award className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-green-800 mb-2">Certificate Available</h4>
                    <p className="text-sm text-green-600 mb-4">
                      Congratulations! You've earned your certificate.
                    </p>
                    <Button className="w-full caffe-bg-secondary text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
