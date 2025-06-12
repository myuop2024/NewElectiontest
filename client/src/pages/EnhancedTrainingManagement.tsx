import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Users, 
  BookOpen, 
  CheckCircle,
  Eye,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Play,
  FileText,
  Video,
  Award,
  Target,
  Brain,
  Trophy,
  Calendar,
  Timer,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrainingProgram {
  id: number;
  title: string;
  description: string;
  role: string;
  content: any;
  duration: number;
  passingScore: number;
  isActive: boolean;
  difficulty?: string;
  prerequisites?: any[];
  learningObjectives?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  totalEnrollments?: number;
  completions?: number;
}

interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  description: string;
  content: any;
  moduleOrder: number;
  duration: number;
  isRequired: boolean;
  moduleType: string;
  resources?: any;
  completionCriteria?: any;
  createdAt: string;
}

interface CourseQuiz {
  id: number;
  courseId: number;
  moduleId?: number;
  title: string;
  description: string;
  questions: any[];
  timeLimit?: number;
  maxAttempts: number;
  passingScore: number;
  isActive: boolean;
  quizType: string;
  createdAt: string;
}

interface CourseContest {
  id: number;
  courseId: number;
  title: string;
  description: string;
  contestType: string;
  rules?: any;
  prizes?: any;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

interface CourseMedia {
  id: number;
  courseId: number;
  moduleId?: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  mediaType: string;
  duration?: number;
  thumbnail?: string;
  description?: string;
  uploadedBy: number;
  isActive: boolean;
  createdAt: string;
}

export default function EnhancedTrainingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('programs');
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [showContestDialog, setShowContestDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);

  // New program form state
  const [newProgram, setNewProgram] = useState({
    title: '',
    description: '',
    role: 'Observer',
    modules: [] as any[],
    passingScore: 80,
    isActive: true,
    difficulty: 'beginner',
    prerequisites: [] as string[],
    learningObjectives: [] as string[],
    tags: [] as string[]
  });

