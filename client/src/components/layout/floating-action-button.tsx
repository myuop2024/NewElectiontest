import { useState } from "react";
import { Plus, Camera, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case 'camera':
        setLocation('/document-capture');
        break;
      case 'report':
        setLocation('/reports');
        break;
      case 'alert':
        // Handle emergency alert
        console.log('Emergency alert triggered');
        break;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* FAB Menu */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 space-y-3 fade-in">
            <Button
              size="sm"
              className="w-12 h-12 caffe-bg-secondary text-white rounded-full shadow-lg hover:bg-secondary/90"
              onClick={() => handleAction('camera')}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              className="w-12 h-12 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600"
              onClick={() => handleAction('report')}
            >
              <FileText className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              className="w-12 h-12 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:bg-destructive/90"
              onClick={() => handleAction('alert')}
            >
              <AlertTriangle className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {/* Main FAB */}
        <Button
          size="lg"
          className="w-14 h-14 caffe-bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200"
          onClick={toggleMenu}
        >
          <Plus className={`h-6 w-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
