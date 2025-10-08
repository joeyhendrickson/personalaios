'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  Gift,
  Trophy,
  Star,
  Plus,
  Target,
  Heart,
  BookOpen,
  MapPin,
  Activity,
  Users,
  Palette,
  Zap,
  Crown,
  Coins,
  CheckCircle,
  Lock,
  Unlock,
  Trash2,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface RewardCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface Reward {
  id: string
  name: string
  description: string
  point_cost: number
  is_custom: boolean
  created_by?: string
  reward_categories?: RewardCategory
}

interface UserReward {
  id: string
  reward_id: string
  is_custom: boolean
  custom_name?: string
  custom_description?: string
  custom_point_cost?: number
  is_unlocked: boolean
  is_redeemed: boolean
  redeemed_at?: string
  rewards?: Reward
}

interface Milestone {
  id: string
  milestone_name: string
  description: string
  target_points: number
  is_achieved: boolean
  achieved_at?: string
  progress: number
  shouldBeAchieved: boolean
  rewards?: Reward
}

interface PartnerReward {
  id: string
  name: string
  description: string
  point_cost: number
  partner_name: string
  is_active: boolean
  requires_approval: boolean
  redemption_code?: string
  status?: string
}

const iconMap: Record<string, any> = {
  heart: Heart,
  'book-open': BookOpen,
  'map-pin': MapPin,
  activity: Activity,
  users: Users,
  palette: Palette,
  zap: Zap,
  crown: Crown,
}

