import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const { goals, tasks } = await request.json();

    if (!goals || !tasks) {
      return NextResponse.json(
        { error: 'Goals and tasks data are required' },
        { status: 400 }
      );
    }

    // Simulate AI prioritization with mock data
    const prioritizedGoals = goals.map((goal: ImportedGoal, index: number) => ({
      ...goal,
      priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low', // Mock prioritization
      aiRecommendations: `Focus on this goal first as it has the highest impact potential. Consider breaking it down into smaller, actionable tasks.`
    }));

    const prioritizedTasks = tasks.map((task: ImportedTask, index: number) => ({
      ...task,
      priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low', // Mock prioritization
      aiRecommendations: `This task should be prioritized based on its contribution to goal achievement. Consider doing this early in your day when energy levels are high.`
    }));

    return NextResponse.json({
      goals: prioritizedGoals,
      tasks: prioritizedTasks,
      overallStrategy: 'Based on AI analysis, focus on high-priority goals first. Break down complex goals into smaller tasks and tackle high-impact tasks during your peak energy hours. Consider dependencies between tasks and allocate time blocks for deep work.',
      aiAnalysis: {
        totalGoals: goals.length,
        totalTasks: tasks.length,
        highPriorityGoals: prioritizedGoals.filter((g: any) => g.priority === 'high').length,
        highPriorityTasks: prioritizedTasks.filter((t: any) => t.priority === 'high').length,
      },
      note: 'This is a demo version. To enable real AI prioritization, add your OpenAI API key to the .env.local file.'
    });

  } catch (error) {
    console.error('Error in AI prioritization:', error);
    return NextResponse.json(
      { error: 'Failed to prioritize tasks' },
      { status: 500 }
    );
  }
}
