import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Eye, 
  Settings, 
  Type, 
  List, 
  Calendar, 
  FileText, 
  Image, 
  Video,
  Mic,
  MapPin,
  Hash,
  ToggleLeft,
  Star
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: any;
  helpText?: string;
  order: number;
}

interface FormTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  fields: FormField[];
  isActive: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: Type },
  { value: 'textarea', label: 'Long Text', icon: FileText },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'radio', label: 'Multiple Choice', icon: ToggleLeft },
  { value: 'checkbox', label: 'Checkboxes', icon: ToggleLeft },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'file', label: 'File Upload', icon: Image },
  { value: 'image', label: 'Image Capture', icon: Image },
  { value: 'video', label: 'Video Recording', icon: Video },
  { value: 'audio', label: 'Audio Recording', icon: Mic },
  { value: 'location', label: 'GPS Location', icon: MapPin },
  { value: 'rating', label: 'Star Rating', icon: Star }
];

export default function FormBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState<FormTemplate>({
    name: '',
    description: '',
    category: 'incident',
    fields: [],
    isActive: false
  });

  // Fetch existing form templates
  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/forms/templates"],
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: (template: FormTemplate) => 
      template.id 
        ? apiRequest(`/api/forms/templates/${template.id}`, "PUT", template)
        : apiRequest("/api/forms/templates", "POST", template),
    onSuccess: () => {
      toast({
        title: "Template Saved",
        description: "Form template has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms/templates"] });
      setSelectedTemplate(null);
      setNewTemplate({
        name: '',
        description: '',
        category: 'incident',
        fields: [],
        isActive: false
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save form template",
        variant: "destructive"
      });
    }
  });

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
      order: (selectedTemplate?.fields.length || newTemplate.fields.length) + 1
    };
    
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        fields: [...selectedTemplate.fields, newField]
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        fields: [...newTemplate.fields, newField]
      });
    }
    
    setEditingField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const updateFields = (fields: FormField[]) =>
      fields.map(field => field.id === fieldId ? { ...field, ...updates } : field);
    
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        fields: updateFields(selectedTemplate.fields)
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        fields: updateFields(newTemplate.fields)
      });
    }
  };

  const removeField = (fieldId: string) => {
    const filterFields = (fields: FormField[]) => fields.filter(field => field.id !== fieldId);
    
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        fields: filterFields(selectedTemplate.fields)
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        fields: filterFields(newTemplate.fields)
      });
    }
  };

  const handleSave = () => {
    const templateToSave = selectedTemplate || newTemplate;
    if (!templateToSave.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }
    saveTemplateMutation.mutate(templateToSave);
  };

  const renderFieldIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    const Icon = fieldType?.icon || Type;
    return <Icon className="h-4 w-4" />;
  };

  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={field.placeholder || field.label} disabled />;
      case 'textarea':
        return <Textarea placeholder={field.placeholder || field.label} disabled />;
      case 'select':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
          </Select>
        );
      case 'file':
      case 'image':
      case 'video':
      case 'audio':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              {renderFieldIcon(field.type)}
              <span>Upload {field.type}</span>
            </div>
          </div>
        );
      default:
        return <Input placeholder={field.placeholder || field.label} disabled />;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Administrator privileges required to access form builder.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentTemplate = selectedTemplate || newTemplate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
              <Settings className="h-8 w-8 text-blue-600" />
              <span>Form Builder</span>
            </h1>
            <p className="text-muted-foreground">Customize incident reporting forms and fields</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={handleSave} disabled={saveTemplateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
              <CardDescription>Select or create form templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  setSelectedTemplate(null);
                  setNewTemplate({
                    name: '',
                    description: '',
                    category: 'incident',
                    fields: [],
                    isActive: false
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
              
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                templates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate?.id === template.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.fields.length} fields
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Form Builder */}
          <div className="lg:col-span-3 space-y-6">
            {/* Template Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={currentTemplate.name}
                      onChange={(e) => {
                        if (selectedTemplate) {
                          setSelectedTemplate({ ...selectedTemplate, name: e.target.value });
                        } else {
                          setNewTemplate({ ...newTemplate, name: e.target.value });
                        }
                      }}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={currentTemplate.category}
                      onValueChange={(value) => {
                        if (selectedTemplate) {
                          setSelectedTemplate({ ...selectedTemplate, category: value });
                        } else {
                          setNewTemplate({ ...newTemplate, category: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident">Incident Reports</SelectItem>
                        <SelectItem value="routine">Routine Reports</SelectItem>
                        <SelectItem value="final">Final Reports</SelectItem>
                        <SelectItem value="training">Training Forms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={currentTemplate.description}
                    onChange={(e) => {
                      if (selectedTemplate) {
                        setSelectedTemplate({ ...selectedTemplate, description: e.target.value });
                      } else {
                        setNewTemplate({ ...newTemplate, description: e.target.value });
                      }
                    }}
                    placeholder="Describe this template's purpose"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentTemplate.isActive}
                    onCheckedChange={(checked) => {
                      if (selectedTemplate) {
                        setSelectedTemplate({ ...selectedTemplate, isActive: checked });
                      } else {
                        setNewTemplate({ ...newTemplate, isActive: checked });
                      }
                    }}
                  />
                  <Label>Active Template</Label>
                </div>
              </CardContent>
            </Card>

            {/* Form Fields */}
            {previewMode ? (
              <Card>
                <CardHeader>
                  <CardTitle>Form Preview</CardTitle>
                  <CardDescription>{currentTemplate.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentTemplate.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No fields added yet. Switch to edit mode to add fields.
                    </div>
                  ) : (
                    currentTemplate.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderFieldPreview(field)}
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground">{field.helpText}</p>
                          )}
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Fields</CardTitle>
                      <CardDescription>Configure form fields and validation</CardDescription>
                    </div>
                    <Button onClick={addField}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentTemplate.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No fields added yet. Click "Add Field" to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentTemplate.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <div key={field.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {renderFieldIcon(field.type)}
                                <span className="font-medium">{field.label}</span>
                                <Badge variant="outline">{field.type}</Badge>
                                {field.required && <Badge variant="destructive">Required</Badge>}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingField(field)}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeField(field.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {editingField?.id === field.id && (
                              <div className="border-t pt-3 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <Label>Field Label</Label>
                                    <Input
                                      value={field.label}
                                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Field Type</Label>
                                    <Select
                                      value={field.type}
                                      onValueChange={(value) => updateField(field.id, { type: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FIELD_TYPES.map((type) => (
                                          <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center space-x-2">
                                              <type.icon className="h-4 w-4" />
                                              <span>{type.label}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Placeholder Text</Label>
                                  <Input
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                    placeholder="Enter placeholder text"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Help Text</Label>
                                  <Input
                                    value={field.helpText || ''}
                                    onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                                    placeholder="Additional guidance for users"
                                  />
                                </div>
                                
                                {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                                  <div>
                                    <Label>Options (one per line)</Label>
                                    <Textarea
                                      value={field.options?.join('\n') || ''}
                                      onChange={(e) => updateField(field.id, { 
                                        options: e.target.value.split('\n').filter(o => o.trim()) 
                                      })}
                                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                                    />
                                  </div>
                                )}
                                
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.required}
                                      onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                                    />
                                    <Label>Required Field</Label>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingField(null)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}