'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Goal {
  id: string
  title: string
  description?: string
  category: string
  target_points: number
  target_money: number
  current_points: number
  current_money: number
  is_completed: boolean
  created_at: string
  tasks?: Task[]
}

interface Task {
  id: string
  title: string
  status: 'pending' | 'completed' | 'cancelled'
  points_value: number
  money_value: number
}

interface GoalCardProps {
  goal: Goal
  onDelete?: (goalId: string) => void
  onAddTask?: (goalId: string) => void
}

const categoryColors = {
  health: 'bg-green-100 text-green-800',
  productivity: 'bg-blue-100 text-blue-800',
  learning: 'bg-purple-100 text-purple-800',
  financial: 'bg-yellow-100 text-yellow-800',
  personal: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
}

export function GoalCard({ goal, onDelete, onAddTask }: GoalCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)

  const pointsProgress =
    goal.target_points > 0 ? (goal.current_points / goal.target_points) * 100 : 0
  const moneyProgress = goal.target_money > 0 ? (goal.current_money / goal.target_money) * 100 : 0

  const completedTasks = goal.tasks?.filter((task) => task.status === 'completed').length || 0
  const totalTasks = goal.tasks?.length || 0

  // Truncate description to first 2 lines (approximately 120 characters)
  const truncateDescription = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const shouldTruncate = goal.description && goal.description.length > 120
  const displayDescription =
    shouldTruncate && !showFullDescription
      ? truncateDescription(goal.description || '')
      : goal.description

  return (
    <Card className={`w-full ${goal.is_completed ? 'border-green-200 bg-green-50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{goal.title}</CardTitle>
            {goal.description && (
              <div className="space-y-2">
                <CardDescription className="text-sm leading-relaxed">
                  {displayDescription}
                </CardDescription>
                {shouldTruncate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showFullDescription ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        View Details
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge className={categoryColors[goal.category as keyof typeof categoryColors]}>
              {goal.category}
            </Badge>
            {goal.is_completed && <Badge className="bg-green-100 text-green-800">Completed</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Points Progress</span>
              <span>
                {goal.current_points} / {goal.target_points}
              </span>
            </div>
            <Progress value={pointsProgress} className="h-2" />
          </div>

          {goal.target_money > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Money Progress</span>
                <span>
                  ${goal.current_money.toFixed(2)} / ${goal.target_money.toFixed(2)}
                </span>
              </div>
              <Progress value={moneyProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Task Summary */}
        <div className="text-sm text-gray-600">
          Tasks: {completedTasks}/{totalTasks} completed
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddTask?.(goal.id)}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(goal.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