  // New module form state
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    content: {},
    moduleOrder: 1,
    duration: 30,
    isRequired: true,
    moduleType: 'lesson',
    resources: {},
    completionCriteria: {}
  });

  // New quiz form state
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    questions: [] as any[],
    timeLimit: 60,
    maxAttempts: 3,
    passingScore: 80,
    quizType: 'assessment'
  });

  // New contest form state
  const [newContest, setNewContest] = useState({
    title: '',
    description: '',
    contestType: 'quiz_competition',
    rules: {},
    prizes: {},
    startDate: '',
    endDate: '',
    maxParticipants: 50
  });

  // Fetch training programs
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['/api/training/programs'],
    queryFn: async () => {
      const response = await fetch('/api/training/programs');
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json();
    }
  });

  // Fetch course modules for selected program
  const { data: modules = [] } = useQuery({
    queryKey: ['/api/training/courses', selectedProgram?.id, 'modules'],
    queryFn: async () => {
      if (!selectedProgram) return [];
      const response = await fetch(`/api/training/courses/${selectedProgram.id}/modules`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json();
    },
    enabled: !!selectedProgram
  });

  // Fetch course quizzes for selected program
  const { data: quizzes = [] } = useQuery({
    queryKey: ['/api/training/courses', selectedProgram?.id, 'quizzes'],
    queryFn: async () => {
      if (!selectedProgram) return [];
      const response = await fetch(`/api/training/courses/${selectedProgram.id}/quizzes`);
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      return response.json();
    },
    enabled: !!selectedProgram
  });

  // Fetch course contests for selected program
  const { data: contests = [] } = useQuery({
    queryKey: ['/api/training/courses', selectedProgram?.id, 'contests'],
    queryFn: async () => {
      if (!selectedProgram) return [];
      const response = await fetch(`/api/training/courses/${selectedProgram.id}/contests`);
      if (!response.ok) throw new Error('Failed to fetch contests');
      return response.json();
    },
    enabled: !!selectedProgram
  });

  // Fetch course media for selected program
  const { data: media = [] } = useQuery({
    queryKey: ['/api/training/courses', selectedProgram?.id, 'media'],
    queryFn: async () => {
      if (!selectedProgram) return [];
      const response = await fetch(`/api/training/courses/${selectedProgram.id}/media`);
      if (!response.ok) throw new Error('Failed to fetch media');
      return response.json();
    },
    enabled: !!selectedProgram
  });

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (programData: any) => {
      const response = await fetch('/api/training/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create program');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/programs'] });
      setShowCreateDialog(false);
      setNewProgram({
        title: '',
        description: '',
        role: 'Observer',
        modules: [],
        passingScore: 80,
        isActive: true,
        difficulty: 'beginner',
        prerequisites: [],
        learningObjectives: [],
        tags: []
      });
      toast({ title: "Training program created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async ({ courseId, moduleData }: { courseId: number; moduleData: any }) => {
      const response = await fetch(`/api/training/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create module');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'modules'] });
      setShowModuleDialog(false);
      setNewModule({
        title: '',
        description: '',
        content: {},
        moduleOrder: 1,
        duration: 30,
        isRequired: true,
        moduleType: 'lesson',
        resources: {},
        completionCriteria: {}
      });
      toast({ title: "Module created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async ({ courseId, quizData }: { courseId: number; quizData: any }) => {
      const response = await fetch(`/api/training/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create quiz');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'quizzes'] });
      setShowQuizDialog(false);
      toast({ title: "Quiz created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async ({ courseId, contestData }: { courseId: number; contestData: any }) => {
      const response = await fetch(`/api/training/courses/${courseId}/contests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contestData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contest');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'contests'] });
      setShowContestDialog(false);
      toast({ title: "Contest created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleCreateProgram = () => {
    if (!newProgram.title || !newProgram.description) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createProgramMutation.mutate(newProgram);
  };

  const handleCreateModule = () => {
    if (!selectedProgram || !newModule.title) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createModuleMutation.mutate({ courseId: selectedProgram.id, moduleData: newModule });
  };

  const handleCreateQuiz = () => {
    if (!selectedProgram || !newQuiz.title) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createQuizMutation.mutate({ courseId: selectedProgram.id, quizData: newQuiz });
  };

  const handleCreateContest = () => {
    if (!selectedProgram || !newContest.title) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createContestMutation.mutate({ courseId: selectedProgram.id, contestData: newContest });
  };

  const calculateCompletionRate = (program: TrainingProgram) => {
    if (!program.totalEnrollments || program.totalEnrollments === 0) return 0;
    return Math.round(((program.completions || 0) / program.totalEnrollments) * 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced Training Management</h1>
              <p className="text-gray-600 mt-2">Comprehensive electoral observation training system</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="modules" disabled={!selectedProgram}>
              <FileText className="h-4 w-4 mr-1" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="quizzes" disabled={!selectedProgram}>
              <HelpCircle className="h-4 w-4 mr-1" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="contests" disabled={!selectedProgram}>
              <Trophy className="h-4 w-4 mr-1" />
              Contests
            </TabsTrigger>
            <TabsTrigger value="media" disabled={!selectedProgram}>
              <Video className="h-4 w-4 mr-1" />
              Media
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Target className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="space-y-6">
            {selectedProgram && (
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  Selected: <strong>{selectedProgram.title}</strong> - Use other tabs to manage modules, quizzes, contests, and media for this program.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program: TrainingProgram) => (
                <Card 
                  key={program.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedProgram?.id === program.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedProgram(program)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{program.title}</CardTitle>
                      <Badge className={getDifficultyColor(program.difficulty || 'beginner')}>
                        {program.difficulty || 'beginner'}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {program.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {program.role}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {program.duration} min
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Completion Rate</span>
                        <span className="font-medium">{calculateCompletionRate(program)}%</span>
                      </div>
                      <Progress value={calculateCompletionRate(program)} className="h-2" />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Passing Score: {program.passingScore}%</span>
                        <span className={program.isActive ? "text-green-600" : "text-gray-500"}>
                          {program.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProgram(program);
                      }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        setEditingProgram(program);
                        setShowEditDialog(true);
                      }}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Course Modules</h3>
                <p className="text-sm text-muted-foreground">
                  Manage learning modules for {selectedProgram?.title}
                </p>
              </div>
              <Button onClick={() => setShowModuleDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map((module: CourseModule, index: number) => (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        Module {module.moduleOrder}: {module.title}
                      </CardTitle>
                      <Badge variant={module.isRequired ? "default" : "secondary"}>
                        {module.isRequired ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="capitalize">{module.moduleType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{module.duration} minutes</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Course Quizzes</h3>
                <p className="text-sm text-muted-foreground">
                  Manage assessments for {selectedProgram?.title}
                </p>
              </div>
              <Button onClick={() => setShowQuizDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizzes.map((quiz: CourseQuiz) => (
                <Card key={quiz.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{quiz.title}</CardTitle>
                    <CardDescription>{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Questions:</span>
                        <span>{quiz.questions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time Limit:</span>
                        <span>{quiz.timeLimit} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passing Score:</span>
                        <span>{quiz.passingScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Attempts:</span>
                        <span>{quiz.maxAttempts}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contests" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Course Contests</h3>
                <p className="text-sm text-muted-foreground">
                  Manage competitions for {selectedProgram?.title}
                </p>
              </div>
              <Button onClick={() => setShowContestDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contest
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contests.map((contest: CourseContest) => (
                <Card key={contest.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{contest.title}</CardTitle>
                      <Badge className="capitalize">{contest.contestType.replace('_', ' ')}</Badge>
                    </div>
                    <CardDescription>{contest.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Participants:</span>
                        <span>{contest.maxParticipants}</span>
                      </div>
                      {contest.startDate && (
                        <div className="flex justify-between">
                          <span>Start Date:</span>
                          <span>{new Date(contest.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {contest.endDate && (
                        <div className="flex justify-between">
                          <span>End Date:</span>
                          <span>{new Date(contest.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Course Media</h3>
                <p className="text-sm text-muted-foreground">
                  Manage media files for {selectedProgram?.title}
                </p>
              </div>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Media
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {media.map((item: CourseMedia) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{item.originalName}</CardTitle>
                      <Badge className="capitalize">{item.mediaType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{Math.round(item.fileSize / 1024)} KB</span>
                      </div>
                      {item.duration && (
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{Math.round(item.duration / 60)} min</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Total Programs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{programs.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Total Enrollments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {programs.reduce((sum: number, p: TrainingProgram) => sum + (p.totalEnrollments || 0), 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {programs.length > 0 ? Math.round(
                      programs.reduce((sum: number, p: TrainingProgram) => sum + calculateCompletionRate(p), 0) / programs.length
                    ) : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Program Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Training Program</DialogTitle>
              <DialogDescription>
                Design a comprehensive electoral observation training program
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Program Title</Label>
                <Input
                  id="title"
                  value={newProgram.title}
                  onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                  placeholder="Enter program title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  placeholder="Describe the training program objectives"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Target Role</Label>
                  <Select value={newProgram.role} onValueChange={(value) => setNewProgram({ ...newProgram, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Observer">Observer</SelectItem>
                      <SelectItem value="Coordinator">Parish Coordinator</SelectItem>
                      <SelectItem value="Admin">Administrator</SelectItem>
                      <SelectItem value="All">All Roles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={newProgram.difficulty} onValueChange={(value) => setNewProgram({ ...newProgram, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="50"
                  max="100"
                  value={newProgram.passingScore}
                  onChange={(e) => setNewProgram({ ...newProgram, passingScore: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newProgram.isActive}
                  onCheckedChange={(checked) => setNewProgram({ ...newProgram, isActive: checked })}
                />
                <Label htmlFor="active">Program is active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProgram}>
                  Create Program
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Module Dialog */}
        <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Course Module</DialogTitle>
              <DialogDescription>
                Create a new learning module for {selectedProgram?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="moduleTitle">Module Title</Label>
                <Input
                  id="moduleTitle"
                  value={newModule.title}
                  onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                  placeholder="Enter module title"
                />
              </div>
              <div>
                <Label htmlFor="moduleDescription">Description</Label>
                <Textarea
                  id="moduleDescription"
                  value={newModule.description}
                  onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                  placeholder="Describe the module content"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="moduleType">Module Type</Label>
                  <Select value={newModule.moduleType} onValueChange={(value) => setNewModule({ ...newModule, moduleType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lesson">Lesson</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="moduleOrder">Order</Label>
                  <Input
                    id="moduleOrder"
                    type="number"
                    min="1"
                    value={newModule.moduleOrder}
                    onChange={(e) => setNewModule({ ...newModule, moduleOrder: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="moduleDuration">Duration (min)</Label>
                  <Input
                    id="moduleDuration"
                    type="number"
                    min="5"
                    value={newModule.duration}
                    onChange={(e) => setNewModule({ ...newModule, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="moduleRequired"
                  checked={newModule.isRequired}
                  onCheckedChange={(checked) => setNewModule({ ...newModule, isRequired: checked })}
                />
                <Label htmlFor="moduleRequired">Module is required</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModuleDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateModule}>
                  Add Module
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Quiz Dialog */}
        <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Quiz</DialogTitle>
              <DialogDescription>
                Create an assessment for {selectedProgram?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quizTitle">Quiz Title</Label>
                <Input
                  id="quizTitle"
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  placeholder="Enter quiz title"
                />
              </div>
              <div>
                <Label htmlFor="quizDescription">Description</Label>
                <Textarea
                  id="quizDescription"
                  value={newQuiz.description}
                  onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                  placeholder="Describe the quiz purpose"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="5"
                    value={newQuiz.timeLimit}
                    onChange={(e) => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxAttempts">Max Attempts</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    min="1"
                    max="10"
                    value={newQuiz.maxAttempts}
                    onChange={(e) => setNewQuiz({ ...newQuiz, maxAttempts: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="quizPassingScore">Passing Score (%)</Label>
                <Input
                  id="quizPassingScore"
                  type="number"
                  min="50"
                  max="100"
                  value={newQuiz.passingScore}
                  onChange={(e) => setNewQuiz({ ...newQuiz, passingScore: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowQuizDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateQuiz}>
                  Create Quiz
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Contest Dialog */}
        <Dialog open={showContestDialog} onOpenChange={setShowContestDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Contest</DialogTitle>
              <DialogDescription>
                Create a competition for {selectedProgram?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="contestTitle">Contest Title</Label>
                <Input
                  id="contestTitle"
                  value={newContest.title}
                  onChange={(e) => setNewContest({ ...newContest, title: e.target.value })}
                  placeholder="Enter contest title"
                />
              </div>
              <div>
                <Label htmlFor="contestDescription">Description</Label>
                <Textarea
                  id="contestDescription"
                  value={newContest.description}
                  onChange={(e) => setNewContest({ ...newContest, description: e.target.value })}
                  placeholder="Describe the contest"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contestType">Contest Type</Label>
                  <Select value={newContest.contestType} onValueChange={(value) => setNewContest({ ...newContest, contestType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz_competition">Quiz Competition</SelectItem>
                      <SelectItem value="case_study">Case Study</SelectItem>
                      <SelectItem value="scenario_simulation">Scenario Simulation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="5"
                    value={newContest.maxParticipants}
                    onChange={(e) => setNewContest({ ...newContest, maxParticipants: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={newContest.startDate}
                    onChange={(e) => setNewContest({ ...newContest, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={newContest.endDate}
                    onChange={(e) => setNewContest({ ...newContest, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowContestDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateContest}>
                  Create Contest
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}