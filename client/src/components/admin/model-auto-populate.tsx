import { Button } from "@/components/ui/button";
import { Wand2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ModelAutoPopulateProps {
  onModelsPopulated: () => void;
}

// Optimal models for electoral observation platforms (January 2025)
const OPTIMAL_MODELS = {
  openai: {
    model: "gpt-4o",
    description: "Latest GPT-4 Omni - optimal for complex electoral analysis and multi-modal processing"
  },
  huggingface: {
    model: "meta-llama/Llama-3.1-8B-Instruct",
    description: "Meta's latest instruction-tuned model - excellent for electoral document processing"
  },
  gemini: {
    model: "gemini-1.5-pro",
    description: "Google's most capable model - superior for real-time electoral monitoring analysis"
  }
};

export default function ModelAutoPopulate({ onModelsPopulated }: ModelAutoPopulateProps) {
  const [isPopulating, setIsPopulating] = useState(false);
  const { toast } = useToast();

  const populateOptimalModels = async () => {
    setIsPopulating(true);
    
    try {
      // Update each model with optimal configuration
      const updates = [
        { key: 'openai_model', value: OPTIMAL_MODELS.openai.model },
        { key: 'huggingface_model', value: OPTIMAL_MODELS.huggingface.model },
        { key: 'gemini_model', value: OPTIMAL_MODELS.gemini.model }
      ];

      for (const update of updates) {
        await apiRequest('/api/settings', {
          method: 'POST',
          body: update
        });
      }

      toast({
        title: "Models Updated",
        description: "All AI models have been configured with the latest optimal versions for electoral observation platforms.",
      });

      onModelsPopulated();
    } catch (error) {
      console.error('Error populating models:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update AI models. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Auto-Populate Latest Models
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
            Configure all AI services with the latest models optimized for electoral observation platforms.
          </p>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400">OpenAI:</span>
              <span className="font-mono text-blue-800 dark:text-blue-200">{OPTIMAL_MODELS.openai.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400">Hugging Face:</span>
              <span className="font-mono text-blue-800 dark:text-blue-200">{OPTIMAL_MODELS.huggingface.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400">Gemini AI:</span>
              <span className="font-mono text-blue-800 dark:text-blue-200">{OPTIMAL_MODELS.gemini.model}</span>
            </div>
          </div>
        </div>
        
        <Button
          onClick={populateOptimalModels}
          disabled={isPopulating}
          size="sm"
          className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPopulating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {isPopulating ? 'Updating...' : 'Auto-Configure'}
        </Button>
      </div>
    </div>
  );
}