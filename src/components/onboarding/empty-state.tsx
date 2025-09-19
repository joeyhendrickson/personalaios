'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  Lightbulb,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface EmptyStateProps {
  type: 'goals' | 'tasks' | 'dashboard' | 'welcome';
  onCreateFirst?: () => void;
  onGetStarted?: () => void;
}

export function EmptyState({ type, onCreateFirst, onGetStarted }: EmptyStateProps) {

  const welcomeSteps = [
    {
      icon: Target,
      title: 'Set Your Goals',
      description: 'Define what you want to achieve this week with clear, measurable goals.',
      color: 'bg-blue-500',
    },
    {
      icon: CheckCircle,
      title: 'Break Down Tasks',
      description: 'Create actionable tasks that move you closer to your goals.',
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Earn points and money as you complete tasks and achieve your goals.',
      color: 'bg-purple-500',
    },
    {
      icon: Lightbulb,
      title: 'Get AI Help',
      description: 'Use our AI assistant to get suggestions and stay motivated.',
      color: 'bg-yellow-500',
    },
  ];

  const renderWelcomeOnboarding = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Personal AI OS
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your intelligent productivity companion that helps you achieve your goals through 
          smart task management and AI-powered insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {welcomeSteps.map((step, index) => (
          <Card key={index} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${step.color}`} />
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${step.color} text-white`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {step.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button 
          size="lg" 
          onClick={onGetStarted}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderGoalsEmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Target className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No goals yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Set your first weekly goal to start tracking your progress and earning points.
      </p>
      <Button onClick={onCreateFirst} className="bg-blue-500 hover:bg-blue-600">
        <Target className="mr-2 h-4 w-4" />
        Create Your First Goal
      </Button>
    </div>
  );

  const renderTasksEmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No tasks yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Break down your goals into actionable tasks to start making progress.
      </p>
      <Button onClick={onCreateFirst} className="bg-green-500 hover:bg-green-600">
        <CheckCircle className="mr-2 h-4 w-4" />
        Add Your First Task
      </Button>
    </div>
  );

  const renderDashboardEmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
        <TrendingUp className="h-8 w-8 text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Your dashboard is empty
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Create some goals and tasks to see your progress and analytics here.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onCreateFirst} className="bg-purple-500 hover:bg-purple-600">
          <Target className="mr-2 h-4 w-4" />
          Create Goals
        </Button>
        <Button variant="outline" onClick={onGetStarted}>
          <Calendar className="mr-2 h-4 w-4" />
          View Calendar
        </Button>
      </div>
    </div>
  );

  switch (type) {
    case 'welcome':
      return renderWelcomeOnboarding();
    case 'goals':
      return renderGoalsEmptyState();
    case 'tasks':
      return renderTasksEmptyState();
    case 'dashboard':
      return renderDashboardEmptyState();
    default:
      return null;
  }
}

// Quick start tips component
export function QuickStartTips() {
  const tips = [
    {
      icon: Target,
      title: 'Start Small',
      description: 'Begin with 1-2 goals per week to build momentum.',
      color: 'text-blue-600',
    },
    {
      icon: CheckCircle,
      title: 'Be Specific',
      description: 'Make your goals measurable and time-bound.',
      color: 'text-green-600',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Check your dashboard daily to stay motivated.',
      color: 'text-purple-600',
    },
    {
      icon: Lightbulb,
      title: 'Use AI Help',
      description: 'Ask the AI assistant for suggestions and motivation.',
      color: 'text-yellow-600',
    },
  ];

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
          Quick Start Tips
        </CardTitle>
        <CardDescription>
          Get the most out of your Personal AI OS with these helpful tips.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg bg-gray-100 ${tip.color}`}>
                <tip.icon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{tip.title}</h4>
                <p className="text-sm text-gray-600">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
