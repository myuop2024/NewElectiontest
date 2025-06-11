import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Wand2, Edit, Eye, Copy, Trash2, Star, Settings, Plus, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CertificateTemplate {
  id: number;
  name: string;
  description: string;
  templateType: string;
  templateData: any;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateGenerationForm {
  style: string;
  organization: string;
  purpose: string;
  colors: string[];
  layout: string;
}

interface Suggestion {
  category: string;
  title: string;
  description: string;
  impact: string;
  implementation: string;
}

export default function AdminCertificateTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [generationForm, setGenerationForm] = useState<TemplateGenerationForm>({
    style: 'professional',
    organization: 'Electoral Commission',
    purpose: 'Training Completion',
    colors: ['#2c3e50', '#34495e', '#3498db'],
    layout: 'landscape'
  });
  const [editRequest, setEditRequest] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const response = await fetch('/api/certificate-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Generate template mutation
  const generateTemplateMutation = useMutation({
    mutationFn: async (formData: TemplateGenerationForm) => {
      const response = await fetch('/api/certificate-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to generate template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: "Template generated successfully!" });
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsGenerating(false);
    }
  });

  // Edit template mutation
  const editTemplateMutation = useMutation({
    mutationFn: async ({ id, editRequest }: { id: number; editRequest: string }) => {
      const response = await fetch(`/api/certificate-templates/${id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editRequest })
      });
      if (!response.ok) throw new Error('Failed to edit template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: "Template updated successfully!" });
      setEditRequest('');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/certificate-templates/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast({ title: "Template deleted successfully!" });
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Get suggestions
  const getSuggestions = async (templateId: number) => {
    try {
      const response = await fetch(`/api/certificate-templates/${templateId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to get suggestions');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to get suggestions", variant: "destructive" });
    }
  };

  // Generate variations
  const generateVariations = async (templateId: number, count = 3) => {
    try {
      const response = await fetch(`/api/certificate-templates/${templateId}/variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      if (!response.ok) throw new Error('Failed to generate variations');
      const data = await response.json();
      setVariations(data.variations || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate variations", variant: "destructive" });
    }
  };

  const handleGenerateTemplate = () => {
    setIsGenerating(true);
    generateTemplateMutation.mutate(generationForm);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate || !editRequest.trim()) return;
    editTemplateMutation.mutate({ id: selectedTemplate.id, editRequest });
  };

  const getTemplateTypeColor = (type: string) => {
    const colors = {
      basic: 'bg-gray-100 text-gray-800',
      professional: 'bg-blue-100 text-blue-800',
      modern: 'bg-purple-100 text-purple-800',
      elegant: 'bg-green-100 text-green-800',
      minimal: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificate Template Management</h1>
        <p className="text-gray-600">Create, edit, and manage certificate templates with AI assistance</p>
      </div>

      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Template Library
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Generator
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Template Editor
          </TabsTrigger>
          <TabsTrigger value="variations" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Variations
          </TabsTrigger>
        </TabsList>

        {/* Template Library */}
        <TabsContent value="library" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Template Library</h2>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">Loading templates...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates?.map((template: CertificateTemplate) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      </div>
                      {template.isDefault && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Badge className={getTemplateTypeColor(template.templateType)}>
                        {template.templateType}
                      </Badge>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTemplate(template)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTemplate(template)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Generator */}
        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                AI Template Generator
              </CardTitle>
              <CardDescription>
                Generate professional certificate templates using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="style">Template Style</Label>
                  <Select value={generationForm.style} onValueChange={(value) => 
                    setGenerationForm(prev => ({ ...prev, style: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="elegant">Elegant</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="layout">Layout</Label>
                  <Select value={generationForm.layout} onValueChange={(value) => 
                    setGenerationForm(prev => ({ ...prev, layout: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="organization">Organization Name</Label>
                  <Input
                    id="organization"
                    value={generationForm.organization}
                    onChange={(e) => setGenerationForm(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="Electoral Commission"
                  />
                </div>

                <div>
                  <Label htmlFor="purpose">Certificate Purpose</Label>
                  <Input
                    id="purpose"
                    value={generationForm.purpose}
                    onChange={(e) => setGenerationForm(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Training Completion"
                  />
                </div>
              </div>

              <div>
                <Label>Color Scheme</Label>
                <div className="flex gap-2 mt-2">
                  {generationForm.colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                      <Input
                        value={color}
                        onChange={(e) => {
                          const newColors = [...generationForm.colors];
                          newColors[index] = e.target.value;
                          setGenerationForm(prev => ({ ...prev, colors: newColors }));
                        }}
                        className="w-24"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGenerateTemplate}
                disabled={isGenerating || !generationForm.organization || !generationForm.purpose}
                className="w-full flex items-center gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Template'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Editor */}
        <TabsContent value="editor" className="space-y-6">
          {selectedTemplate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Edit Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Edit Template: {selectedTemplate.name}</CardTitle>
                  <CardDescription>Use AI to modify template properties</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="editRequest">Edit Request</Label>
                    <Textarea
                      id="editRequest"
                      value={editRequest}
                      onChange={(e) => setEditRequest(e.target.value)}
                      placeholder="e.g., Make the title larger and change colors to blue theme"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleEditTemplate}
                    disabled={!editRequest.trim() || editTemplateMutation.isPending}
                    className="w-full"
                  >
                    {editTemplateMutation.isPending ? 'Applying Changes...' : 'Apply AI Edit'}
                  </Button>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => getSuggestions(selectedTemplate.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Get AI Suggestions
                    </Button>
                    <Button 
                      onClick={() => generateVariations(selectedTemplate.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Generate Variations
                    </Button>
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">AI Suggestions</h4>
                      {suggestions.map((suggestion, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-sm">{suggestion.title}</h5>
                            <Badge variant={suggestion.impact === 'high' ? 'destructive' : suggestion.impact === 'medium' ? 'default' : 'secondary'}>
                              {suggestion.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                          <p className="text-xs text-gray-500">{suggestion.implementation}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Preview</CardTitle>
                  <CardDescription>Live preview of your template</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Template preview will appear here</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Configure template settings to see preview
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a template from the library to edit</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Variations */}
        <TabsContent value="variations" className="space-y-6">
          {variations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {variations.map((variation, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{variation.name}</CardTitle>
                    <CardDescription>{variation.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Copy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Generate variations from an existing template</p>
                <p className="text-sm text-gray-400 mt-2">
                  Select a template and use the "Generate Variations" button
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 