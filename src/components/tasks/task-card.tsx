'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Circle, Trash2, DollarSign, Star } from 'lucide-react'
import { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onComplete?: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const isCompleted = task.status === 'completed'
  const isPending = task.status === 'pending'

  return (
    <Card className={`w-full ${isCompleted ? 'border-green-200 bg-green-50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              {task.title}
            </CardTitle>
            {task.description && <CardDescription>{task.description}</CardDescription>}
          </div>
          <Badge className={statusColors[task.status]}>{task.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Values */}
        <div className="flex items-center gap-4 text-sm">
          {task.points_value > 0 && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Star className="w-4 h-4" />
              <span>{task.points_value} points</span>
            </div>
          )}
          {task.money_value > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <DollarSign className="w-4 h-4" />
              <span>${task.money_value.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Completion Info */}
        {isCompleted && task.completed_at && (
          <div className="text-sm text-gray-600">
            Completed on {new Date(task.completed_at).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2">
            <Button
              onClick={() => onComplete?.(task.id)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(task.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(task.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
