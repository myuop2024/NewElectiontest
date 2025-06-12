import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
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
import { useEnhancedTraining } from "@/hooks/useEnhancedTraining";
import { ProgramDialog } from "@/components/training/ProgramDialog";
import { ModuleDialog } from "@/components/training/ModuleDialog";
import { QuizDialog } from "@/components/training/QuizDialog";
import { ContestDialog } from "@/components/training/ContestDialog";

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
}

interface CourseQuiz {
  id: number;
  title: string;
  description: string;
}

interface CourseContest {
  id: number;
  title: string;
  description: string;
}

const INITIAL_PROGRAM_STATE = {
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
};

const INITIAL_MODULE_STATE = {
  title: '',
  description: '',
  content: {},
  moduleOrder: 1,
  duration: 30,
  isRequired: true,
  moduleType: 'lesson'
};

const INITIAL_QUIZ_STATE = {
  title: '',
  description: '',
  questions: [],
  timeLimit: 60,
  maxAttempts: 3,
  passingScore: 80,
  quizType: 'assessment'
};

const INITIAL_CONTEST_STATE = {
  title: '',
  description: '',
  contestType: 'quiz_competition',
  rules: {},
  prizes: {},
  startDate: '',
  endDate: '',
  maxParticipants: 50
};

export default function EnhancedTrainingManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('programs');
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);

  // Dialog states
  const [dialogState, setDialogState] = useState({
    program: false,
    module: false,
    quiz: false,
    contest: false,
  });
  const [isEdit, setIsEdit] = useState(false);
  
  // Form states
  const [programForm, setProgramForm] = useState(INITIAL_PROGRAM_STATE);
  const [moduleForm, setModuleForm] = useState(INITIAL_MODULE_STATE);
  const [quizForm, setQuizForm] = useState(INITIAL_QUIZ_STATE);
  const [contestForm, setContestForm] = useState(INITIAL_CONTEST_STATE);

  const {
    programs,
    programsLoading,
    modules,
    quizzes,
    contests,
    media,
    createProgramMutation,
    updateProgramMutation,
    deleteProgramMutation,
    createModuleMutation,
    updateModuleMutation,
    deleteModuleMutation,
    createQuizMutation,
    updateQuizMutation,
    deleteQuizMutation,
    createContestMutation,
    updateContestMutation,
    deleteContestMutation
  } = useEnhancedTraining(selectedProgram);

  const openDialog = (type: 'program' | 'module' | 'quiz' | 'contest', edit = false, data?: any) => {
    setIsEdit(edit);
    if (type === 'program') {
      setProgramForm(edit && data ? data : INITIAL_PROGRAM_STATE);
    } else if (type === 'module') {
      setModuleForm(edit && data ? data : INITIAL_MODULE_STATE);
    } else if (type === 'quiz') {
      setQuizForm(edit && data ? data : INITIAL_QUIZ_STATE);
    } else if (type === 'contest') {
      setContestForm(edit && data ? data : INITIAL_CONTEST_STATE);
    }
    setDialogState(prev => ({ ...prev, [type]: true }));
  };

  const closeDialogs = () => {
    setDialogState({ program: false, module: false, quiz: false, contest: false });
  };

  // Handlers
  const handleProgramSubmit = () => {
    const mutation = isEdit ? updateProgramMutation : createProgramMutation;
    const payload = isEdit ? { id: programForm.id, programData: programForm } : programForm;
    mutation.mutate(payload, { onSuccess: closeDialogs });
  };
  
  const handleModuleSubmit = () => {
    if (!selectedProgram) return;
    const mutation = isEdit ? updateModuleMutation : createModuleMutation;
    const payload = isEdit 
      ? { courseId: selectedProgram.id, moduleId: moduleForm.id, moduleData: moduleForm }
      : { courseId: selectedProgram.id, moduleData: moduleForm };
    mutation.mutate(payload, { onSuccess: closeDialogs });
  };
  
  const handleQuizSubmit = () => {
    if (!selectedProgram) return;
    const mutation = isEdit ? updateQuizMutation : createQuizMutation;
    const payload = isEdit
        ? { courseId: selectedProgram.id, quizId: quizForm.id, quizData: quizForm }
        : { courseId: selectedProgram.id, quizData: quizForm };
    mutation.mutate(payload, { onSuccess: closeDialogs });
  }

  const handleContestSubmit = () => {
      if (!selectedProgram) return;
      const mutation = isEdit ? updateContestMutation : createContestMutation;
      const payload = isEdit
        ? { courseId: selectedProgram.id, contestId: contestForm.id, contestData: contestForm }
        : { courseId: selectedProgram.id, contestData: contestForm };
      mutation.mutate(payload, { onSuccess: closeDialogs });
  }
  
  const handleDelete = (type: 'program' | 'module' | 'quiz' | 'contest', id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    if (!selectedProgram && type !== 'program') return;

    if (type === 'program') deleteProgramMutation.mutate(id);
    else if (type === 'module') deleteModuleMutation.mutate({ courseId: selectedProgram!.id, moduleId: id });
    else if (type === 'quiz') deleteQuizMutation.mutate({ courseId: selectedProgram!.id, quizId: id });
    else if (type === 'contest') deleteContestMutation.mutate({ courseId: selectedProgram!.id, contestId: id });
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
              <Button onClick={() => openDialog('program')} className="bg-blue-600 hover:bg-blue-700">
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
                        openDialog('program', true, program);
                      }}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleDelete('program', program.id);
                      }}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
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
              <Button onClick={() => openDialog('module')}>
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
                      <Button size="sm" variant="outline" onClick={() => openDialog('module', true, module)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete('module', module.id)}>
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
              <Button onClick={() => openDialog('quiz')}>
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
                      <Button size="sm" variant="outline" onClick={() => openDialog('quiz', true, quiz)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete('quiz', quiz.id)}>
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
              <Button onClick={() => openDialog('contest')}>
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
                      <Button size="sm" variant="outline" onClick={() => openDialog('contest', true, contest)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete('contest', contest.id)}>
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

        <ProgramDialog
          open={dialogState.program}
          onOpenChange={closeDialogs}
          program={programForm}
          onChange={(field, value) => setProgramForm(prev => ({ ...prev, [field]: value }))}
          onSubmit={handleProgramSubmit}
          isEdit={isEdit}
          loading={createProgramMutation.isLoading || updateProgramMutation.isLoading}
        />
        <ModuleDialog
            open={dialogState.module}
            onOpenChange={closeDialogs}
            module={moduleForm}
            onChange={(field, value) => setModuleForm(prev => ({...prev, [field]: value}))}
            onSubmit={handleModuleSubmit}
            isEdit={isEdit}
            loading={createModuleMutation.isLoading || updateModuleMutation.isLoading}
        />
        <QuizDialog
            open={dialogState.quiz}
            onOpenChange={closeDialogs}
            quiz={quizForm}
            onChange={(field, value) => setQuizForm(prev => ({...prev, [field]: value}))}
            onSubmit={handleQuizSubmit}
            isEdit={isEdit}
            loading={createQuizMutation.isLoading || updateQuizMutation.isLoading}
        />
        <ContestDialog
            open={dialogState.contest}
            onOpenChange={closeDialogs}
            contest={contestForm}
            onChange={(field, value) => setContestForm(prev => ({...prev, [field]: value}))}
            onSubmit={handleContestSubmit}
            isEdit={isEdit}
            loading={createContestMutation.isLoading || updateContestMutation.isLoading}
        />
      </div>
    </div>
  );
}