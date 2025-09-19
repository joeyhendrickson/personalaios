'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Brain, Target } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportedGoal {
  title: string;
  description: string;
  category: string;
  targetPoints: number;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  tasks: ImportedTask[];
}

interface ImportedTask {
  title: string;
  description: string;
  points: number;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string;
}

interface ExcelImportProps {
  onImportComplete: (goals: ImportedGoal[], tasks: ImportedTask[]) => void;
}

export function ExcelImport({ onImportComplete }: ExcelImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importedData, setImportedData] = useState<{ goals: ImportedGoal[]; tasks: ImportedTask[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const data = await readExcelFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setImportedData(data);
        setIsUploading(false);
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process Excel file');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const readExcelFile = (file: File): Promise<{ goals: ImportedGoal[]; tasks: ImportedTask[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Look for sheets named 'Goals' and 'Tasks' or use the first sheet
          const goalsSheet = workbook.Sheets['Goals'] || workbook.Sheets[workbook.SheetNames[0]];
          const tasksSheet = workbook.Sheets['Tasks'] || workbook.Sheets[workbook.SheetNames[1]];
          
          const goals: ImportedGoal[] = [];
          const tasks: ImportedTask[] = [];
          
          // Parse Goals sheet
          if (goalsSheet) {
            const goalsData = XLSX.utils.sheet_to_json(goalsSheet, { header: 1 });
            const goalRows = goalsData.slice(1) as unknown[][];
            
            goalRows.forEach((row, index) => {
              if (row.length > 0 && row[0]) { // Check if row has data
                const category = String(row[2]) || '';
                const validCategories = [
                  'quick_money',
                  'save_money', 
                  'health',
                  'network_expansion',
                  'business_growth',
                  'fires',
                  'good_living',
                  'big_vision',
                  'job',
                  'organization',
                  'tech_issues',
                  'business_launch',
                  'future_planning',
                  'innovation',
                  'productivity',
                  'learning',
                  'financial',
                  'personal',
                  'other'
                ];
                let finalCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : 'other';
                
                // If no category provided or invalid, we'll predict it later during import
                if (!category || !validCategories.includes(category.toLowerCase())) {
                  finalCategory = 'other'; // Will be predicted during import
                }

                const priority = (String(row[4]) || 'medium').toLowerCase();
                const validPriorities = ['low', 'medium', 'high'];
                const finalPriority = validPriorities.includes(priority) ? priority : 'medium';

                const goal: ImportedGoal = {
                  title: String(row[0]) || `Goal ${index + 1}`,
                  description: String(row[1]) || '',
                  category: finalCategory,
                  targetPoints: parseInt(String(row[3])) || 10,
                  priority: finalPriority as 'low' | 'medium' | 'high',
                  deadline: String(row[5]) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  tasks: []
                };
                goals.push(goal);
              }
            });
          }
          
          // Parse Tasks sheet
          if (tasksSheet) {
            const tasksData = XLSX.utils.sheet_to_json(tasksSheet, { header: 1 });
            const taskRows = tasksData.slice(1) as unknown[][];
            
            taskRows.forEach((row, index) => {
              if (row.length > 0 && row[0]) { // Check if row has data
                const taskPriority = (String(row[3]) || 'medium').toLowerCase();
                const validTaskPriorities = ['low', 'medium', 'high'];
                const finalTaskPriority = validTaskPriorities.includes(taskPriority) ? taskPriority : 'medium';

                const task: ImportedTask = {
                  title: String(row[0]) || `Task ${index + 1}`,
                  description: String(row[1]) || '',
                  points: parseInt(String(row[2])) || 5,
                  priority: finalTaskPriority as 'low' | 'medium' | 'high',
                  estimatedTime: String(row[4]) || '1 hour'
                };
                tasks.push(task);
              }
            });
          }
          
          console.log('Parsed Excel data:', { goals, tasks });
          resolve({ goals, tasks });
        } catch {
          reject(new Error('Failed to parse Excel file. Please ensure it has the correct format.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const handleAIPrioritization = async () => {
    if (!importedData) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/import/prioritize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goals: importedData.goals,
          tasks: importedData.tasks
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to prioritize tasks with AI');
      }
      
      const prioritizedData = await response.json();
      setImportedData(prioritizedData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prioritize tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (importedData) {
      onImportComplete(importedData.goals, importedData.tasks);
      setImportedData(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Import
          </CardTitle>
          <CardDescription>
            Upload an Excel file with your goals and tasks. The AI will help prioritize them for optimal productivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">Upload Excel File</p>
            <p className="text-sm text-gray-600 mb-4">
              Supported formats: .xlsx, .xls, .csv
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mb-4"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </Button>
            
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Import Preview */}
          {importedData && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully imported {importedData.goals.length} goals and {importedData.tasks.length} tasks
                </AlertDescription>
              </Alert>

              {/* Data Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Goals ({importedData.goals.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importedData.goals.slice(0, 5).map((goal, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-gray-600">{goal.category} • {goal.targetPoints} points</p>
                        </div>
                      ))}
                      {importedData.goals.length > 5 && (
                        <p className="text-sm text-gray-500">... and {importedData.goals.length - 5} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Tasks ({importedData.tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importedData.tasks.slice(0, 5).map((task, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-gray-600">{task.points} points • {task.estimatedTime}</p>
                        </div>
                      ))}
                      {importedData.tasks.length > 5 && (
                        <p className="text-sm text-gray-500">... and {importedData.tasks.length - 5} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAIPrioritization}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {isProcessing ? 'AI Processing...' : 'AI Prioritize'}
                </Button>
                <Button
                  onClick={handleImport}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Import to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel Template Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Excel File Format</CardTitle>
          <CardDescription>
            Your Excel file should have the following structure:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Goals Sheet (optional sheet name: &quot;Goals&quot;)</h4>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
              <div>Title | Description | Category | Target Points | Priority | Deadline</div>
              <div className="text-gray-600 mt-1">
                Complete Project Alpha | Finish main features | productivity | 30 | high | 2024-12-31
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Tasks Sheet (optional sheet name: &quot;Tasks&quot;)</h4>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
              <div>Title | Description | Points | Priority | Estimated Time</div>
              <div className="text-gray-600 mt-1">
                Design UI mockups | Create wireframes | 8 | high | 2 hours
              </div>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> If you don&apos;t have separate sheets, put all data in one sheet. 
              The first row should contain headers, and the AI will automatically detect the structure.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
