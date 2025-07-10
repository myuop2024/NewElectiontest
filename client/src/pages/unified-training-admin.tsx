import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  BookOpen, 
  Brain, 
  Upload,
  Download,
  CheckCircle,
  Clock,
  BarChart3,
  Target,
  Sparkles,
  FileText,
  Video,
  MessageSquare,
  Award,
  Play,
  Pause,
  Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import CourseBuilder from "@/components/training/course-builder";
import CourseViewer from "@/components/training/course-viewer";

interface Course {
  id: number;
  title: string;
  description: string;
  role: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  passingScore: number;
  isActive: boolean;
  modules: Module[];
  enrollmentCount: number;
  completionRate: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface Module {
  id: number;
  title: string;
  description: string;
  type: 'video' | 'document' | 'interactive' | 'quiz';
  duration: number;
  content: any;
  order: number;
  isRequired: boolean;
}

interface LearningPath {
  id: number;
  title: string;
  description: string;
  role: string;
  courses: number[];
  difficulty: string;
  estimatedDuration: number;
}

const CATEGORIES = [
  'Electoral Law',
  'Polling Procedures', 
  'Observer Ethics',
  'Emergency Response',
  'Technology Training',
  'Communication Skills'
];

const ROLES = ['Observer', 'Supervisor', 'Admin', 'Field Coordinator', 'All'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const MODULE_TYPES = ['video', 'document', 'interactive', 'quiz'];

export default function UnifiedTrainingAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [showCourseBuilder, setShowCourseBuilder] = useState(false);
  
  // Edit states
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [selectedCourseForModule, setSelectedCourseForModule] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    role: 'Observer',
    category: 'Electoral Law',
    difficulty: 'beginner' as const,
    duration: 60,
    passingScore: 80,
    isActive: true
  });

  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    type: 'video' as const,
    duration: 10,
    content: '',
    order: 1,
    isRequired: true
  });

  const [pathForm, setPathForm] = useState({
    title: '',
    description: '',
    role: 'Observer',
    courses: [] as number[],
    difficulty: 'beginner'
  });

  const [aiForm, setAiForm] = useState({
    topic: '',
    role: 'Observer',
    difficulty: 'beginner',
    targetDuration: 120,
    includeQuiz: true,
    includeVideo: true
  });

  // Fetch data
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["/api/admin/training/courses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/training/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    }
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/admin/training/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/training/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    }
  });

  const { data: learningPaths } = useQuery({
    queryKey: ["/api/admin/training/learning-paths"],
    queryFn: async () => {
      const res = await fetch("/api/admin/training/learning-paths");
      if (!res.ok) throw new Error("Failed to fetch learning paths");
      return res.json();
    }
  });

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      const res = await fetch("/api/admin/training/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData)
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training/courses"] });
      setCourseDialogOpen(false);
      resetCourseForm();
      toast({ title: "Course created successfully!" });
    }
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, ...courseData }: any) => {
      const res = await fetch(`/api/admin/training/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData)
      });
      if (!res.ok) throw new Error("Failed to update course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training/courses"] });
      setCourseDialogOpen(false);
      setEditingCourse(null);
      resetCourseForm();
      toast({ title: "Course updated successfully!" });
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/training/courses/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training/courses"] });
      toast({ title: "Course deleted successfully!" });
    }
  });

  const generateAiCourseMutation = useMutation({
    mutationFn: async (aiParams: any) => {
      const res = await fetch("/api/admin/training/ai/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiParams)
      });
      if (!res.ok) throw new Error("Failed to generate course");
      return res.json();
    },
    onSuccess: (generatedCourse) => {
      setCourseForm({
        ...courseForm,
        title: generatedCourse.title,
        description: generatedCourse.description,
        duration: generatedCourse.estimatedDuration
      });
      setAiDialogOpen(false);
      setCourseDialogOpen(true);
      toast({ title: "AI course generated! Review and save." });
    }
  });

  // Helper functions
  const resetCourseForm = () => {
    setCourseForm({
      title: '',
      description: '',
      role: 'Observer',
      category: 'Electoral Law',
      difficulty: 'beginner',
      duration: 60,
      passingScore: 80,
      isActive: true
    });
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      role: course.role,
      category: course.category,
      difficulty: course.difficulty,
      duration: course.duration,
      passingScore: course.passingScore,
      isActive: course.isActive
    });
    setCourseDialogOpen(true);
  };

  const handleSaveCourseFromBuilder = (courseData: any) => {
    // Convert course builder data to API format
    const coursePayload = {
      title: courseData.title,
      description: courseData.description,
      target_audience: courseData.role,
      content: {
        category: courseData.category,
        difficulty: courseData.difficulty,
        modules: courseData.modules
      },
      duration: courseData.duration,
      passingScore: courseData.passingScore,
      isActive: courseData.isActive
    };

    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data: coursePayload });
    } else {
      createCourseMutation.mutate(coursePayload);
    }
    
    setShowCourseBuilder(false);
    setEditingCourse(null);
  };

  const handleCancelCourseBuilder = () => {
    setShowCourseBuilder(false);
    setEditingCourse(null);
  };

  const handleSubmitCourse = () => {
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, ...courseForm });
    } else {
      createCourseMutation.mutate(courseForm);
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setCourseDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Course
        </Button>
        <Button onClick={() => setAiDialogOpen(true)} variant="outline" className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          AI Course Generator
        </Button>
        <Button onClick={() => setPathDialogOpen(true)} variant="outline" className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          Create Learning Path
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{analytics?.totalCourses || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                <p className="text-2xl font-bold">{analytics?.totalEnrollments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics?.completionRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Certificates Issued</p>
                <p className="text-2xl font-bold">{analytics?.certificatesIssued || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
              </div>
            )) || (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CoursesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Course Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCourseBuilder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Course Builder
          </Button>
          <Button onClick={() => setCourseDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Quick Course
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {courses?.map((course: Course) => (
          <Card key={course.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {course.title}
                    {!course.isActive && <Badge variant="secondary">Inactive</Badge>}
                    {course.modules && course.modules.length > 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        {course.modules.length} modules
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditCourse(course)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedCourse(course)}
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => deleteCourseMutation.mutate(course.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="font-medium">Role:</span> {course.role}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {course.category}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {course.duration}m
                </div>
                <div>
                  <span className="font-medium">Enrollments:</span> {course.enrollmentCount}
                </div>
                <div>
                  <span className="font-medium">Completion:</span> {course.completionRate}%
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Content Progress</span>
                  <span>{course.modules?.length || 0} modules</span>
                </div>
                <Progress value={course.modules?.length ? 75 : 25} className="h-2" />
              </div>

              {course.modules && course.modules.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Course Structure</h4>
                  <div className="space-y-1">
                    {course.modules.slice(0, 3).map((module: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        <span>{module.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {module.lessons?.length || 0} lessons
                        </Badge>
                      </div>
                    ))}
                    {course.modules.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        +{course.modules.length - 3} more modules
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )) || (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No courses created yet</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={() => setShowCourseBuilder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create with Course Builder
              </Button>
              <Button variant="outline" onClick={() => setCourseDialogOpen(true)}>
                Quick Course
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (coursesLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading training management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Administration</h1>
          <p className="text-muted-foreground">Manage courses, learning paths, and training analytics</p>
        </div>
        <Button onClick={() => window.open('/modern-training-hub', '_blank')} variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          Preview User Experience
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="paths">Learning Paths</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="courses">
          <CoursesTab />
        </TabsContent>

        <TabsContent value="paths">
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Learning paths management coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Advanced analytics coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="ai-tools">
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">AI-powered tools coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter course title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={courseForm.category} onValueChange={(value) => setCourseForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter course description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Target Role</Label>
                <Select value={courseForm.role} onValueChange={(value) => setCourseForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={courseForm.difficulty} onValueChange={(value) => setCourseForm(prev => ({ ...prev, difficulty: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(diff => (
                      <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={courseForm.duration}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={courseForm.passingScore}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={courseForm.isActive}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive">Course is active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCourseDialogOpen(false);
              setEditingCourse(null);
              resetCourseForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCourse} disabled={createCourseMutation.isPending || updateCourseMutation.isPending}>
              {(createCourseMutation.isPending || updateCourseMutation.isPending) ? 'Saving...' : 'Save Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Course Generator Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Course Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Course Topic</Label>
              <Input
                id="topic"
                value={aiForm.topic}
                onChange={(e) => setAiForm(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Electoral Law Basics, Polling Station Management"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Target Role</Label>
                <Select value={aiForm.role} onValueChange={(value) => setAiForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.slice(0, -1).map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={aiForm.difficulty} onValueChange={(value) => setAiForm(prev => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(diff => (
                      <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDuration">Target Duration (minutes)</Label>
              <Input
                id="targetDuration"
                type="number"
                value={aiForm.targetDuration}
                onChange={(e) => setAiForm(prev => ({ ...prev, targetDuration: parseInt(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => generateAiCourseMutation.mutate(aiForm)} disabled={generateAiCourseMutation.isPending}>
              {generateAiCourseMutation.isPending ? 'Generating...' : 'Generate Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Builder Interface */}
      {showCourseBuilder && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <CourseBuilder
            course={editingCourse}
            onSave={handleSaveCourseFromBuilder}
            onCancel={handleCancelCourseBuilder}
          />
        </div>
      )}

      {/* Course Viewer Interface */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
            <CourseViewer
              course={selectedCourse}
              onStartLesson={(lessonId) => {
                console.log('Starting lesson:', lessonId);
                // Handle lesson start
              }}
              onCompleteLesson={(lessonId) => {
                console.log('Completing lesson:', lessonId);
                // Handle lesson completion
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}