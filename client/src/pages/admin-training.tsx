import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, Save, X, BarChart3, Users, CheckCircle, BookOpen, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Placeholder for admin check
const isAdmin = true;

interface Module {
  title: string;
  duration: number;
}

export default function AdminTraining() {
  const queryClient = useQueryClient();
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [newCourse, setNewCourse] = useState<any>({
    title: "",
    description: "",
    role: "observer",
    duration: 60,
    passingScore: 80,
    content: { modules: [] as Module[] },
  });
  const [newModule, setNewModule] = useState<Module>({ title: "", duration: 10 });
  
  // AI Course Creator state
  const [aiParams, setAiParams] = useState({
    topic: "",
    role: "observer",
    difficulty: "beginner",
    targetDuration: 120
  });
  const [generatedCourse, setGeneratedCourse] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all courses
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ["/api/training/courses"],
    queryFn: async () => {
      const res = await fetch("/api/training/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    }
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/training/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/training/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    }
  });

  // Create course
  const createCourseMutation = useMutation({
    mutationFn: async (course: any) => {
      const res = await fetch("/api/training/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(course)
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/training/courses"]);
      setNewCourse({ title: "", description: "", role: "observer", duration: 60, passingScore: 80, content: { modules: [] } });
    }
  });

  // Update course
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, updates }: any) => {
      const res = await fetch(`/api/training/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/training/courses"]);
      setEditingCourse(null);
    }
  });

  // Delete course
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/training/courses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/training/courses"]);
    }
  });

  // Handlers for modules in new/edit course
  const addModule = (course: any, setCourse: any) => {
    if (!newModule.title) return;
    setCourse({ ...course, content: { modules: [...course.content.modules, newModule] } });
    setNewModule({ title: "", duration: 10 });
  };
  const removeModule = (course: any, setCourse: any, idx: number) => {
    setCourse({ ...course, content: { modules: course.content.modules.filter((_: any, i: number) => i !== idx) } });
  };

  // AI Course Generation
  const generateAICourse = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/training/ai/create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiParams)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGeneratedCourse(data.course);
    } catch (error) {
      alert("Failed to generate course: " + error.message);
    }
    setIsGenerating(false);
  };
  
  // Save generated course
  const saveGeneratedCourse = () => {
    if (generatedCourse) {
      createCourseMutation.mutate(generatedCourse);
      setGeneratedCourse(null);
      setAiParams({ topic: "", role: "observer", difficulty: "beginner", targetDuration: 120 });
    }
  };

  if (!isAdmin) return <div className="p-6">Access denied.</div>;

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Admin Training Dashboard</h2>
      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm text-muted-foreground">Total Courses</div>
              <div className="text-2xl font-bold text-blue-600">{analyticsLoading ? '...' : analytics?.totalCourses ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <div>
              <div className="text-sm text-muted-foreground">Total Modules</div>
              <div className="text-2xl font-bold text-purple-600">{analyticsLoading ? '...' : analytics?.totalModules ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <div className="text-sm text-muted-foreground">Total Enrollments</div>
              <div className="text-2xl font-bold text-green-600">{analyticsLoading ? '...' : analytics?.totalEnrollments ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <div className="text-sm text-muted-foreground">Completions</div>
              <div className="text-2xl font-bold text-emerald-600">{analyticsLoading ? '...' : analytics?.totalCompletions ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Course Creation */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Create</TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Create
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual">
          {/* Existing Manual Course Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Title" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} />
              <Textarea placeholder="Description" value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
              <Input placeholder="Role (observer, agent, etc)" value={newCourse.role} onChange={e => setNewCourse({ ...newCourse, role: e.target.value })} />
              <Input type="number" placeholder="Duration (min)" value={newCourse.duration} onChange={e => setNewCourse({ ...newCourse, duration: Number(e.target.value) })} />
              <Input type="number" placeholder="Passing Score (%)" value={newCourse.passingScore} onChange={e => setNewCourse({ ...newCourse, passingScore: Number(e.target.value) })} />
              <div>
                <div className="font-medium mb-2">Modules</div>
                {newCourse.content.modules.map((mod: Module, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 mb-1">
                    <span>{mod.title} ({mod.duration} min)</span>
                    <Button size="xs" variant="ghost" onClick={() => removeModule(newCourse, setNewCourse, idx)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Module Title" value={newModule.title} onChange={e => setNewModule({ ...newModule, title: e.target.value })} />
                  <Input type="number" placeholder="Duration" value={newModule.duration} onChange={e => setNewModule({ ...newModule, duration: Number(e.target.value) })} />
                  <Button size="sm" onClick={() => addModule(newCourse, setNewCourse)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button className="mt-2" onClick={() => createCourseMutation.mutate(newCourse)}>Create Course</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                <Sparkles className="h-5 w-5 inline mr-2 text-blue-500" />
                AI Course Creator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Course topic (e.g., 'Ballot Security Procedures')" 
                value={aiParams.topic} 
                onChange={e => setAiParams({ ...aiParams, topic: e.target.value })} 
              />
              <Select value={aiParams.role} onValueChange={role => setAiParams({ ...aiParams, role })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="observer">Observer</SelectItem>
                  <SelectItem value="indoor_agent">Indoor Agent</SelectItem>
                  <SelectItem value="roving_observer">Roving Observer</SelectItem>
                  <SelectItem value="parish_coordinator">Parish Coordinator</SelectItem>
                </SelectContent>
              </Select>
              <Select value={aiParams.difficulty} onValueChange={difficulty => setAiParams({ ...aiParams, difficulty })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="number" 
                placeholder="Target duration (minutes)" 
                value={aiParams.targetDuration} 
                onChange={e => setAiParams({ ...aiParams, targetDuration: Number(e.target.value) })} 
              />
              <Button 
                className="w-full" 
                onClick={generateAICourse} 
                disabled={isGenerating || !aiParams.topic}
              >
                {isGenerating ? (
                  <>Generating Course...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Course with AI
                  </>
                )}
              </Button>
              
              {/* Generated Course Preview */}
              {generatedCourse && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-bold mb-2">Generated Course Preview:</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {generatedCourse.title}</div>
                    <div><strong>Description:</strong> {generatedCourse.description}</div>
                    <div><strong>Duration:</strong> {generatedCourse.duration} minutes</div>
                    <div><strong>Passing Score:</strong> {generatedCourse.passingScore}%</div>
                    <div><strong>Modules ({generatedCourse.content?.modules?.length || 0}):</strong></div>
                    <ul className="list-disc ml-6">
                      {generatedCourse.content?.modules?.map((mod: any, idx: number) => (
                        <li key={idx}>{mod.title} ({mod.duration} min)</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={saveGeneratedCourse}>Save Course</Button>
                    <Button variant="outline" onClick={() => setGeneratedCourse(null)}>Discard</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <div>Loading...</div> : error ? <div>Error loading courses.</div> : courses?.map((course: any) => (
          <Card key={course.id} className="relative">
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-muted-foreground">{course.description}</div>
              <div>Target Audience: {course.target_audience}</div>
              <div>Duration: {course.duration} min</div>
              <div>Passing Score: {course.passingScore}%</div>
              <div className="font-medium mt-2">Modules:</div>
              <ul className="list-disc ml-6">
                {Array.isArray(course.content?.modules) && course.content.modules.map((mod: Module, idx: number) => (
                  <li key={idx}>{mod.title} ({mod.duration} min)</li>
                ))}
              </ul>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => setEditingCourse(course)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteCourseMutation.mutate(course.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Edit Course Modal (inline for simplicity) */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Course</h3>
              <Button size="icon" variant="ghost" onClick={() => setEditingCourse(null)}><X className="h-5 w-5" /></Button>
            </div>
            <Input placeholder="Title" value={editingCourse.title} onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })} />
            <Textarea placeholder="Description" value={editingCourse.description} onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })} />
            <Input placeholder="Role" value={editingCourse.role} onChange={e => setEditingCourse({ ...editingCourse, role: e.target.value })} />
            <Input type="number" placeholder="Duration" value={editingCourse.duration} onChange={e => setEditingCourse({ ...editingCourse, duration: Number(e.target.value) })} />
            <Input type="number" placeholder="Passing Score" value={editingCourse.passingScore} onChange={e => setEditingCourse({ ...editingCourse, passingScore: Number(e.target.value) })} />
            <div className="font-medium mt-2">Modules:</div>
            {editingCourse.content.modules.map((mod: Module, idx: number) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <Input value={mod.title} onChange={e => {
                  const mods = [...editingCourse.content.modules];
                  mods[idx].title = e.target.value;
                  setEditingCourse({ ...editingCourse, content: { modules: mods } });
                }} />
                <Input type="number" value={mod.duration} onChange={e => {
                  const mods = [...editingCourse.content.modules];
                  mods[idx].duration = Number(e.target.value);
                  setEditingCourse({ ...editingCourse, content: { modules: mods } });
                }} />
                <Button size="xs" variant="ghost" onClick={() => removeModule(editingCourse, setEditingCourse, idx)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Input placeholder="Module Title" value={newModule.title} onChange={e => setNewModule({ ...newModule, title: e.target.value })} />
              <Input type="number" placeholder="Duration" value={newModule.duration} onChange={e => setNewModule({ ...newModule, duration: Number(e.target.value) })} />
              <Button size="sm" onClick={() => addModule(editingCourse, setEditingCourse)}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button className="mt-4 w-full" onClick={() => updateCourseMutation.mutate({ id: editingCourse.id, updates: editingCourse })}><Save className="h-4 w-4 mr-1" />Save Changes</Button>
          </div>
        </div>
      )}
    </div>
  );
} 