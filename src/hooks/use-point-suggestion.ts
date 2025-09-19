import { useState, useCallback } from 'react';

interface PointSuggestion {
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
}

interface UsePointSuggestionReturn {
  suggestPoints: (title: string, description?: string, category?: string) => Promise<PointSuggestion | null>;
  isLoading: boolean;
  error: string | null;
}

export function usePointSuggestion(): UsePointSuggestionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestPoints = useCallback(async (
    title: string, 
    description?: string, 
    category?: string
  ): Promise<PointSuggestion | null> => {
    if (!title.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggest-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim(),
          category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get point suggestion');
      }

      const suggestion = await response.json();
      return suggestion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error suggesting points:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    suggestPoints,
    isLoading,
    error,
  };
}
