import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen,
  Video,
  FileText,
  Clock,
  CheckCircle,
  Play,
  ChevronRight,
  Trophy,
  Target,
  Users,
  Award,
  Download,
  Share
} from "lucide-react";

interface CourseViewerProps {
  course: any;
  userProgress?: any;
  onStartLesson: (lessonId: number) => void;
  onCompleteLesson: (lessonId: number) => void;
  onEnroll?: () => void;
}

interface Module {
  id: number;
  title: string;
  description: string;
  duration: number;
  moduleOrder: number;
  moduleType: string;
  lessons?: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  duration: number;
  lessonOrder: number;
  type: string;
  content: any;
}

export default function CourseViewer({ course, userProgress, onStartLesson, onCompleteLesson, onEnroll }: CourseViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  const isEnrolled = userProgress?.isEnrolled || course?.isEnrolled || false;
  const overallProgress = userProgress?.progress || course?.progress || 0;

  // Fetch course modules and lessons
  React.useEffect(() => {
    if (course?.id) {
      fetch(`/api/training/courses/${course.id}/modules`)
        .then(res => res.json())
        .then(data => setModules(data))
        .catch(err => console.error('Failed to fetch modules:', err));
    }
  }, [course?.id]);
  
  const calculateModuleProgress = (moduleId: number) => {
    if (!userProgress?.moduleProgress) return 0;
    const moduleProgress = userProgress.moduleProgress[moduleId];
    return moduleProgress?.progress || 0;
  };

  const isLessonCompleted = (lessonId: number) => {
    if (!userProgress?.lessonProgress) return false;
    return userProgress.lessonProgress[lessonId]?.status === 'completed';
  };

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-blue-600" />;
      case 'reading':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'interactive':
        return <Target className="w-5 h-5 text-purple-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-blue-600" />;
      case 'text':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'interactive':
        return <Target className="w-4 h-4 text-purple-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-orange-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Course Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg opacity-10"></div>
        <Card className="relative">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                <p className="text-muted-foreground text-lg mb-4">{course.description}</p>
                <div className="flex gap-2 mb-4">
                  <Badge>{course.category}</Badge>
                  <Badge variant="outline">{course.difficulty}</Badge>
                  <Badge variant="outline">{course.role}</Badge>
                </div>
              </div>
              {!isEnrolled && (
                <Button size="lg" onClick={onEnroll} className="ml-6">
                  Enroll Now
                </Button>
              )}
            </div>

            {isEnrolled && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Course Progress</span>
                  <span>{overallProgress}% Complete</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{course.modules?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Modules</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{course.duration || 0}</div>
            <div className="text-sm text-muted-foreground">Minutes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{course.enrollmentCount || 0}</div>
            <div className="text-sm text-muted-foreground">Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{course.passingScore}%</div>
            <div className="text-sm text-muted-foreground">Passing Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {course.description}
              </p>
              
              {course.learningObjectives && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Learning Objectives</h3>
                  <ul className="space-y-2">
                    {course.learningObjectives.map((objective: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {course.prerequisites && course.prerequisites.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Prerequisites</h3>
                  <div className="space-y-2">
                    {course.prerequisites.map((prereq: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline">{prereq.title || prereq}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isEnrolled && (
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
                      <div className="text-sm text-muted-foreground">Complete</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {userProgress?.completedLessons || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Lessons Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {userProgress?.timeSpent || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Minutes Spent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {userProgress?.certificates || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Certificates</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Curriculum</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-4">
                {course.modules?.map((module: any, index: number) => (
                  <AccordionItem key={module.id} value={`module-${module.id}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          {getModuleIcon(module.type)}
                          <div>
                            <div className="font-medium">
                              Module {index + 1}: {module.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {module.lessons?.length || 0} lessons • {module.duration} minutes
                            </div>
                          </div>
                        </div>
                        {isEnrolled && (
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={calculateModuleProgress(module.id)} 
                              className="w-20 h-2" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {calculateModuleProgress(module.id)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-4">
                        <p className="text-muted-foreground text-sm mb-4">
                          {module.description}
                        </p>
                        {module.lessons?.map((lesson: any, lessonIndex: number) => (
                          <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {getLessonIcon(lesson.type)}
                              <div>
                                <div className="font-medium">{lesson.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {lesson.duration} minutes
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLessonCompleted(lesson.id) ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : isEnrolled ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => onStartLesson(lesson.id)}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Start
                                </Button>
                              ) : (
                                <Badge variant="secondary">Locked</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {(!course.modules || course.modules.length === 0) && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Course content coming soon</h3>
                  <p className="text-muted-foreground">
                    The instructor is still building this course curriculum.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Course Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Course Handbook</div>
                        <div className="text-sm text-muted-foreground">Complete reference guide</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">Video Lectures</div>
                        <div className="text-sm text-muted-foreground">Recorded training sessions</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Play className="w-4 h-4 mr-2" />
                      Watch
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium">Certificate Template</div>
                        <div className="text-sm text-muted-foreground">Preview your certificate</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Share className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}