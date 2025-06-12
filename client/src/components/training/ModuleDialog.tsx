import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface ModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: any;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  loading?: boolean;
}

export const ModuleDialog: React.FC<ModuleDialogProps> = ({
  open,
  onOpenChange,
  module,
  onChange,
  onSubmit,
  isEdit = false,
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Module" : "Create Module"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Edit the details of this module." : "Add a new module to this training program."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Module Title</Label>
            <Input
              id="title"
              value={module.title}
              onChange={e => onChange("title", e.target.value)}
              placeholder="e.g., Introduction to Observation"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={module.description}
              onChange={e => onChange("description", e.target.value)}
              placeholder="Describe the module's learning objectives"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                value={module.duration}
                onChange={e => onChange("duration", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="moduleType">Module Type</Label>
              <Select value={module.moduleType} onValueChange={value => onChange("moduleType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson">Lesson</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isRequired"
              checked={module.isRequired}
              onCheckedChange={checked => onChange("isRequired", checked)}
            />
            <Label htmlFor="isRequired">This module is required</Label>
          </div>
          <div>
            <Label htmlFor="content">Content (JSON or Text)</Label>
            <Textarea
              id="content"
              value={typeof module.content === 'string' ? module.content : JSON.stringify(module.content, null, 2)}
              onChange={e => onChange("content", e.target.value)}
              placeholder="Enter module content as text or JSON"
              rows={6}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={loading}>
              {isEdit ? "Save Changes" : "Create Module"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 