'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  CheckCircle, 
  TrendingUp, 
  Brain,
  Database,
  Key,
  ArrowRight,
  Settings,
  Sparkles,
  LogIn,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  const features = [
    {
      icon: Target,
      title: 'Smart Goal Setting',
      description: 'Set weekly goals with AI-powered suggestions and alignment checks',
      color: 'bg-blue-500',
    },
    {
      icon: CheckCircle,
      title: 'Task Management',
      description: 'Break down goals into actionable tasks with intelligent point suggestions',
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Visual progress rings, charts, and analytics to track your success',
      color: 'bg-purple-500',
    },
    {
      icon: Brain,
      title: 'AI Assistant',
      description: 'Chat with your personal AI productivity advisor for guidance and motivation',
      color: 'bg-yellow-500',
    },
  ];

  const services = [
    {
      name: 'Supabase Database',
      icon: Database,
      status: 'not-configured', // Always show as not configured in development
    },
    {
      name: 'OpenAI API',
      icon: Brain,
      status: 'not-configured', // Always show as not configured in development
    },
    {
      name: 'Authentication',
      icon: Key,
      status: 'not-configured', // Always show as not configured in development
    },
  ];

  const isFullyConfigured = services.every(service => service.status === 'configured');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Personal AI OS
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Your intelligent productivity companion that helps you achieve your goals through 
            smart task management, AI-powered insights, and progress tracking.
          </p>
          {!user && !loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto mb-6">
              <p className="text-sm text-blue-800">
                <strong>Multi-User Platform:</strong> Create your account to access your personal productivity dashboard with AI-powered insights and goal tracking.
              </p>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <Badge 
              variant={isFullyConfigured ? "default" : "secondary"}
              className={`px-4 py-2 text-sm ${
                isFullyConfigured 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
              }`}
            >
              {isFullyConfigured ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  All Services Configured
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Setup Required
                </>
              )}
            </Badge>
          </div>

          {/* Action Buttons */}
          {!user && !loading && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Account
                </Button>
              </Link>
            </div>
          )}
          
          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Service Status */}
        <div className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Service Status
              </CardTitle>
              <CardDescription>
                Current configuration status of required services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <service.icon className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{service.name}</p>
                    </div>
                    <Badge 
                      variant={service.status === 'configured' ? 'default' : 'secondary'}
                      className={`text-xs ${
                        service.status === 'configured'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {service.status === 'configured' ? 'Ready' : 'Setup Required'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`absolute top-0 left-0 w-full h-1 ${feature.color}`} />
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${feature.color} text-white`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Boost Your Productivity?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Join early adopters who are already achieving their goals with AI-powered productivity tracking.
              </p>
              {!user && !loading ? (
                <>
                  <Link href="/login">
                    <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 mr-4">
                      <LogIn className="mr-2 h-5 w-5" />
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      <UserPlus className="mr-2 h-5 w-5" />
                      Create Account
                    </Button>
                  </Link>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}