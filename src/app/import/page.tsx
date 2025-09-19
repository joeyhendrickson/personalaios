'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExcelImport } from '@/components/import/excel-import';
import { ArrowLeft, CheckCircle, Brain, Target, Clock, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ImportedGoal {
  title: string;
  description: string;
  category: string;
  targetPoints: number;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  tasks: ImportedTask[];
  aiRecommendations?: string;
}

interface ImportedTask {
  title: string;
  description: string;
  points: number;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string;
  aiRecommendations?: string;
}

export default function ImportPage() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (!user) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleImportComplete = async (goals: ImportedGoal[], tasks: ImportedTask[]) => {
    setIsImporting(true);
    setImportStatus('Importing goals and tasks...');

    try {
      const requestData = {
        goals: goals.map(goal => ({
          title: goal.title,
          description: goal.description,
          category: goal.category,
          target_points: goal.targetPoints,
          target_money: 0,
          priority: goal.priority,
          deadline: goal.deadline
        })),
        tasks: tasks.map(task => ({
          title: task.title,
          description: task.description,
          points_value: task.points,
          money_value: 0,
          priority: task.priority,
          estimated_time: task.estimatedTime
        }))
      };

      console.log('Sending import data:', requestData);

      // Use the new import endpoint that handles authentication and database operations
      const response = await fetch('/api/import/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Import error:', errorData);
        
        // Show more detailed error information
        let errorMessage = errorData.error || 'Failed to import goals and tasks';
        if (errorData.details) {
          errorMessage += `: ${JSON.stringify(errorData.details)}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setImportStatus(result.message || 'Import completed successfully!');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to import your goals and tasks.</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Import Goals & Tasks
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upload your Excel spreadsheet and let AI help prioritize your goals and tasks for maximum productivity
            </p>
          </div>
        </div>

        {/* Import Status */}
        {importStatus && (
          <Alert className={`mb-6 ${importStatus.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{importStatus}</AlertDescription>
          </Alert>
        )}

        {/* Main Import Component */}
        <div className="max-w-4xl mx-auto">
          <ExcelImport onImportComplete={handleImportComplete} />
        </div>

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Smart Goal Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                AI analyzes your goals based on strategic importance, deadlines, and potential impact to optimize your focus.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">AI Prioritization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Advanced AI algorithms prioritize your tasks based on effort vs. impact, dependencies, and time sensitivity.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Time Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Get intelligent recommendations for task sequencing and time allocation to maximize your productivity.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Sample Excel Template */}
        <div className="mt-12 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Need a Template?</CardTitle>
              <CardDescription>
                Download our sample CSV templates to get started with the correct format. You can use these as a starting point for your goals and tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={async () => {
                  try {
                    // Download the goals template
                    const response = await fetch('/sample-template.csv');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'goals-and-tasks-template.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Failed to download goals template:', error);
                    alert('Failed to download goals template. Please try again.');
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Download Goals & Tasks Template
              </Button>
              
              <Button
                onClick={async () => {
                  try {
                    // Download the tasks template
                    const response = await fetch('/tasks-template.csv');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'tasks-template.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Failed to download tasks template:', error);
                    alert('Failed to download tasks template. Please try again.');
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Download Tasks Template
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
