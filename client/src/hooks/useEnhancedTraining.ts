import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function useEnhancedTraining(selectedProgram: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      toast({ title: "Training program created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update program mutation
  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, programData }: { id: number; programData: any }) => {
      const response = await fetch(`/api/training/programs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update program');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/programs'] });
      toast({ title: 'Training program updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete program mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/training/programs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete program');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/programs'] });
      toast({ title: 'Training program deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
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
      toast({ title: "Module created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: async ({ courseId, moduleId, moduleData }: { courseId: number; moduleId: number; moduleData: any }) => {
      const response = await fetch(`/api/training/courses/${courseId}/modules/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleData),
      });
      if (!response.ok) throw new Error('Failed to update module');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'modules'] });
      toast({ title: 'Module updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async ({ courseId, moduleId }: { courseId: number; moduleId: number }) => {
      const response = await fetch(`/api/training/courses/${courseId}/modules/${moduleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete module');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'modules'] });
      toast({ title: 'Module deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
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
      toast({ title: "Quiz created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: async ({ courseId, quizId, quizData }: { courseId: number; quizId: number; quizData: any }) => {
      const response = await fetch(`/api/training/courses/${courseId}/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      });
      if (!response.ok) throw new Error('Failed to update quiz');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'quizzes'] });
      toast({ title: 'Quiz updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async ({ courseId, quizId }: { courseId: number; quizId: number }) => {
      const response = await fetch(`/api/training/courses/${courseId}/quizzes/${quizId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete quiz');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'quizzes'] });
      toast({ title: 'Quiz deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
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
      toast({ title: "Contest created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update contest mutation
  const updateContestMutation = useMutation({
    mutationFn: async ({ courseId, contestId, contestData }: { courseId: number; contestId: number; contestData: any }) => {
      const response = await fetch(`/api/training/courses/${courseId}/contests/${contestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contestData),
      });
      if (!response.ok) throw new Error('Failed to update contest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'contests'] });
      toast({ title: 'Contest updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete contest mutation
  const deleteContestMutation = useMutation({
    mutationFn: async ({ courseId, contestId }: { courseId: number; contestId: number }) => {
      const response = await fetch(`/api/training/courses/${courseId}/contests/${contestId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete contest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/courses', selectedProgram?.id, 'contests'] });
      toast({ title: 'Contest deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
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
    deleteContestMutation,
  };
} 