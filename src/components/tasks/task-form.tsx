'use client'

import { useState } from 'react'
import { useGuardedAsync } from '@/hooks/use-guarded-async'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PointSuggestion } from './point-suggestion'
import { IntegerFormInput } from '@/components/form/integer-form-input'
import { parseFloatFromForm, parseIntFromForm } from '@/lib/form/numeric-input'

interface TaskFormProps {
  goalId: string
  goalTitle: string
  onSuccess?: () => void
}

export function TaskForm({ goalId, goalTitle, onSuccess }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points_value: '0',
    money_value: '0',
  })
  const createTaskGuard = useGuardedAsync()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void createTaskGuard.run(async () => {
      setError('')

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            points_value: parseIntFromForm(formData.points_value, 0, { min: 0 }),
            money_value: parseFloatFromForm(formData.money_value, 0, { min: 0 }),
            weekly_goal_id: goalId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create task')
        }

        setFormData({
          title: '',
          description: '',
          points_value: '0',
          money_value: '0',
        })

        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
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
              disabled={createTaskGuard.isRunning}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this task..."
              disabled={createTaskGuard.isRunning}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="points_value">Points Value</Label>
              <IntegerFormInput
                id="points_value"
                value={formData.points_value}
                onValueChange={(points_value) => setFormData({ ...formData, points_value })}
                disabled={createTaskGuard.isRunning}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Point Suggestion Component */}
            <PointSuggestion
              title={formData.title}
              description={formData.description}
              onSuggestionAccepted={(points) =>
                setFormData({ ...formData, points_value: String(points) })
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
                onChange={(e) => setFormData({ ...formData, money_value: e.target.value })}
                disabled={createTaskGuard.isRunning}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <Button
            type="submit"
            className="w-full touch-manipulation"
            disabled={createTaskGuard.isRunning}
          >
            {createTaskGuard.isRunning ? 'Creating Task...' : 'Create Task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
