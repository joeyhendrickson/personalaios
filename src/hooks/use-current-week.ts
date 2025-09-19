import { useState, useEffect } from 'react';

export function useCurrentWeek() {
  const [currentWeekId, setCurrentWeekId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const response = await fetch('/api/weeks');
        if (response.ok) {
          const weeks = await response.json();
          if (weeks && weeks.length > 0) {
            // Get the most recent week or create a new one
            const currentWeek = weeks.find((week: { start_date: string; end_date: string; id: string }) => 
              new Date(week.start_date) <= new Date() && 
              new Date(week.end_date) >= new Date()
            );
            
            if (currentWeek) {
              setCurrentWeekId(currentWeek.id);
            } else {
              // Create a new week if none exists for current date
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);

              const createResponse = await fetch('/api/weeks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  start_date: startOfWeek.toISOString().split('T')[0],
                  end_date: endOfWeek.toISOString().split('T')[0],
                }),
              });

              if (createResponse.ok) {
                const newWeek = await createResponse.json();
                setCurrentWeekId(newWeek.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current week:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentWeek();
  }, []);

  return { currentWeekId, isLoading };
}
