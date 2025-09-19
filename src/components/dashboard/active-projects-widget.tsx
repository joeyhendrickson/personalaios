'use client';

import React, { useState, useEffect } from 'react';
import { Target, Clock, TrendingUp, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';

interface ProjectRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'quick_win' | 'high_impact' | 'strategic';
  estimated_time: string;
}

interface ProjectData {
  overallCompletionRate: number;
  totalProjects: number;
  totalTasks: number;
  recommendations: ProjectRecommendation[];
}

interface ActiveProjectsWidgetProps {
  goals: any[];
}

export default function ActiveProjectsWidget({ goals }: ActiveProjectsWidgetProps) {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);

  useEffect(() => {
    fetchProjectRecommendations();
  }, [goals]);

  const fetchProjectRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects/recommendations');
      if (response.ok) {
        const data = await response.json();
        setProjectData(data);
      } else {
        console.error('Failed to fetch project recommendations');
      }
    } catch (error) {
      console.error('Error fetching project recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'quick_win': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'high_impact': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'strategic': return <Target className="h-4 w-4 text-purple-500" />;
      default: return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'quick_win': return 'Quick Win';
      case 'high_impact': return 'High Impact';
      case 'strategic': return 'Strategic';
      default: return 'General';
    }
  };

  // Calculate radial progress
  const completionRate = projectData?.overallCompletionRate || 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Projects</p>
            <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
          </div>
          
          {/* Enhanced Radial with Progress */}
          <div className="relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#E5E7EB"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#10B981"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-in-out"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-bold text-gray-800">
                  {completionRate}%
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Task Recommendations - Always Visible */}
        {showRecommendations && (
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading recommendations...</p>
              </div>
            ) : projectData?.recommendations ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-800">Priority Project Tasks</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Target className="h-3 w-3" />
                    <span>Based on highest priority projects</span>
                  </div>
                </div>
                {projectData.recommendations.map((rec, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getImpactIcon(rec.impact)}
                        <span className="text-sm font-medium text-gray-800">{rec.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {rec.estimated_time}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {getImpactLabel(rec.impact)}
                      </span>
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Add to Tasks →
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recommendations available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
