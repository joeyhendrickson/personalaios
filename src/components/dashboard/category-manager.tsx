'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Palette,
  Target,
  Zap,
  FolderOpen,
  CheckSquare,
  BookOpen,
  Repeat,
  Brain,
  Settings,
  Star,
  Heart,
  Lightbulb,
  TrendingUp,
  Calendar,
  Users,
  Home,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Music,
  Camera,
  Code,
  Paintbrush,
  Gamepad2,
  Car,
  Plane,
  ShoppingBag,
  Gift,
  Coffee,
  Utensils,
  Bed,
  ShowerHead,
  Wrench,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  MoreHorizontal,
} from 'lucide-react'

interface DashboardCategory {
  id: string
  name: string
  description?: string
  color: string
  icon_name?: string
  sort_order: number
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

const iconOptions = [
  { name: 'Target', component: Target, description: 'Goals & Objectives' },
  { name: 'Zap', component: Zap, description: 'Priorities & Urgent' },
  { name: 'FolderOpen', component: FolderOpen, description: 'Projects & Work' },
  { name: 'CheckSquare', component: CheckSquare, description: 'Tasks & To-dos' },
  { name: 'BookOpen', component: BookOpen, description: 'Education & Learning' },
  { name: 'Repeat', component: Repeat, description: 'Habits & Routines' },
  { name: 'Brain', component: Brain, description: 'AI & Intelligence' },
  { name: 'Settings', component: Settings, description: 'Settings & Config' },
  { name: 'Star', component: Star, description: 'Favorites & Highlights' },
  { name: 'Heart', component: Heart, description: 'Health & Wellness' },
  { name: 'Lightbulb', component: Lightbulb, description: 'Ideas & Innovation' },
  { name: 'TrendingUp', component: TrendingUp, description: 'Growth & Progress' },
  { name: 'Calendar', component: Calendar, description: 'Schedule & Events' },
  { name: 'Users', component: Users, description: 'People & Social' },
  { name: 'Home', component: Home, description: 'Home & Family' },
  { name: 'Briefcase', component: Briefcase, description: 'Work & Career' },
  { name: 'GraduationCap', component: GraduationCap, description: 'Education & Skills' },
  { name: 'Dumbbell', component: Dumbbell, description: 'Fitness & Exercise' },
  { name: 'Music', component: Music, description: 'Music & Arts' },
  { name: 'Camera', component: Camera, description: 'Photography & Media' },
  { name: 'Code', component: Code, description: 'Development & Tech' },
  { name: 'Paintbrush', component: Paintbrush, description: 'Design & Creative' },
  { name: 'Gamepad2', component: Gamepad2, description: 'Gaming & Entertainment' },
  { name: 'Car', component: Car, description: 'Transportation' },
  { name: 'Plane', component: Plane, description: 'Travel & Adventure' },
  { name: 'ShoppingBag', component: ShoppingBag, description: 'Shopping & Purchases' },
  { name: 'Gift', component: Gift, description: 'Gifts & Celebrations' },
  { name: 'Coffee', component: Coffee, description: 'Food & Beverages' },
  { name: 'Utensils', component: Utensils, description: 'Cooking & Dining' },
  { name: 'Bed', component: Bed, description: 'Sleep & Rest' },
  { name: 'ShowerHead', component: ShowerHead, description: 'Personal Care' },
  { name: 'Wrench', component: Wrench, description: 'Tools & Maintenance' },
  { name: 'Shield', component: Shield, description: 'Security & Safety' },
  { name: 'Lock', component: Lock, description: 'Privacy & Access' },
  { name: 'Unlock', component: Unlock, description: 'Open & Available' },
  { name: 'Eye', component: Eye, description: 'Visibility & Monitoring' },
  { name: 'EyeOff', component: EyeOff, description: 'Hidden & Private' },
  { name: 'MoreHorizontal', component: MoreHorizontal, description: 'Other & Miscellaneous' },
]

const colorOptions = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Purple
  '#EAB308', // Yellow
  '#DC2626', // Red-600
  '#059669', // Emerald-600
  '#7C3AED', // Violet-600
  '#D97706', // Amber-600
  '#0891B2', // Cyan-600
  '#65A30D', // Lime-600
  '#EA580C', // Orange-600
]

export default function CategoryManager() {
  const [categories, setCategories] = useState<DashboardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DashboardCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon_name: 'Target',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/dashboard-categories')
      if (!response.ok) throw new Error('Failed to fetch categories')

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    try {
      const response = await fetch('/api/dashboard-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create category')

      await fetchCategories()
      setShowCreateDialog(false)
      resetForm()
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    try {
      const response = await fetch(`/api/dashboard-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to update category')

      await fetchCategories()
      setEditingCategory(null)
      resetForm()
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const handleDeleteCategory = async (category: DashboardCategory) => {
    if (
      !confirm(
        `Are you sure you want to ${category.is_default ? 'hide' : 'delete'} "${category.name}"?`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard-categories/${category.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete category')

      await fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon_name: 'Target',
    })
  }

  const openEditDialog = (category: DashboardCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon_name: category.icon_name || 'Target',
    })
  }

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find((option) => option.name === iconName)
    return iconOption ? iconOption.component : Target
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Categories</CardTitle>
          <CardDescription>Manage your dashboard sections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dashboard Categories</CardTitle>
            <CardDescription>Customize your dashboard sections and organization</CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>Add a new section to your dashboard</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Health & Fitness"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of this category"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select
                    value={formData.icon_name}
                    onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => {
                        const IconComponent = option.component
                        return (
                          <SelectItem key={option.name} value={option.name}>
                            <div className="flex items-center">
                              <IconComponent className="h-4 w-4 mr-2" />
                              <span>{option.description}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="grid grid-cols-10 gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={!formData.name}>
                    Create Category
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No categories found</p>
            <p className="text-sm text-gray-500">
              Create your first custom category to organize your dashboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const IconComponent = getIconComponent(category.icon_name || 'Target')
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        {category.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update your dashboard category</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Health & Fitness"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this category"
                  rows={3}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => {
                      const IconComponent = option.component
                      return (
                        <SelectItem key={option.name} value={option.name}>
                          <div className="flex items-center">
                            <IconComponent className="h-4 w-4 mr-2" />
                            <span>{option.description}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-10 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCategory} disabled={!formData.name}>
                  Update Category
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