export default function RewardsSection() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<RewardCategory[]>([])
  const [defaultRewards, setDefaultRewards] = useState<Reward[]>([])
  const [userRewards, setUserRewards] = useState<UserReward[]>([])
  const [partnerRewards, setPartnerRewards] = useState<PartnerReward[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [currentPoints, setCurrentPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateReward, setShowCreateReward] = useState(false)
  const [showCreateMilestone, setShowCreateMilestone] = useState(false)
  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    point_cost: 500,
    category_id: '',
  })
  const [editingReward, setEditingReward] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newMilestone, setNewMilestone] = useState({
    milestone_name: '',
    description: '',
    target_points: 1000,
    reward_unlocked_id: '',
  })

  useEffect(() => {
    if (user) {
      fetchRewardsData()
    }
  }, [user])

  const fetchRewardsData = async () => {
    try {
      const response = await fetch('/api/rewards')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
        setDefaultRewards(data.defaultRewards)
        setUserRewards(data.userRewards)
        setCurrentPoints(data.currentPoints)
      }
    } catch (error) {
      console.error('Error fetching rewards data:', error)
    }

    try {
      const response = await fetch('/api/rewards/partner')
      if (response.ok) {
        const data = await response.json()
        setPartnerRewards(data.partnerRewards)
      }
    } catch (error) {
      console.error('Error fetching partner rewards:', error)
    }

    try {
      const response = await fetch('/api/rewards/milestones')
      if (response.ok) {
        const data = await response.json()
        setMilestones(data.milestones)
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
    }

    setLoading(false)
  }

  const handleRedeemReward = async (userRewardId: string) => {
    try {
      const response = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_reward_id: userRewardId }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentPoints(data.newPointsBalance)
        await fetchRewardsData() // Refresh data
        alert(`Reward redeemed! You spent ${data.pointsSpent} points.`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error redeeming reward:', error)
      alert('Failed to redeem reward')
    }
  }

  const handleCreateReward = async () => {
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReward),
      })

      if (response.ok) {
        setShowCreateReward(false)
        setNewReward({ name: '', description: '', point_cost: 100, category_id: '' })
        await fetchRewardsData()
        alert('Custom reward created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating reward:', error)
      alert('Failed to create reward')
    }
  }

  const handleCreateMilestone = async () => {
    try {
      const response = await fetch('/api/rewards/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone),
      })

      if (response.ok) {
        setShowCreateMilestone(false)
        setNewMilestone({
          milestone_name: '',
          description: '',
          target_points: 1000,
          reward_unlocked_id: '',
        })
        await fetchRewardsData()
        alert('Custom milestone created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating milestone:', error)
      alert('Failed to create milestone')
    }
  }

  const handleAchieveMilestone = async (milestoneId: string) => {
    try {
      const response = await fetch('/api/rewards/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_id: milestoneId, is_achieved: true }),
      })

      if (response.ok) {
        await fetchRewardsData()
        alert('Milestone achieved! Check your rewards!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error achieving milestone:', error)
      alert('Failed to achieve milestone')
    }
  }

  const handleAddRewardToUser = async (rewardId: string) => {
    try {
      const response = await fetch('/api/rewards/add-to-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId }),
      })

      if (response.ok) {
        await fetchRewardsData()
        alert('Reward added to your rewards!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding reward to user:', error)
      alert('Failed to add reward')
    }
  }

  const handleRedeemPartnerReward = async (partnerRewardId: string) => {
    try {
      const response = await fetch('/api/rewards/redeem-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_reward_id: partnerRewardId }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentPoints(data.newPointsBalance)
        await fetchRewardsData()
        alert(`Partner reward redeemed! Your unique code is: ${data.redemptionCode}`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error redeeming partner reward:', error)
      alert('Failed to redeem partner reward')
    }
  }

  const handleDeleteReward = async (userRewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/rewards/${userRewardId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRewardsData()
        alert('Reward deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting reward:', error)
      alert('Failed to delete reward')
    }
  }

  const handleEditReward = async (rewardId: string) => {
    const reward = defaultRewards.find((r) => r.id === rewardId)
    if (reward && reward.is_custom && reward.created_by === user?.id) {
      setEditingReward(reward)
      setShowEditDialog(true)
    }
  }

  const handleUpdateReward = async () => {
    if (!editingReward) return

    try {
      const response = await fetch('/api/rewards/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardId: editingReward.id,
          name: editingReward.name,
          description: editingReward.description,
          point_cost: editingReward.point_cost,
        }),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingReward(null)
        await fetchRewardsData()
        alert('Reward updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating reward:', error)
      alert('Failed to update reward')
    }
  }

  const handleDeleteCustomReward = async (rewardId: string) => {
    if (confirm('Are you sure you want to delete this reward? This action cannot be undone.')) {
      try {
        const response = await fetch('/api/rewards/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rewardId }),
        })

        if (response.ok) {
          await fetchRewardsData()
          alert('Reward deleted successfully!')
        } else {
          const error = await response.json()
          alert(`Error: ${error.error}`)
        }
      } catch (error) {
        console.error('Error deleting reward:', error)
        alert('Failed to delete reward')
      }
    }
  }

  const getRewardIcon = (reward: Reward) => {
    const categoryIcon = reward.reward_categories?.icon
    if (categoryIcon && iconMap[categoryIcon]) {
      const IconComponent = iconMap[categoryIcon]
      return <IconComponent className="h-5 w-5" />
    }
    return <Gift className="h-5 w-5" />
  }

  const getRewardName = (userReward: UserReward) => {
    return userReward.is_custom ? userReward.custom_name : userReward.rewards?.name
  }

  const getRewardCost = (userReward: UserReward) => {
    return userReward.is_custom ? userReward.custom_point_cost : userReward.rewards?.point_cost
  }

  const getRewardDescription = (userReward: UserReward) => {
    return userReward.is_custom ? userReward.custom_description : userReward.rewards?.description
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Rewards & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Rewards & Milestones
        </CardTitle>
        <CardDescription>
          Exchange your points for rewards and track your progress milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Points Balance */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-yellow-600" />
              <span className="text-lg font-semibold">Current Points</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {currentPoints.toLocaleString()}
            </span>
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">Available Rewards</TabsTrigger>
            <TabsTrigger value="partner">Partner Rewards</TabsTrigger>
            <TabsTrigger value="rewards">Redeemed Awards</TabsTrigger>
          </TabsList>

          {/* Redeemed Awards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <h3 className="text-lg font-semibold">Redeemed Awards</h3>

            <div className="grid gap-4">
              {userRewards.map((userReward) => (
                <Card
                  key={userReward.id}
                  className={`${userReward.is_redeemed ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {userReward.rewards && getRewardIcon(userReward.rewards)}
                        <div>
                          <h4 className="font-semibold">{getRewardName(userReward)}</h4>
                          <p className="text-sm text-gray-600">
                            {getRewardDescription(userReward)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            userReward.is_redeemed
                              ? 'secondary'
                              : userReward.is_unlocked
                                ? 'default'
                                : 'outline'
                          }
                        >
                          {getRewardCost(userReward)} pts
                        </Badge>
                        {userReward.is_redeemed ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Redeemed
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteReward(userReward.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : userReward.is_unlocked ? (
                          <Button
                            size="sm"
                            onClick={() => handleRedeemReward(userReward.id)}
                            disabled={currentPoints < (getRewardCost(userReward) || 0)}
                          >
                            Redeem
                          </Button>
                        ) : (
                          <Badge variant="outline">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Available Rewards Tab */}
          <TabsContent value="available" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Available Rewards</h3>
              <Dialog open={showCreateReward} onOpenChange={setShowCreateReward}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Reward
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Reward</DialogTitle>
                    <DialogDescription>Create a personalized reward for yourself</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reward-name">Reward Name</Label>
                      <Input
                        id="reward-name"
                        value={newReward.name}
                        onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                        placeholder="e.g., Buy myself a nice dinner"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reward-description">Description</Label>
                      <Textarea
                        id="reward-description"
                        value={newReward.description}
                        onChange={(e) =>
                          setNewReward({ ...newReward, description: e.target.value })
                        }
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reward-cost">Point Cost</Label>
                      <Input
                        id="reward-cost"
                        type="number"
                        value={newReward.point_cost}
                        onChange={(e) =>
                          setNewReward({
                            ...newReward,
                            point_cost: parseInt(e.target.value) || 500,
                          })
                        }
                        min="500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reward-category">Category</Label>
                      <Select
                        value={newReward.category_id}
                        onValueChange={(value) =>
                          setNewReward({ ...newReward, category_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => {
                            const IconComponent = iconMap[category.icon] || Gift
                            return (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {category.name}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateReward} className="w-full">
                      Create Reward
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit Reward Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Custom Reward</DialogTitle>
                    <DialogDescription>Update your personalized reward</DialogDescription>
                  </DialogHeader>
                  {editingReward && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-reward-name">Reward Name</Label>
                        <Input
                          id="edit-reward-name"
                          value={editingReward.name}
                          onChange={(e) =>
                            setEditingReward({ ...editingReward, name: e.target.value })
                          }
                          placeholder="e.g., Buy myself a nice dinner"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-reward-description">Description</Label>
                        <Textarea
                          id="edit-reward-description"
                          value={editingReward.description || ''}
                          onChange={(e) =>
                            setEditingReward({ ...editingReward, description: e.target.value })
                          }
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-reward-cost">Point Cost</Label>
                        <Input
                          id="edit-reward-cost"
                          type="number"
                          value={editingReward.point_cost}
                          onChange={(e) =>
                            setEditingReward({
                              ...editingReward,
                              point_cost: parseInt(e.target.value) || 500,
                            })
                          }
                          min="500"
                        />
                      </div>
                      <Button onClick={handleUpdateReward} className="w-full">
                        Update Reward
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4">
              {defaultRewards.map((reward) => (
                <Card key={reward.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getRewardIcon(reward)}
                        <div>
                          <h4 className="font-semibold">{reward.name}</h4>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{reward.point_cost} pts</Badge>
                        {reward.is_custom && reward.created_by === user?.id && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditReward(reward.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCustomReward(reward.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleAddRewardToUser(reward.id)}
                          disabled={currentPoints < reward.point_cost}
                        >
                          Redeem
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Partner Rewards Tab */}
          <TabsContent value="partner" className="space-y-4">
            <h3 className="text-lg font-semibold">Partner Rewards</h3>
            <p className="text-sm text-gray-600 mb-4">
              Special rewards from our partners. Redeem with your points to get unique codes!
            </p>
            <div className="grid gap-4">
              {partnerRewards.map((reward) => (
                <Card key={reward.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="h-5 w-5 text-purple-600" />
                        <div>
                          <h4 className="font-semibold">{reward.name}</h4>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                          <p className="text-xs text-purple-600 font-medium">
                            Partner: {reward.partner_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{reward.point_cost} pts</Badge>
                        {reward.requires_approval ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Requires Approval
                            </Badge>
                            <Button
                              size="sm"
                              disabled={true}
                              className="opacity-50 cursor-not-allowed"
                            >
                              Redeem
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleRedeemPartnerReward(reward.id)}
                            disabled={currentPoints < reward.point_cost}
                          >
                            Redeem
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Milestones</h3>
              <Dialog open={showCreateMilestone} onOpenChange={setShowCreateMilestone}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Milestone</DialogTitle>
                    <DialogDescription>Set a personal milestone to work towards</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="milestone-name">Milestone Name</Label>
                      <Input
                        id="milestone-name"
                        value={newMilestone.milestone_name}
                        onChange={(e) =>
                          setNewMilestone({ ...newMilestone, milestone_name: e.target.value })
                        }
                        placeholder="e.g., Complete 30 days of habits"
                      />
                    </div>
                    <div>
                      <Label htmlFor="milestone-description">Description</Label>
                      <Textarea
                        id="milestone-description"
                        value={newMilestone.description}
                        onChange={(e) =>
                          setNewMilestone({ ...newMilestone, description: e.target.value })
                        }
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="milestone-target">Target Points</Label>
                      <Input
                        id="milestone-target"
                        type="number"
                        value={newMilestone.target_points}
                        onChange={(e) =>
                          setNewMilestone({
                            ...newMilestone,
                            target_points: parseInt(e.target.value) || 0,
                          })
                        }
                        min="1"
                      />
                    </div>
                    <Button onClick={handleCreateMilestone} className="w-full">
                      Create Milestone
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {milestones.map((milestone) => (
                <Card
                  key={milestone.id}
                  className={`${milestone.is_achieved ? 'bg-green-50 border-green-200' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-600" />
                          <h4 className="font-semibold">{milestone.milestone_name}</h4>
                        </div>
                        <Badge variant={milestone.is_achieved ? 'default' : 'outline'}>
                          {milestone.is_achieved
                            ? 'Achieved!'
                            : `${milestone.target_points.toLocaleString()} pts`}
                        </Badge>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600">{milestone.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(milestone.progress)}%</span>
                        </div>
                        <Progress value={milestone.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            {currentPoints.toLocaleString()} /{' '}
                            {milestone.target_points.toLocaleString()} points
                          </span>
                        </div>
                      </div>
                      {milestone.shouldBeAchieved && !milestone.is_achieved && (
                        <Button
                          size="sm"
                          onClick={() => handleAchieveMilestone(milestone.id)}
                          className="w-full"
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Achieve Milestone
                        </Button>
                      )}
                      {milestone.rewards && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                          <p className="text-sm text-blue-800">
                            <strong>Reward Unlocked:</strong> {milestone.rewards.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
