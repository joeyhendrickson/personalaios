'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface GoalFormProps {
  weekId: string
  onSuccess?: () => void
}

const goalCategories = [
  { value: 'quick_money', label: 'Quick Money' },
  { value: 'save_money', label: 'Save Money' },
  { value: 'health', label: 'Health' },
  { value: 'network_expansion', label: 'Network Expansion' },
  { value: 'business_growth', label: 'Business Growth' },
  { value: 'fires', label: 'Fires' },
  { value: 'good_living', label: 'Good Living' },
  { value: 'big_vision', label: 'Big Vision' },
  { value: 'job', label: 'Job' },
  { value: 'organization', label: 'Organization' },
  { value: 'tech_issues', label: 'Tech Issues' },
  { value: 'business_launch', label: 'Business Launch' },
  { value: 'future_planning', label: 'Future Planning' },
  { value: 'innovation', label: 'Innovation' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'learning', label: 'Learning' },
  { value: 'financial', label: 'Financial' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

export function GoalForm({ weekId, onSuccess }: GoalFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as
      | 'quick_money'
      | 'save_money'
      | 'health'
      | 'network_expansion'
      | 'business_growth'
      | 'fires'
      | 'good_living'
      | 'big_vision'
      | 'job'
      | 'organization'
      | 'tech_issues'
      | 'business_launch'
      | 'future_planning'
      | 'innovation'
      | 'productivity'
      | 'learning'
      | 'financial'
      | 'personal'
      | 'other',
    target_points: 0,
    target_money: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          week_id: weekId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create goal')
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'other',
        target_points: 0,
        target_money: 0,
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
        <CardTitle>Add Weekly Goal</CardTitle>
        <CardDescription>
          Set a goal for this week with target points and money values
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Complete 5 workouts"
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
              placeholder="Describe your goal..."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  category: value as
                    | 'quick_money'
                    | 'save_money'
                    | 'health'
                    | 'network_expansion'
                    | 'business_growth'
                    | 'fires'
                    | 'good_living'
                    | 'big_vision'
                    | 'job'
                    | 'organization'
                    | 'tech_issues'
                    | 'business_launch'
                    | 'future_planning'
                    | 'innovation'
                    | 'productivity'
                    | 'learning'
                    | 'financial'
                    | 'personal'
                    | 'other',
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {goalCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_points">Target Points</Label>
              <Input
                id="target_points"
                type="number"
                min="0"
                value={formData.target_points}
                onChange={(e) =>
                  setFormData({ ...formData, target_points: parseInt(e.target.value) || 0 })
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_money">Target Money ($)</Label>
              <Input
                id="target_money"
                type="number"
                min="0"
                step="0.01"
                value={formData.target_money}
                onChange={(e) =>
                  setFormData({ ...formData, target_money: parseFloat(e.target.value) || 0 })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Goal...' : 'Create Goal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
