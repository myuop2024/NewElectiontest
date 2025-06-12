import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ContestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contest: any;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  loading?: boolean;
}

export const ContestDialog: React.FC<ContestDialogProps> = ({
  open,
  onOpenChange,
  contest,
  onChange,
  onSubmit,
  isEdit = false,
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contest" : "Create Contest"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Edit this contest." : "Add a new contest to this training program."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Contest Title</Label>
            <Input
              id="title"
              value={contest.title}
              onChange={e => onChange("title", e.target.value)}
              placeholder="e.g., Top Observer Challenge"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={contest.description}
              onChange={e => onChange("description", e.target.value)}
              placeholder="Describe the contest rules and objectives"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="contestType">Contest Type</Label>
                <Select value={contest.contestType} onValueChange={value => onChange("contestType", value)}>
                    <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="quiz_competition">Quiz Competition</SelectItem>
                    <SelectItem value="scenario_challenge">Scenario Challenge</SelectItem>
                    <SelectItem value="reporting_speed">Reporting Speed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                    id="maxParticipants"
                    type="number"
                    min="0"
                    value={contest.maxParticipants}
                    onChange={e => onChange("maxParticipants", parseInt(e.target.value))}
                />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={contest.startDate?.split('T')[0] || ''}
                onChange={e => onChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={contest.endDate?.split('T')[0] || ''}
                onChange={e => onChange("endDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="rules">Rules (JSON format)</Label>
            <Textarea
              id="rules"
              value={typeof contest.rules === 'string' ? contest.rules : JSON.stringify(contest.rules, null, 2)}
              onChange={e => onChange("rules", e.target.value)}
              placeholder='{"rule": "..."}'
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="prizes">Prizes (JSON format)</Label>
            <Textarea
              id="prizes"
              value={typeof contest.prizes === 'string' ? contest.prizes : JSON.stringify(contest.prizes, null, 2)}
              onChange={e => onChange("prizes", e.target.value)}
              placeholder='{"first_place": "..."}'
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={loading}>
              {isEdit ? "Save Changes" : "Create Contest"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 