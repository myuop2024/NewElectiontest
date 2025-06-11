import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Clock, 
  Users, 
  BookOpen, 
  CheckCircle,
  Eye,
  Download,
  FileText,
  Video,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  duration: number;
  order: number;
  isRequired: boolean;
}

interface TrainingProgram {
  id: number;
  title: string;
  description: string;
  targetRole: string;
  modules: TrainingModule[];
  passingScore: number;
  isActive: boolean;
  completions: number;
  totalEnrollments: number;
}

const PREDEFINED_PROGRAMS = [
  {
    title: "Basic Observer Training",
    description: "Essential training for all electoral observers covering fundamental procedures and responsibilities",
    targetRole: "Observer",
    modules: [
      {
        title: "Introduction to Electoral Observation",
        description: "Overview of the electoral process and observer role",
        content: "Electoral observation is a fundamental component of democratic governance...",
        duration: 30,
        isRequired: true
      },
      {
        title: "Polling Station Procedures",
        description: "Understanding polling station setup, voting process, and closing procedures",
        content: "Polling stations must be set up according to specific guidelines...",
        duration: 45,
        isRequired: true
      },
      {
        title: "Incident Reporting",
        description: "How to identify, document, and report electoral irregularities",
        content: "Observers must be trained to identify various types of irregularities...",
        duration: 20,
        isRequired: true
      },
      {
        title: "Code of Conduct",
        description: "Ethical guidelines and professional conduct for observers",
        content: "Electoral observers must maintain strict neutrality...",
        duration: 15,
        isRequired: true
      }
    ]
  },
  {
    title: "Parish Coordinator Training",
    description: "Advanced training for parish coordinators managing multiple observers",
    targetRole: "Coordinator",
    modules: [
      {
        title: "Team Management",
        description: "Managing teams of observers across multiple polling stations",
        content: "Effective coordination requires clear communication...",
        duration: 40,
        isRequired: true
      },
      {
        title: "Emergency Response",
        description: "Handling emergency situations and escalating issues",
        content: "Parish coordinators must be prepared to handle various emergency scenarios...",
        duration: 30,
        isRequired: true
      },
      {
        title: "Data Collection & Reporting",
        description: "Aggregating reports and ensuring data quality",
        content: "Coordinators are responsible for quality control...",
        duration: 35,
        isRequired: true
      }
    ]
  }
];

export default function TrainingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('programs');
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);

  // New program form
  const [newProgram, setNewProgram] = useState({
    title: '',
    description: '',
    targetRole: 'Observer',
    passingScore: 80
  });

  // New module form
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    content: '',
    videoUrl: '',
    duration: 30,
    isRequired: true
  });

  // Fetch training programs
  const { data: programs, isLoading } = useQuery({
    queryKey: ['/api/training/programs'],
    queryFn: async () => {
      const response = await fetch('/api/training/programs');
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json();
    }
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/training/analytics'],
    queryFn: async () => {
      const response = await fetch('/api/training/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (programData: any) => {
      const response = await fetch('/api/training/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData)
      });
      if (!response.ok) throw new Error('Failed to create program');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/programs'] });
      setShowCreateDialog(false);
      setNewProgram({ title: '', description: '', targetRole: 'Observer', passingScore: 80 });
      toast({ title: "Training program created successfully" });
    }
  });

  // Initialize predefined programs
  const initializePredefinedPrograms = async () => {
    try {
      for (const program of PREDEFINED_PROGRAMS) {
        await createProgramMutation.mutateAsync(program);
      }
      toast({ title: "Predefined training programs initialized" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to initialize programs", variant: "destructive" });
    }
  };

  const handleCreateProgram = () => {
    if (!newProgram.title || !newProgram.description) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createProgramMutation.mutate(newProgram);
  };

  const calculateCompletionRate = (program: TrainingProgram) => {
    if (program.totalEnrollments === 0) return 0;
    return Math.round((program.completions / program.totalEnrollments) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Management</h1>
          <p className="text-muted-foreground">Manage electoral observer training programs and content</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={initializePredefinedPrograms} variant="outline">
            Initialize Standard Programs
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Training Program</DialogTitle>
                <DialogDescription>
                  Create a new training program for electoral observers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Program Title</Label>
                  <Input
                    id="title"
                    value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="e.g., Advanced Observer Training"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    placeholder="Describe the program objectives and content"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetRole">Target Role</Label>
                    <Select value={newProgram.targetRole} onValueChange={(value) => setNewProgram({ ...newProgram, targetRole: value })}>
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
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm text-muted-foreground">Total Programs</div>
              <div className="text-2xl font-bold">{programs?.length || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <div className="text-sm text-muted-foreground">Active Enrollments</div>
              <div className="text-2xl font-bold">{analytics?.activeEnrollments || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <div className="text-sm text-muted-foreground">Completions</div>
              <div className="text-2xl font-bold">{analytics?.totalCompletions || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-purple-600" />
            <div>
              <div className="text-sm text-muted-foreground">Avg. Completion Time</div>
              <div className="text-2xl font-bold">{analytics?.avgCompletionTime || 0}h</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs">Training Programs</TabsTrigger>
          <TabsTrigger value="content">Content Management</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          {isLoading ? (
            <div>Loading programs...</div>
          ) : programs && programs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program) => (
                <Card key={program.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{program.title}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {program.targetRole}
                        </Badge>
                      </div>
                      <Badge variant={program.isActive ? "default" : "secondary"}>
                        {program.isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{program.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Modules:</span>
                        <span className="font-medium">{program.modules?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enrollments:</span>
                        <span className="font-medium">{program.totalEnrollments || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completion Rate:</span>
                        <span className="font-medium">{calculateCompletionRate(program)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passing Score:</span>
                        <span className="font-medium">{program.passingScore}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => setSelectedProgram(program)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Training Programs</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first training program or initializing standard programs.
                </p>
                <Button onClick={initializePredefinedPrograms}>
                  Initialize Standard Programs
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Content management tools for creating and editing training materials, videos, and assessments.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Content Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Electoral Law Overview</div>
                      <div className="text-sm text-muted-foreground">PDF document • 1.2 MB</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Polling Station Setup</div>
                      <div className="text-sm text-muted-foreground">Video • 15:30</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Manage certificate templates and generation for completed training programs.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Certificate Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Certificate management features will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Program Detail Dialog */}
      {selectedProgram && (
        <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProgram.title}</DialogTitle>
              <DialogDescription>{selectedProgram.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Role</Label>
                  <div className="font-medium">{selectedProgram.targetRole}</div>
                </div>
                <div>
                  <Label>Passing Score</Label>
                  <div className="font-medium">{selectedProgram.passingScore}%</div>
                </div>
              </div>
              <div>
                <Label>Training Modules</Label>
                <div className="space-y-2 mt-2">
                  {selectedProgram.modules?.map((module, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{module.title}</div>
                          <div className="text-sm text-muted-foreground">{module.description}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {module.duration} min {module.isRequired && "• Required"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}