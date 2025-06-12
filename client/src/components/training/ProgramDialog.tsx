import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: any;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  loading?: boolean;
}

export const ProgramDialog: React.FC<ProgramDialogProps> = ({
  open,
  onOpenChange,
  program,
  onChange,
  onSubmit,
  isEdit = false,
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Training Program" : "Create Training Program"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Edit the details of this training program." : "Create a new training program for electoral observers."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Program Title</Label>
            <Input
              id="title"
              value={program.title}
              onChange={e => onChange("title", e.target.value)}
              placeholder="e.g., Advanced Observer Training"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={program.description}
              onChange={e => onChange("description", e.target.value)}
              placeholder="Describe the program objectives and content"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Target Role</Label>
              <Select value={program.role} onValueChange={value => onChange("role", value)}>
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
                value={program.passingScore}
                onChange={e => onChange("passingScore", parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={program.difficulty} onValueChange={value => onChange("difficulty", value)}>
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
            <div>
              <Label htmlFor="isActive">Active</Label>
              <Select value={program.isActive ? "true" : "false"} onValueChange={value => onChange("isActive", value === "true") }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="prerequisites">Prerequisites (comma separated)</Label>
            <Input
              id="prerequisites"
              value={program.prerequisites?.join(", ") || ""}
              onChange={e => onChange("prerequisites", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
              placeholder="e.g., Basic Observer Training"
            />
          </div>
          <div>
            <Label htmlFor="learningObjectives">Learning Objectives (comma separated)</Label>
            <Input
              id="learningObjectives"
              value={program.learningObjectives?.join(", ") || ""}
              onChange={e => onChange("learningObjectives", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
              placeholder="e.g., Understand procedures, Report incidents"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={program.tags?.join(", ") || ""}
              onChange={e => onChange("tags", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
              placeholder="e.g., compliance, safety, reporting"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={loading}>
              {isEdit ? "Save Changes" : "Create Program"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 