import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ImportedGoal {
  title: string
  description: string
  category: string
  targetPoints: number
  priority: 'low' | 'medium' | 'high'
  deadline: string
  tasks: ImportedTask[]
}

interface ImportedTask {
  title: string
  description: string
  points: number
  priority: 'low' | 'medium' | 'high'
  estimatedTime: string
}

export async function POST(request: NextRequest) {
  try {
    const { goals, tasks } = await request.json()

    if (!goals || !tasks) {
      return NextResponse.json({ error: 'Goals and tasks data are required' }, { status: 400 })
    }

    // Try AI prioritization first, fallback to smart algorithm if it fails
    try {
      // Check if OpenAI API key is available and has access
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
        // Create a comprehensive prompt for AI prioritization
        const prompt = `
You are an expert productivity coach and project manager. I need you to analyze and prioritize the following goals and tasks for optimal productivity and success.

GOALS:
${goals
  .map(
    (goal: ImportedGoal, index: number) => `
${index + 1}. ${goal.title}
   Description: ${goal.description}
   Category: ${goal.category}
   Target Points: ${goal.targetPoints}
   Current Priority: ${goal.priority}
   Deadline: ${goal.deadline}
`
  )
  .join('\n')}

TASKS:
${tasks
  .map(
    (task: ImportedTask, index: number) => `
${index + 1}. ${task.title}
   Description: ${task.description}
   Points: ${task.points}
   Current Priority: ${task.priority}
   Estimated Time: ${task.estimatedTime}
`
  )
  .join('\n')}

Please analyze these goals and tasks and provide:

1. **Goal Prioritization**: Re-prioritize each goal based on:
   - Strategic importance and impact
   - Deadline urgency
   - Resource requirements
   - Dependencies between goals
   - Potential for high-value outcomes

2. **Task Prioritization**: Re-prioritize each task based on:
   - Contribution to goal achievement
   - Effort vs. impact ratio
   - Dependencies and prerequisites
   - Time sensitivity
   - Skill requirements

3. **Smart Recommendations**: Provide specific recommendations for:
   - Which goals to focus on first
   - Task sequencing and dependencies
   - Resource allocation suggestions
   - Potential bottlenecks or risks

Please respond with a JSON object in this exact format:
{
  "goals": [
    {
      "title": "goal title",
      "description": "goal description",
      "category": "productivity|learning|health|personal",
      "targetPoints": number,
      "priority": "low|medium|high",
      "deadline": "YYYY-MM-DD",
      "tasks": [],
      "aiRecommendations": "specific recommendations for this goal"
    }
  ],
  "tasks": [
    {
      "title": "task title",
      "description": "task description",
      "points": number,
      "priority": "low|medium|high",
      "estimatedTime": "time estimate",
      "aiRecommendations": "specific recommendations for this task"
    }
  ],
  "overallStrategy": "comprehensive strategy and recommendations for achieving these goals efficiently"
}
`

        const completion = await openai.completions.create({
          model: 'gpt-4o',
          prompt: `You are an expert productivity coach and project manager. Always respond with valid JSON format as requested.\n\n${prompt}`,
          temperature: 0.7,
          max_tokens: 4000,
        })

        const aiResponse = completion.choices[0]?.text

        if (!aiResponse) {
          throw new Error('No response from AI')
        }

        // Parse the AI response
        let prioritizedData
        try {
          // Extract JSON from the response (in case there's extra text)
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            prioritizedData = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('No valid JSON found in AI response')
          }
        } catch {
          console.error('Failed to parse AI response:', aiResponse)
          throw new Error('Failed to parse AI prioritization response')
        }

        // Validate and clean the response

        const validatedGoals =
          prioritizedData.goals?.map((goal: any) => ({
            title: goal.title || 'Untitled Goal',
            description: goal.description || '',
            category: goal.category || 'productivity',
            targetPoints: parseInt(goal.targetPoints) || 10,
            priority: ['low', 'medium', 'high'].includes(goal.priority) ? goal.priority : 'medium',
            deadline:
              goal.deadline ||
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            tasks: [],
            aiRecommendations: goal.aiRecommendations || '',
          })) || []

        const validatedTasks =
          prioritizedData.tasks?.map((task: any) => ({
            title: task.title || 'Untitled Task',
            description: task.description || '',
            points: parseInt(task.points) || 5,
            priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
            estimatedTime: task.estimatedTime || '1 hour',
            aiRecommendations: task.aiRecommendations || '',
          })) || []

        return NextResponse.json({
          goals: validatedGoals,
          tasks: validatedTasks,
          overallStrategy:
            prioritizedData.overallStrategy ||
            'Focus on high-priority goals and break them down into actionable tasks.',
          aiAnalysis: {
            totalGoals: validatedGoals.length,
            totalTasks: validatedTasks.length,

            highPriorityGoals: validatedGoals.filter((g: any) => g.priority === 'high').length,

            highPriorityTasks: validatedTasks.filter((t: any) => t.priority === 'high').length,
          },
        })
      } else {
        throw new Error('OpenAI API key not configured')
      }
    } catch (aiError) {
      console.error('AI prioritization failed, using smart fallback:', aiError)

      // Smart prioritization fallback
      const prioritizedGoals = goals.map((goal: ImportedGoal) => {
        const deadline = new Date(goal.deadline)
        const now = new Date()
        const daysUntilDeadline = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        let newPriority = goal.priority
        if (daysUntilDeadline <= 7 && goal.targetPoints >= 20) {
          newPriority = 'high'
        } else if (daysUntilDeadline <= 14 || goal.targetPoints >= 15) {
          newPriority = 'medium'
        } else {
          newPriority = 'low'
        }

        return {
          ...goal,
          priority: newPriority,
          aiRecommendations: `Smart prioritization: ${daysUntilDeadline} days until deadline, ${goal.targetPoints} points impact. Priority: ${newPriority}. Focus on breaking this into smaller tasks.`,
        }
      })

      const prioritizedTasks = tasks.map((task: ImportedTask) => {
        const estimatedHours = parseFloat(task.estimatedTime.replace(/[^\d.]/g, '')) || 1

        let newPriority = task.priority
        if (task.points >= 10 || estimatedHours <= 1) {
          newPriority = 'high'
        } else if (task.points >= 5 || estimatedHours <= 3) {
          newPriority = 'medium'
        } else {
          newPriority = 'low'
        }

        return {
          ...task,
          priority: newPriority,
          aiRecommendations: `Smart prioritization: ${estimatedHours}h task worth ${task.points} points. Priority: ${newPriority}. Consider doing high-impact, short tasks first.`,
        }
      })

      return NextResponse.json({
        goals: prioritizedGoals,
        tasks: prioritizedTasks,
        overallStrategy:
          'Smart prioritization applied based on deadlines, impact points, and estimated time. Focus on high-impact goals with approaching deadlines first. Break large tasks into smaller chunks.',
        aiAnalysis: {
          totalGoals: goals.length,
          totalTasks: tasks.length,
          highPriorityGoals: prioritizedGoals.filter(
            (g: { priority: string }) => g.priority === 'high'
          ).length,
          highPriorityTasks: prioritizedTasks.filter(
            (t: { priority: string }) => t.priority === 'high'
          ).length,
          urgentGoals: prioritizedGoals.filter((g: { deadline: string }) => {
            const deadline = new Date(g.deadline)
            const now = new Date()
            const daysUntilDeadline = Math.ceil(
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
            return daysUntilDeadline <= 7
          }).length,
        },
        note: 'Using smart prioritization algorithm. AI analysis will be available once OpenAI billing is activated.',
      })
    }
  } catch (error) {
    console.error('Error in prioritization:', error)
    return NextResponse.json({ error: 'Failed to prioritize tasks' }, { status: 500 })
  }
}
