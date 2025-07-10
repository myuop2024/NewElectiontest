import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Video,
  FileText,
  Users,
  Clock,
  Trophy,
  Plus,
  Edit,
  Trash2,
  Play,
  Save,
  Eye,
  ChevronUp,
  ChevronDown,
  GraduationCap,
  Target,
  CheckCircle,
  AlertCircle,
  Upload,
  Link,
  HelpCircle
} from "lucide-react";

interface CourseBuilderProps {
  course?: any;
  onSave: (courseData: any) => void;
  onCancel: () => void;
}

export default function CourseBuilder({ course, onSave, onCancel }: CourseBuilderProps) {
  const [courseData, setCourseData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    category: course?.category || 'Electoral Law',
    difficulty: course?.difficulty || 'beginner',
    duration: course?.duration || 120,
    role: course?.role || 'Observer',
    passingScore: course?.passingScore || 80,
    isActive: course?.isActive ?? true,
    modules: course?.modules || []
  });

  const [activeTab, setActiveTab] = useState('details');
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);

  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    type: 'lesson',
    duration: 30,
    isRequired: true,
    lessons: []
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    type: 'text',
    content: '',
    duration: 15,
    videoUrl: '',
    attachments: []
  });

  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    questions: [],
    timeLimit: 30,
    passingScore: 80,
    maxAttempts: 3
  });

  const addModule = () => {
    const newModule = {
      id: Date.now(),
      ...moduleForm,
      order: courseData.modules.length + 1,
      lessons: [],
      quizzes: []
    };
    
    setCourseData(prev => ({
      ...prev,
      modules: [...prev.modules, newModule]
    }));
    
    setModuleForm({
      title: '',
      description: '',
      type: 'lesson',
      duration: 30,
      isRequired: true,
      lessons: []
    });
    setShowModuleDialog(false);
  };

  const addLesson = (moduleId: number) => {
    const newLesson = {
      id: Date.now(),
      ...lessonForm,
      order: (selectedModule?.lessons?.length || 0) + 1
    };

    setCourseData(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId
          ? { ...module, lessons: [...(module.lessons || []), newLesson] }
          : module
      )
    }));

    setLessonForm({
      title: '',
      description: '',
      type: 'text',
      content: '',
      duration: 15,
      videoUrl: '',
      attachments: []
    });
    setShowLessonDialog(false);
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1
    };

    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId: number, field: string, value: any) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const calculateTotalDuration = () => {
    return courseData.modules.reduce((total, module) => {
      const lessonDuration = (module.lessons || []).reduce((sum: number, lesson: any) => sum + (lesson.duration || 0), 0);
      return total + lessonDuration;
    }, 0);
  };

  const getProgressStats = () => {
    const totalLessons = courseData.modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
    const totalQuizzes = courseData.modules.reduce((total, module) => total + (module.quizzes?.length || 0), 0);
    
    return {
      modules: courseData.modules.length,
      lessons: totalLessons,
      quizzes: totalQuizzes,
      duration: calculateTotalDuration()
    };
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {course ? 'Edit Course' : 'Create New Course'}
          </h1>
          <p className="text-muted-foreground">
            Build comprehensive training with modules, lessons, and assessments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(courseData)} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Course
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{getProgressStats().modules}</div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
            <div className="text-center">
              <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{getProgressStats().lessons}</div>
              <div className="text-sm text-muted-foreground">Lessons</div>
            </div>
            <div className="text-center">
              <HelpCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{getProgressStats().quizzes}</div>
              <div className="text-sm text-muted-foreground">Quizzes</div>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{getProgressStats().duration}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Course Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={courseData.title}
                    onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter course title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={courseData.category} onValueChange={(value) => setCourseData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electoral Law">Electoral Law</SelectItem>
                      <SelectItem value="Observation Procedures">Observation Procedures</SelectItem>
                      <SelectItem value="Technology & Tools">Technology & Tools</SelectItem>
                      <SelectItem value="Ethics & Conduct">Ethics & Conduct</SelectItem>
                      <SelectItem value="Safety & Security">Safety & Security</SelectItem>
                      <SelectItem value="Communication">Communication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseData.description}
                  onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what learners will gain from this course"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Target Role</Label>
                  <Select value={courseData.role} onValueChange={(value) => setCourseData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Observer">Observer</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Coordinator">Coordinator</SelectItem>
                      <SelectItem value="All">All Roles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={courseData.difficulty} onValueChange={(value) => setCourseData(prev => ({ ...prev, difficulty: value }))}>
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
                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score (%)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={courseData.passingScore}
                    onChange={(e) => setCourseData(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={courseData.isActive}
                  onCheckedChange={(checked) => setCourseData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Course is active and available to learners</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules & Lessons Tab */}
        <TabsContent value="modules" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Course Modules</h3>
            <Button onClick={() => setShowModuleDialog(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Module
            </Button>
          </div>

          <div className="space-y-4">
            {courseData.modules.map((module: any, index: number) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Module {index + 1}: {module.title}
                        {module.isRequired && <Badge variant="secondary">Required</Badge>}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {module.lessons?.length || 0} lessons • {module.duration} minutes
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedModule(module);
                          setShowLessonDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lesson
                      </Button>
                    </div>

                    {module.lessons && module.lessons.length > 0 && (
                      <div className="space-y-2">
                        {module.lessons.map((lesson: any, lessonIndex: number) => (
                          <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {lesson.type === 'video' && <Video className="w-4 h-4 text-blue-600" />}
                              {lesson.type === 'text' && <FileText className="w-4 h-4 text-green-600" />}
                              {lesson.type === 'interactive' && <Target className="w-4 h-4 text-purple-600" />}
                              <div>
                                <div className="font-medium">{lesson.title}</div>
                                <div className="text-sm text-muted-foreground">{lesson.duration} minutes</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {courseData.modules.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No modules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your course by adding modules with lessons and activities.
                  </p>
                  <Button onClick={() => setShowModuleDialog(true)}>
                    Create First Module
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments">
          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Quiz Builder</h3>
              <p className="text-muted-foreground mb-4">
                Create interactive quizzes and assessments for your course.
              </p>
              <Button onClick={() => setShowQuizDialog(true)}>
                Create Quiz
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Course Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <h2 className="text-2xl font-bold mb-2">{courseData.title}</h2>
                  <p className="text-muted-foreground mb-4">{courseData.description}</p>
                  <div className="flex gap-4 text-sm">
                    <Badge>{courseData.category}</Badge>
                    <Badge variant="outline">{courseData.difficulty}</Badge>
                    <Badge variant="outline">{courseData.role}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{calculateTotalDuration()}</div>
                      <div className="text-sm text-muted-foreground">Minutes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{courseData.modules.length}</div>
                      <div className="text-sm text-muted-foreground">Modules</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{courseData.passingScore}%</div>
                      <div className="text-sm text-muted-foreground">Passing Score</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Module Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moduleTitle">Module Title</Label>
              <Input
                id="moduleTitle"
                value={moduleForm.title}
                onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter module title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moduleDescription">Description</Label>
              <Textarea
                id="moduleDescription"
                value={moduleForm.description}
                onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this module covers"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moduleType">Module Type</Label>
                <Select value={moduleForm.type} onValueChange={(value) => setModuleForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Lesson</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleDuration">Estimated Duration (minutes)</Label>
                <Input
                  id="moduleDuration"
                  type="number"
                  value={moduleForm.duration}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="moduleRequired"
                checked={moduleForm.isRequired}
                onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, isRequired: checked }))}
              />
              <Label htmlFor="moduleRequired">This module is required</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModuleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addModule}>
                Add Module
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lessonTitle">Lesson Title</Label>
                <Input
                  id="lessonTitle"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter lesson title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lessonType">Lesson Type</Label>
                <Select value={lessonForm.type} onValueChange={(value) => setLessonForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonDescription">Description</Label>
              <Textarea
                id="lessonDescription"
                value={lessonForm.description}
                onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the lesson"
                rows={2}
              />
            </div>

            {lessonForm.type === 'video' && (
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="lessonContent">Content</Label>
              <Textarea
                id="lessonContent"
                value={lessonForm.content}
                onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter lesson content (supports markdown)"
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonDuration">Duration (minutes)</Label>
              <Input
                id="lessonDuration"
                type="number"
                value={lessonForm.duration}
                onChange={(e) => setLessonForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLessonDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => selectedModule && addLesson(selectedModule.id)}>
                Add Lesson
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}