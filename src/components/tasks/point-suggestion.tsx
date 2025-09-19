'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Users, Target, Loader2 } from 'lucide-react';
import { usePointSuggestion } from '@/hooks/use-point-suggestion';

interface PointSuggestionProps {
  title: string;
  description?: string;
  category?: string;
  onSuggestionAccepted?: (points: number) => void;
}

export function PointSuggestion({ 
  title, 
  description, 
  category, 
  onSuggestionAccepted
}: PointSuggestionProps) {
  const { suggestPoints, isLoading, error } = usePointSuggestion();
  const [suggestion, setSuggestion] = useState<{
    suggested_points: number;
    reasoning: string;
    confidence: 'low' | 'medium' | 'high';
    similar_tasks_count: number;
    similar_tasks: Array<{
      title: string;
      points: number;
      similarity: number;
    }>;
    category_defaults: Record<string, number> | null;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (title.trim()) {
      const timeoutId = setTimeout(() => {
        suggestPoints(title, description, category).then(setSuggestion);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [title, description, category, suggestPoints]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing similar tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        <span>Unable to suggest points: {error}</span>
      </div>
    );
  }

  if (!suggestion || !title.trim()) {
    return null;
  }

  const confidenceColors = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const confidenceIcons = {
    high: TrendingUp,
    medium: Target,
    low: Users,
  };

  const ConfidenceIcon = confidenceIcons[suggestion.confidence];

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">Point Suggestion</CardTitle>
          </div>
          <Badge className={confidenceColors[suggestion.confidence]}>
            <ConfidenceIcon className="w-3 h-3 mr-1" />
            {suggestion.confidence} confidence
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {suggestion.reasoning}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-blue-600">
              {suggestion.suggested_points}
            </span>
            <span className="text-sm text-gray-600">points</span>
          </div>
          
          {onSuggestionAccepted && (
            <Button
              size="sm"
              onClick={() => onSuggestionAccepted(suggestion.suggested_points)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Use Suggestion
            </Button>
          )}
        </div>

        {suggestion.similar_tasks_count > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>
                {showDetails ? 'Hide' : 'Show'} similar tasks ({suggestion.similar_tasks_count})
              </span>
              <span className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showDetails && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {suggestion.similar_tasks.map((task, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <span className="truncate flex-1 mr-2">{task.title}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{task.points} pts</span>
                      <Badge variant="outline" className="text-xs">
                        {task.similarity}% match
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {suggestion.category_defaults && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">Category defaults:</div>
            <div className="flex space-x-2 text-xs">
              <span>Low: {suggestion.category_defaults.low}</span>
              <span>Medium: {suggestion.category_defaults.medium}</span>
              <span>High: {suggestion.category_defaults.high}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
