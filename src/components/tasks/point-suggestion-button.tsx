'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2 } from 'lucide-react';
import { usePointSuggestion } from '@/hooks/use-point-suggestion';

interface PointSuggestionButtonProps {
  title: string;
  description?: string;
  category?: string;
  onSuggestionReceived: (suggestion: {
    points: number;
    reasoning: string;
    confidence: 'low' | 'medium' | 'high';
    similarTasksCount: number;
  }) => void;
  disabled?: boolean;
}

export function PointSuggestionButton({
  title,
  description,
  category,
  onSuggestionReceived,
  disabled = false
}: PointSuggestionButtonProps) {
  const { suggestPoints, isLoading } = usePointSuggestion();
  const [hasSuggested, setHasSuggested] = useState(false);

  const handleSuggest = async () => {
    if (!title.trim() || isLoading) return;

    const suggestion = await suggestPoints(title, description, category);
    if (suggestion) {
      onSuggestionReceived({
        points: suggestion.suggested_points,
        reasoning: suggestion.reasoning,
        confidence: suggestion.confidence,
        similarTasksCount: suggestion.similar_tasks_count,
      });
      setHasSuggested(true);
    }
  };

  if (hasSuggested) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setHasSuggested(false)}
        className="text-green-600 border-green-200 hover:bg-green-50"
      >
        <Lightbulb className="w-3 h-3 mr-1" />
        Suggest Again
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSuggest}
      disabled={disabled || isLoading || !title.trim()}
      className="text-blue-600 border-blue-200 hover:bg-blue-50"
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Lightbulb className="w-3 h-3 mr-1" />
      )}
      {isLoading ? 'Analyzing...' : 'Suggest Points'}
    </Button>
  );
}
