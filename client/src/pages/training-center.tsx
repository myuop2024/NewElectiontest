import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  GraduationCap, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  Award, 
  BookOpen,
  Users,
  Download,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useScreenPresence } from "@/hooks/useScreenPresence";
import { VideoPlayer } from "@/components/training/VideoPlayer";

// Utility for downloading files
import { downloadFile } from "@/lib/utils";

// Add types
interface Course {
  id: number;
  title: string;
  description: string;
  role: string;
  duration: number;
  passingScore: number;
  content: { modules: Module[] };
}
interface Module {
  title: string;
  duration: number;
  completed?: boolean;
  videoId?: string;
}
interface Enrollment {
  id: number;
  courseId: number;
  status: string;
  progress: number;
  score?: number;
}

export default function TrainingCenter() {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string>("");
  const [aiQuiz, setAiQuiz] = useState<string>("");
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Feedback modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState({ name: "", email: "", message: "" });
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Screen presence and timer management
  const {
    isPresent,
    isActive,
    totalActiveTime,
    startTimer,
    pauseTimer,
    resetTimer,
    hasMetMinimumDuration,
    formatTime,
    getRemainingTime,
  } = useScreenPresence({
    minimumDuration: 300, // 5 minutes minimum per course (configurable)
    autoStart: true,
    onPresenceChange: (present) => {
      if (!present) {
        toast({
          title: "⚠️ Screen Focus Lost",
          description: "Course timer paused. Return to continue learning.",
          variant: "destructive",
        });
      }
    },
    onTimeUpdate: (time) => {
      // Auto-save progress every minute
      if (time % 60 === 0 && selectedCourse) {
        const enrollment = getEnrollmentForCourse(selectedCourse.id);
        if (enrollment) {
          // Could auto-save progress here
        }
      }
    },
  });

  // Video completion tracking
  const [videoCompletions, setVideoCompletions] = useState<Record<string, boolean>>({});
  
  const handleVideoComplete = useCallback((moduleId: string, completed: boolean) => {
    setVideoCompletions(prev => ({
      ...prev,
      [moduleId]: completed
    }));
    
    if (completed) {
      toast({
        title: "✅ Video Completed",
        description: "You can now proceed to the next module.",
      });
    }
  }, [toast]);

  const canProceedFromModule = useCallback((module: any, index: number) => {
    // Check if module has video requirement
    if (module.videoId && !videoCompletions[`${selectedCourse?.id}-${index}`]) {
      return false;
    }
    
    // Check minimum time requirement for course
    if (!hasMetMinimumDuration()) {
      return false;
    }
    
    return true;
  }, [videoCompletions, selectedCourse, hasMetMinimumDuration]);

  // Fetch courses
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ["/api/training/courses"],
    queryFn: async () => {
      const res = await fetch("/api/training/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    }
  });

  // Fetch enrollments
  const { data: enrollments, isLoading: enrollmentsLoading, error: enrollmentsError } = useQuery({
    queryKey: ["/api/training/enrollments/my"],
    queryFn: async () => {
      const res = await fetch("/api/training/enrollments/my");
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    }
  });

  // Enroll in a course
  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await fetch("/api/training/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId })
      });
      if (!res.ok) throw new Error("Failed to enroll");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/enrollments/my"] });
      toast({ title: "Enrolled!", description: "You have been enrolled in the course." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to enroll.", variant: "destructive" });
    }
  });

  // Update progress
  const progressMutation = useMutation({
    mutationFn: async ({ enrollmentId, progress, status, score }: any) => {
      const res = await fetch("/api/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, progress, status, score })
      });
      if (!res.ok) throw new Error("Failed to update progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/enrollments/my"] });
      toast({ title: "Progress Updated!", description: "Your progress has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update progress.", variant: "destructive" });
    }
  });

  // Download certificate
  const handleDownloadCertificate = async (enrollmentId: number) => {
    try {
      const res = await fetch(`/api/training/certificate/${enrollmentId}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      downloadFile(blob, `certificate-${enrollmentId}.pdf`);
      toast({ title: "Certificate Downloaded!", description: "Your certificate PDF has been saved." });
    } catch {
      toast({ title: "Error", description: "Certificate not available.", variant: "destructive" });
    }
  };

  // AI-powered recommendations
  const fetchAIRecommendations = async (userProfile: any) => {
    setLoadingAI(true);
    setAiRecommendations("");
    try {
      const res = await fetch("/api/training/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userProfile })
      });
      const data = await res.json();
      setAiRecommendations(data.recommendations);
    } catch {
      setAiRecommendations("AI recommendations unavailable.");
      toast({ title: "AI Error", description: "Could not fetch AI recommendations.", variant: "destructive" });
    }
    setLoadingAI(false);
  };

  // AI-powered quiz
  const fetchAIQuiz = async (module: any, userHistory: any) => {
    setLoadingAI(true);
    setAiQuiz("");
    try {
      const res = await fetch("/api/training/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, userHistory })
      });
      const data = await res.json();
      setAiQuiz(data.quiz);
    } catch {
      setAiQuiz("AI quiz unavailable.");
      toast({ title: "AI Error", description: "Could not fetch AI quiz.", variant: "destructive" });
    }
    setLoadingAI(false);
  };

  // AI-powered feedback
  const fetchAIFeedback = async (progress: any) => {
    setLoadingAI(true);
    setAiFeedback("");
    try {
      const res = await fetch("/api/training/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress })
      });
      const data = await res.json();
      setAiFeedback(data.feedback);
    } catch {
      setAiFeedback("AI feedback unavailable.");
      toast({ title: "AI Error", description: "Could not fetch AI feedback.", variant: "destructive" });
    }
    setLoadingAI(false);
  };

  // Helper: Get enrollment for a course
  const getEnrollmentForCourse = (courseId: number) => enrollments?.find((e: any) => e.courseId === courseId);

  // Helper: Get course progress/status for a course
  const getCourseStatus = (courseId: number) => {
    const enrollment = getEnrollmentForCourse(courseId);
    if (!enrollment) return "available";
    if (enrollment.status === "completed") return "completed";
    if (enrollment.status === "in_progress") return "in_progress";
    return enrollment.status;
  };

  // Helper: Get course progress percent
  const getCourseProgress = (courseId: number) => {
    const enrollment = getEnrollmentForCourse(courseId);
    return enrollment ? enrollment.progress : 0;
  };

  // Helper: Get certificate eligibility
  const hasCertificate = (courseId: number) => {
    const enrollment = getEnrollmentForCourse(courseId);
    return enrollment && enrollment.status === "completed";
  };

  // Feedback submit handler (placeholder: just show toast)
  const handleFeedbackSubmit = async () => {
    setFeedbackLoading(true);
    setTimeout(() => {
      setFeedbackLoading(false);
      setFeedbackOpen(false);
      setFeedback({ name: "", email: "", message: "" });
      toast({ title: "Thank you!", description: "Your feedback has been submitted." });
    }, 1200);
  };

  // Loading and error states
  if (coursesLoading || enrollmentsLoading) {
    return <div className="p-6">Loading...</div>;
  }
  if (coursesError || enrollmentsError) {
    return <div className="p-6 text-red-600">Error loading training data.</div>;
  }

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

  // Extract CourseCard, ModuleRow, and AIPanel components
  function CourseCard({ course, enrollment, status, progress, onEnroll, onSelect, onDownload, hasCertificate }: any) {
    return (
      <Card className="government-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold">{course.title}</CardTitle>
            <Badge className={`status-indicator ${getStatusColor(status)}`}>{status.replace('_', ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{course.description}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${getProgressColor(progress)}`} style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{course.duration} min</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{Array.isArray(course.content?.modules) ? course.content.modules.length : 0} modules</span>
            </div>
          </div>
          {enrollment && enrollment.status === 'completed' && enrollment.score && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Final Score</span>
                <span className="text-sm font-bold text-green-600">{enrollment.score}%</span>
              </div>
            </div>
          )}
          <div className="flex space-x-2">
            {!enrollment ? (
              <Button size="sm" className="flex-1 btn-caffe-primary" onClick={onEnroll} aria-label="Enroll in course">
                <PlayCircle className="h-4 w-4 mr-1" />
                Enroll
              </Button>
            ) : (
              <Button size="sm" className="flex-1 btn-caffe-primary" onClick={onSelect} aria-label="View course details">
                {enrollment.status === 'completed' ? (
                  <BookOpen className="h-4 w-4 mr-1" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-1" />
                )}
                {enrollment.status === 'completed' ? 'Review' : 'Continue'}
              </Button>
            )}
            {hasCertificate && (
              <Button size="sm" variant="outline" onClick={onDownload} aria-label="Download certificate">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  function ModuleRow({ module, onAIQuiz }: any) {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${module.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {module.completed ? <CheckCircle className="h-5 w-5" /> : <div className="w-3 h-3 border-2 border-current rounded-full" />}
          </div>
          <div>
            <h4 className="font-medium">{module.title}</h4>
            <p className="text-sm text-muted-foreground">{module.duration} minutes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={module.completed ? "outline" : "default"} className={!module.completed ? "btn-caffe-primary" : ""} aria-label={module.completed ? "Review module" : "Start module"}>
            {module.completed ? "Review" : "Start"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onAIQuiz} aria-label="Get AI Quiz">
            <Sparkles className="h-4 w-4 mr-1 text-blue-500" />
            AI Quiz
          </Button>
        </div>
      </div>
    );
  }
  function AIPanel({ title, value }: { title: string; value: string }) {
    if (!value) return null;
    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800 whitespace-pre-line" aria-live="polite">
        <strong>{title}:</strong>
        <div>{value}</div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-6 fade-in">
      {/* Screen Presence & Timer Status Bar */}
      {selectedCourse && (
        <div className={`sticky top-0 z-40 p-3 rounded-lg border-2 ${
          isPresent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        } transition-colors duration-300`}>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {isPresent ? (
                <>
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">Active Learning</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 font-medium">Timer Paused - Return to Screen</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Active Time: {formatTime()}</span>
              </div>
              {!hasMetMinimumDuration() && (
                <div className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Need {formatTime(getRemainingTime())} more</span>
                </div>
              )}
              {hasMetMinimumDuration() && (
                <span className="text-green-600 font-medium">✓ Minimum time met</span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Training Center</h2>
          <p className="text-muted-foreground text-base md:text-lg">Electoral observer certification and training</p>
        </div>
        <Button className="btn-caffe-primary w-full md:w-auto" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
          <Award className="h-4 w-4 mr-2" />
          View Certificates
        </Button>
      </div>

      {/* AI Recommendations Section */}
      <div className="mb-6">
        <Card className="border-dashed border-2 border-blue-200">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <span className="font-medium">AI Recommendations</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={loadingAI}
              onClick={() => fetchAIRecommendations({ /* add user profile fields here if available */ })}
              className="w-full md:w-auto"
            >
              {loadingAI ? 'Loading...' : 'Get Recommendations'}
            </Button>
          </CardContent>
          {aiRecommendations && (
            <div className="p-4 text-blue-700 bg-blue-50 border-t border-blue-100 whitespace-pre-line text-sm md:text-base">{aiRecommendations}</div>
          )}
        </Card>
      </div>

      {/* Training Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Courses</p>
                <p className="text-2xl font-bold text-blue-600">{courses?.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{enrollments?.filter((e: any) => e.status === 'completed').length}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{enrollments?.filter((e: any) => e.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course List or Course Detail */}
      {!selectedCourse ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {courses?.map((course: any) => {
            const enrollment = getEnrollmentForCourse(course.id);
            const status = getCourseStatus(course.id);
            const progress = getCourseProgress(course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                enrollment={enrollment}
                status={status}
                progress={progress}
                onEnroll={() => enrollMutation.mutate(course.id)}
                onSelect={() => {
                  setSelectedCourse(course);
                  resetTimer(); // Reset timer for new course
                  startTimer(); // Start timer for course
                }}
                onDownload={() => handleDownloadCertificate(getEnrollmentForCourse(course.id).id)}
                hasCertificate={hasCertificate(course.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <Button variant="outline" onClick={() => {
              setSelectedCourse(null);
              pauseTimer(); // Pause timer when leaving course
            }} className="w-full sm:w-auto mb-2 sm:mb-0">
              ← Back to Courses
            </Button>
            <div>
              <h3 className="text-xl md:text-2xl font-bold">{selectedCourse.title}</h3>
              <p className="text-muted-foreground text-base md:text-lg">{selectedCourse.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="government-card">
                <CardHeader>
                  <CardTitle>Course Modules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.isArray(selectedCourse.content?.modules) && selectedCourse.content.modules.map((module: any, index: number) => (
                    <div key={index} className="space-y-4">
                      {/* Module Header */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${module.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            {module.completed ? <CheckCircle className="h-5 w-5" /> : <div className="w-3 h-3 border-2 border-current rounded-full" />}
                          </div>
                          <div>
                            <h4 className="font-medium">{module.title}</h4>
                            <p className="text-sm text-muted-foreground">{module.duration} minutes</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant={module.completed ? "outline" : "default"} 
                            className={!module.completed ? "btn-caffe-primary" : ""}
                            disabled={!canProceedFromModule(module, index)}
                            aria-label={module.completed ? "Review module" : "Start module"}
                          >
                            {module.completed ? "Review" : "Start"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => fetchAIQuiz(module, {})} aria-label="Get AI Quiz">
                            <Sparkles className="h-4 w-4 mr-1 text-blue-500" />
                            AI Quiz
                          </Button>
                        </div>
                      </div>
                      
                      {/* Video Player for modules with videos */}
                      {module.videoId && (
                        <VideoPlayer
                          videoId={module.videoId}
                          title={`${module.title} - Training Video`}
                          onComplete={(completed) => handleVideoComplete(`${selectedCourse.id}-${index}`, completed)}
                          required={true}
                          className="ml-11" // Align with module content
                        />
                      )}
                    </div>
                  ))}
                  {aiQuiz && (
                    <AIPanel title="AI Quiz" value={aiQuiz} />
                  )}
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
                    <div className="text-3xl font-bold caffe-primary">{getCourseProgress(selectedCourse.id)}%</div>
                    <p className="text-sm text-muted-foreground">Complete</p>
                  </div>
                  <Progress value={getCourseProgress(selectedCourse.id)} className="w-full" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Modules completed:</span>
                      <span>{Array.isArray(selectedCourse.content?.modules) ? selectedCourse.content.modules.filter((m: any) => m.completed).length : 0}/{Array.isArray(selectedCourse.content?.modules) ? selectedCourse.content.modules.length : 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passing score:</span>
                      <span>{selectedCourse.passingScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time requirement:</span>
                      <span className={hasMetMinimumDuration() ? 'text-green-600' : 'text-orange-600'}>
                        {hasMetMinimumDuration() ? '✓ Met' : `${formatTime(getRemainingTime())} left`}
                      </span>
                    </div>
                    {getCourseStatus(selectedCourse.id) === 'completed' && (
                      <div className="flex justify-between font-medium text-green-600">
                        <span>Your score:</span>
                        <span>{getEnrollmentForCourse(selectedCourse.id)?.score}%</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => fetchAIFeedback({ progress: getCourseProgress(selectedCourse.id) })}>
                    <Sparkles className="h-4 w-4 mr-1 text-blue-500" />
                    Get AI Feedback
                  </Button>
                  {aiFeedback && (
                    <AIPanel title="AI Feedback" value={aiFeedback} />
                  )}
                </CardContent>
              </Card>
              {hasCertificate(selectedCourse.id) && hasMetMinimumDuration() && (
                <Card className="government-card border-green-200">
                  <CardContent className="p-6 text-center">
                    <Award className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-green-800 mb-2">Certificate Available</h4>
                    <p className="text-sm text-green-600 mb-4">Congratulations! You've earned your certificate.</p>
                    <Button className="w-full caffe-bg-secondary text-white" onClick={() => handleDownloadCertificate(getEnrollmentForCourse(selectedCourse.id).id)}>
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
      {/* Floating Feedback Button */}
      <Button
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-3"
        style={{ minWidth: 48, minHeight: 48 }}
        onClick={() => setFeedbackOpen(true)}
        aria-label="Open feedback form"
      >
        Feedback
      </Button>
      {/* Feedback Modal */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name (optional)" value={feedback.name} onChange={e => setFeedback({ ...feedback, name: e.target.value })} />
            <Input placeholder="Email (optional)" value={feedback.email} onChange={e => setFeedback({ ...feedback, email: e.target.value })} />
            <Textarea placeholder="Your feedback..." value={feedback.message} onChange={e => setFeedback({ ...feedback, message: e.target.value })} rows={4} />
          </div>
          <DialogFooter>
            <Button onClick={handleFeedbackSubmit} disabled={feedbackLoading || !feedback.message} className="w-full">
              {feedbackLoading ? 'Sending...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
