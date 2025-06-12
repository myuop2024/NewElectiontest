import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: any;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  loading?: boolean;
}

export const QuizDialog: React.FC<QuizDialogProps> = ({
  open,
  onOpenChange,
  quiz,
  onChange,
  onSubmit,
  isEdit = false,
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Edit this quiz." : "Add a new quiz to this training program."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Quiz Title</Label>
            <Input
              id="title"
              value={quiz.title}
              onChange={e => onChange("title", e.target.value)}
              placeholder="e.g., Polling Station Procedures Quiz"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={quiz.description}
              onChange={e => onChange("description", e.target.value)}
              placeholder="Describe the quiz and its purpose"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min="0"
                value={quiz.timeLimit}
                onChange={e => onChange("timeLimit", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="maxAttempts">Max Attempts</Label>
              <Input
                id="maxAttempts"
                type="number"
                min="1"
                value={quiz.maxAttempts}
                onChange={e => onChange("maxAttempts", parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                value={quiz.passingScore}
                onChange={e => onChange("passingScore", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="quizType">Quiz Type</Label>
              <Select value={quiz.quizType} onValueChange={value => onChange("quizType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="questions">Questions (JSON format)</Label>
            <Textarea
              id="questions"
              value={typeof quiz.questions === 'string' ? quiz.questions : JSON.stringify(quiz.questions, null, 2)}
              onChange={e => {
                try {
                  onChange("questions", JSON.parse(e.target.value))
                } catch {
                  onChange("questions", e.target.value)
                }
              }}
              placeholder='[{"question": "What is...", "options": ["A", "B"], "answer": "A"}]'
              rows={8}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={loading}>
              {isEdit ? "Save Changes" : "Create Quiz"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 