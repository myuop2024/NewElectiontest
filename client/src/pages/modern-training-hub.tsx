import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, 
  BookOpen, 
  PlayCircle, 
  Clock, 
  Users, 
  Award, 
  Star,
  CheckCircle,
  Lock,
  Sparkles,
  TrendingUp,
  Target,
  Brain,
  Filter,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CourseViewer from "@/components/training/course-viewer";

interface Course {
  id: number;
  title: string;
  description: string;
  role: string;
  duration: number;
  passingScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  modules: Module[];
  enrollmentCount: number;
  rating: number;
  isEnrolled?: boolean;
  progress?: number;
  prerequisites?: number[];
}

interface Module {
  id: number;
  title: string;
  duration: number;
  type: 'video' | 'document' | 'interactive' | 'quiz';
  completed?: boolean;
}

interface LearningPath {
  id: number;
  title: string;
  description: string;
  role: string;
  courses: number[];
  totalDuration: number;
  difficulty: string;
}

const CATEGORIES = [
  'Electoral Law',
  'Polling Procedures', 
  'Observer Ethics',
  'Emergency Response',
  'Technology Training',
  'Communication Skills'
];

const ROLES = ['Observer', 'Supervisor', 'Admin', 'Field Coordinator'];

export default function ModernTrainingHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [activeTab, setActiveTab] = useState("catalog");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);

  // Fetch courses with user-specific data
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["/api/training/courses/enhanced"],
    queryFn: async () => {
      const res = await fetch("/api/training/courses/enhanced");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    }
  });

  // Fetch learning paths
  const { data: learningPaths, isLoading: pathsLoading } = useQuery({
    queryKey: ["/api/training/learning-paths"],
    queryFn: async () => {
      const res = await fetch("/api/training/learning-paths");
      if (!res.ok) throw new Error("Failed to fetch learning paths");
      return res.json();
    }
  });

  // Fetch user enrollments and progress
  const { data: userProgress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/training/my-progress"],
    queryFn: async () => {
      const res = await fetch("/api/training/my-progress");
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    }
  });

  // Enroll in course
  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await fetch("/api/training/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to enroll");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/courses/enhanced"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/my-progress"] });
      toast({ title: "Successfully enrolled in course!" });
    },
    onError: (error) => {
      toast({ 
        title: "Enrollment failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Filter courses based on search and filters
  const filteredCourses = courses?.filter((course: Course) => {
    const matchesSearch = searchTerm === "" || 
                         course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           course.category === selectedCategory ||
                           course.role?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesDifficulty = selectedDifficulty === "all" || course.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  }) || [];

  // Get recommended courses for user
  const recommendedCourses = courses?.filter((course: Course) => {
    return course.role === user?.role && !course.isEnrolled;
  })?.slice(0, 3) || [];

  const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
    const colors = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800", 
      advanced: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={colors[difficulty as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {difficulty}
      </Badge>
    );
  };

  const CourseCard = ({ course }: { course: Course }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
              {course.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {course.description}
            </p>
          </div>
          <DifficultyBadge difficulty={course.difficulty} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {course.duration}m
              </span>
              <span className="flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                {course.modules.length} modules
              </span>
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {course.enrollmentCount}
              </span>
            </div>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span>{course.rating.toFixed(1)}</span>
            </div>
          </div>
          
          {course.isEnrolled && course.progress !== undefined ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-2" />
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => setViewingCourse(course)}
              >
                Continue Learning
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => enrollMutation.mutate(course.id)}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const LearningPathCard = ({ path }: { path: LearningPath }) => (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{path.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{path.description}</p>
          </div>
          <Badge variant="secondary">{path.role}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <BookOpen className="w-4 h-4 mr-1" />
              {path.courses.length} courses
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {path.totalDuration}m total
            </span>
            <DifficultyBadge difficulty={path.difficulty} />
          </div>
          <Button size="sm" className="w-full">
            Start Learning Path
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (coursesLoading || pathsLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading training content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          CAFFE Training Hub
        </h1>
        <p className="text-muted-foreground">
          Master electoral observation skills with our comprehensive training platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{courses?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Available Courses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{userProgress?.completed || 0}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{userProgress?.inProgress || 0}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{userProgress?.certificates || 0}</div>
            <div className="text-sm text-muted-foreground">Certificates</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Course Catalog
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Learning Paths
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            My Progress
          </TabsTrigger>
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Recommended
          </TabsTrigger>
        </TabsList>

        {/* Course Catalog */}
        <TabsContent value="catalog" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </TabsContent>

        {/* Learning Paths */}
        <TabsContent value="paths" className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Structured Learning Paths</h3>
            <p className="text-muted-foreground">
              Follow curated paths designed for your role and experience level
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {learningPaths?.map((path) => (
              <LearningPathCard key={path.id} path={path} />
            ))}
          </div>
        </TabsContent>

        {/* My Progress */}
        <TabsContent value="progress" className="space-y-6">
          <h3 className="text-xl font-semibold">Your Learning Journey</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProgress?.enrolledCourses?.map((course: Course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </TabsContent>

        {/* Recommended */}
        <TabsContent value="recommended" className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Recommendations
            </h3>
            <p className="text-muted-foreground">
              Courses selected specifically for your role and learning goals
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Course Detail Dialog */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCourse.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>{selectedCourse.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>Duration:</strong> {selectedCourse.duration} minutes
                </div>
                <div>
                  <strong>Modules:</strong> {selectedCourse.modules.length}
                </div>
                <div>
                  <strong>Difficulty:</strong> {selectedCourse.difficulty}
                </div>
                <div>
                  <strong>Passing Score:</strong> {selectedCourse.passingScore}%
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Course Modules</h4>
                {selectedCourse.modules.map((module, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{module.title}</div>
                        <div className="text-sm text-muted-foreground">{module.duration} minutes</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{module.type}</Badge>
                      {module.completed && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setSelectedCourse(null);
                    setViewingCourse(selectedCourse);
                  }}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Course
                </Button>
                <Button variant="outline">
                  Preview
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Course Viewer */}
      {viewingCourse && (
        <Dialog open={!!viewingCourse} onOpenChange={() => setViewingCourse(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6">
            <CourseViewer 
              course={viewingCourse}
              userProgress={userProgress?.enrolledCourses?.find((c: Course) => c.id === viewingCourse.id)}
              onStartLesson={(lessonId) => {
                console.log("Starting lesson:", lessonId);
              }}
              onCompleteLesson={(lessonId) => {
                console.log("Completing lesson:", lessonId);
              }}
              onEnroll={() => enrollMutation.mutate(viewingCourse.id)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}