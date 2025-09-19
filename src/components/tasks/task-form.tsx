'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PointSuggestion } from './point-suggestion'

interface TaskFormProps {
  goalId: string
  goalTitle: string
  onSuccess?: () => void
}

export function TaskForm({ goalId, goalTitle, onSuccess }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points_value: 0,
    money_value: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          weekly_goal_id: goalId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        points_value: 0,
        money_value: 0,
      })

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add Task</CardTitle>
        <CardDescription>Add a task to &quot;{goalTitle}&quot;</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Go for a 30-minute run"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this task..."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="points_value">Points Value</Label>
              <Input
                id="points_value"
                type="number"
                min="0"
                value={formData.points_value}
                onChange={(e) =>
                  setFormData({ ...formData, points_value: parseInt(e.target.value) || 0 })
                }
                disabled={isLoading}
              />
            </div>
            
            {/* Point Suggestion Component */}
            <PointSuggestion
              title={formData.title}
              description={formData.description}
              onSuggestionAccepted={(points) => 
                setFormData({ ...formData, points_value: points })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="money_value">Money Value ($)</Label>
              <Input
                id="money_value"
                type="number"
                min="0"
                step="0.01"
                value={formData.money_value}
                onChange={(e) =>
                  setFormData({ ...formData, money_value: parseFloat(e.target.value) || 0 })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Task...' : 'Create Task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
