import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, FileText, Eye, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize } from "@/lib/utils";

export default function DocumentCapture() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simulate file upload and OCR processing
    const mockDocument = {
      id: Date.now(),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadDate: new Date().toISOString(),
      status: 'processing',
      ocrText: '',
      aiAnalysis: null
    };

    setDocuments(prev => [...prev, mockDocument]);

    // Simulate processing delay
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        doc.id === mockDocument.id 
          ? {
              ...doc,
              status: 'processed',
              ocrText: 'Sample OCR extracted text from the document...',
              aiAnalysis: {
                confidence: 95,
                category: 'ballot_form',
                keyData: ['Station: 45A', 'Date: 2024-12-15', 'Total Votes: 342']
              }
            }
          : doc
      ));
    }, 3000);

    toast({
      title: "Document Uploaded",
      description: "Processing document with AI and OCR...",
    });
  };

  const handleCameraCapture = () => {
    setIsCapturing(true);
    // In a real app, this would open camera interface
    setTimeout(() => {
      const mockCapturedDoc = {
        id: Date.now(),
        fileName: `captured_${Date.now()}.jpg`,
        fileSize: 2048000,
        fileType: 'image/jpeg',
        uploadDate: new Date().toISOString(),
        status: 'processed',
        ocrText: 'Polling Station 12B - Official Count: 456 valid ballots, 12 spoiled',
        aiAnalysis: {
          confidence: 92,
          category: 'results_sheet',
          keyData: ['Station: 12B', 'Valid: 456', 'Spoiled: 12', 'Total: 468']
        }
      };
      
      setDocuments(prev => [...prev, mockCapturedDoc]);
      setIsCapturing(false);
      
      toast({
        title: "Document Captured",
        description: "Photo captured and processed successfully",
      });
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'status-active';
      case 'processing': return 'status-warning';
      case 'failed': return 'status-alert';
      default: return 'status-neutral';
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Document Capture</h2>
          <p className="text-muted-foreground">Capture and process electoral documents with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capture Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Capture Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleCameraCapture}
                  className="btn-caffe-primary h-24 flex-col space-y-2"
                  disabled={isCapturing}
                >
                  <Camera className="h-8 w-8" />
                  <span>{isCapturing ? 'Capturing...' : 'Camera Capture'}</span>
                </Button>
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="h-24 flex-col space-y-2 border-2 border-dashed border-primary text-primary hover:bg-primary hover:text-white"
                >
                  <Upload className="h-8 w-8" />
                  <span>Upload File</span>
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Document Form */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-field">
                  <Label className="form-label">Document Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ballot_form">Ballot Form</SelectItem>
                      <SelectItem value="results_sheet">Results Sheet</SelectItem>
                      <SelectItem value="incident_report">Incident Report</SelectItem>
                      <SelectItem value="voter_list">Voter List</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-field">
                  <Label className="form-label">Station ID</Label>
                  <Input placeholder="Enter station ID" />
                </div>
              </div>

              <div className="form-field">
                <Label className="form-label">Description</Label>
                <Textarea 
                  placeholder="Add description or notes about this document..."
                  rows={3}
                />
              </div>

              <Button className="btn-caffe-primary">
                <FileText className="h-4 w-4 mr-2" />
                Submit Document
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Document List */}
        <div className="space-y-6">
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents captured yet</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{doc.fileName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)} • {doc.fileType}
                        </p>
                      </div>
                      <Badge className={`status-indicator ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </Badge>
                    </div>

                    {doc.status === 'processed' && doc.aiAnalysis && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-green-800">AI Analysis</span>
                          <span className="text-xs text-green-600">{doc.aiAnalysis.confidence}% confidence</span>
                        </div>
                        <div className="space-y-1">
                          {doc.aiAnalysis.keyData.map((item: string, index: number) => (
                            <p key={index} className="text-xs text-green-700">{item}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>{selectedDocument.fileName}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedDocument(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {selectedDocument.ocrText && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Extracted Text (OCR)</h4>
                    <div className="bg-gray-50 p-4 rounded border">
                      <p className="text-sm">{selectedDocument.ocrText}</p>
                    </div>
                  </div>
                  
                  {selectedDocument.aiAnalysis && (
                    <div>
                      <h4 className="font-semibold mb-2">AI Analysis</h4>
                      <div className="bg-blue-50 p-4 rounded border">
                        <p className="text-sm mb-2">
                          <strong>Category:</strong> {selectedDocument.aiAnalysis.category}
                        </p>
                        <p className="text-sm mb-2">
                          <strong>Confidence:</strong> {selectedDocument.aiAnalysis.confidence}%
                        </p>
                        <div>
                          <strong className="text-sm">Key Data:</strong>
                          <ul className="text-sm mt-1 space-y-1">
                            {selectedDocument.aiAnalysis.keyData.map((item: string, index: number) => (
                              <li key={index} className="ml-4">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
