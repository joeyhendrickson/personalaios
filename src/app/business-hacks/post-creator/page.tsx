'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Settings,
  Play,
  Download,
  CheckCircle,
  Clock,
  RefreshCw,
  PenTool,
  Eye,
  Copy,
  Share2,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

interface UserCredentials {
  google_connected: boolean
  pinecone_configured: boolean
  openai_configured: boolean
}

interface VoiceAnalysisJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  drive_folder_url: string
  voice_profile?: VoiceProfile
  created_at: string
}

interface VoiceProfile {
  writing_style: {
    tone: string
    formality: string
    humor_level: number
    emotional_tone: string
    sentence_length: string
    vocabulary_complexity: string
  }
  common_phrases: string[]
  topics_interests: string[]
  platform_preferences: {
    facebook: PlatformStyle
    linkedin: PlatformStyle
    instagram: PlatformStyle
    reddit: PlatformStyle
  }
  engagement_patterns: {
    question_frequency: number
    call_to_action_usage: number
    hashtag_usage: number
    emoji_usage: number
  }
  confidence_score: number
}

interface PlatformStyle {
  post_length: string
  structure_preference: string
  engagement_tactics: string[]
  common_hashtags: string[]
}

interface GeneratedPost {
  id: string
  platform: string
  content: string
  title?: string
  hashtags: string[]
  call_to_action?: string
  engagement_score: number
  voice_match_score: number
  created_at: string
}

export default function PostCreatorPage() {
  const [activeTab, setActiveTab] = useState('analyze')
  const [credentials, setCredentials] = useState<UserCredentials>({
    google_connected: false,
    pinecone_configured: false,
    openai_configured: false,
  })
  const [analysisJobs, setAnalysisJobs] = useState<VoiceAnalysisJob[]>([])
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [driveFolderUrl, setDriveFolderUrl] = useState('')
  const [postPlatform, setPostPlatform] = useState('linkedin')
  const [postTopic, setPostTopic] = useState('')
  const [postSentiment, setPostSentiment] = useState('professional')
  const [targetAudience, setTargetAudience] = useState('')
  const [postGoal, setPostGoal] = useState('')
  const [postLength, setPostLength] = useState([50])
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeCallToAction, setIncludeCallToAction] = useState(true)

  useEffect(() => {
    fetchCredentials()
    fetchAnalysisJobs()
    fetchGeneratedPosts()
  }, [])

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/project-plan-builder/credentials')
      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)
      }
    } catch (error) {
      console.error('Error fetching credentials:', error)
    }
  }

  const fetchAnalysisJobs = async () => {
    try {
      const response = await fetch('/api/post-creator/analysis')
      if (response.ok) {
        const data = await response.json()
        setAnalysisJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching analysis jobs:', error)
    }
  }

  const fetchGeneratedPosts = async () => {
    try {
      const response = await fetch('/api/post-creator/posts')
      if (response.ok) {
        const data = await response.json()
        setGeneratedPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error fetching generated posts:', error)
    }
  }

  const handleStartVoiceAnalysis = async () => {
    if (!driveFolderUrl) {
      alert('Please provide a Google Drive folder URL')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/post-creator/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_folder_url: driveFolderUrl,
        }),
      })

      if (response.ok) {
        await fetchAnalysisJobs()
        setDriveFolderUrl('')
        setActiveTab('generate')
      }
    } catch (error) {
      console.error('Error starting voice analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePost = async () => {
    if (!postTopic || !targetAudience || !postGoal) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/post-creator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: postPlatform,
          topic: postTopic,
          sentiment: postSentiment,
          target_audience: targetAudience,
          goal: postGoal,
          length_percentage: postLength[0],
          include_hashtags: includeHashtags,
          include_call_to_action: includeCallToAction,
        }),
      })

      if (response.ok) {
        await fetchGeneratedPosts()
        setPostTopic('')
        setTargetAudience('')
        setPostGoal('')
        setActiveTab('posts')
      }
    } catch (error) {
      console.error('Error generating post:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPost = (content: string) => {
    navigator.clipboard.writeText(content)
    // Could add a toast notification here
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <RefreshCw className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4 text-blue-700" />
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />
      case 'reddit':
        return <MessageCircle className="h-4 w-4 text-orange-600" />
      default:
        return <PenTool className="h-4 w-4" />
    }
  }

  const completedJobs = analysisJobs.filter((job) => job.status === 'completed')
  const hasVoiceProfile = completedJobs.length > 0

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/business-hacks">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Business Hacks
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <PenTool className="h-8 w-8 mr-3 text-purple-600" />
                Post Creator
              </h1>
              <p className="text-gray-600">
                AI-powered social media post generator that creates authentic content in your unique
                voice
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze">Analyze Voice</TabsTrigger>
          <TabsTrigger value="generate" disabled={!hasVoiceProfile}>
            Generate Post
          </TabsTrigger>
          <TabsTrigger value="posts">Generated Posts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Analyze Voice Tab */}
        <TabsContent value="analyze" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Start Voice Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Analyze Your Voice</CardTitle>
                <CardDescription>
                  Upload your historical social media posts to Google Drive for AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="drive-folder">Google Drive Folder URL</Label>
                    <Input
                      id="drive-folder"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Upload your Facebook, LinkedIn, Instagram, and Reddit post exports to this
                      folder
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How to Export Your Posts:</h4>
                    <ul className="text-sm space-y-1 text-blue-800">
                      <li>
                        • <strong>Facebook:</strong> Settings & Privacy → Your Facebook Information
                        → Download Your Information
                      </li>
                      <li>
                        • <strong>LinkedIn:</strong> Settings & Privacy → Data Privacy → Get a Copy
                        of Your Data
                      </li>
                      <li>
                        • <strong>Instagram:</strong> Settings → Security → Download Your
                        Information
                      </li>
                      <li>
                        • <strong>Reddit:</strong> Preferences → Privacy & Security → Download Your
                        Data
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleStartVoiceAnalysis}
                    disabled={loading || !driveFolderUrl}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Analyze My Voice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Analysis Jobs</CardTitle>
                <CardDescription>Track the progress of your voice analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No analysis jobs yet</p>
                  ) : (
                    analysisJobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Voice Analysis</h4>
                            <p className="text-sm text-gray-500">
                              Started {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <span className="text-sm font-medium capitalize">{job.status}</span>
                          </div>
                        </div>

                        {job.status === 'running' && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} className="h-2" />
                          </div>
                        )}

                        {job.status === 'completed' && job.voice_profile && (
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium mb-2">Voice Profile Summary</h5>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Tone: {job.voice_profile.writing_style.tone}</div>
                                <div>Formality: {job.voice_profile.writing_style.formality}</div>
                                <div>
                                  Emotional Tone: {job.voice_profile.writing_style.emotional_tone}
                                </div>
                                <div>
                                  Confidence: {Math.round(job.voice_profile.confidence_score * 100)}
                                  %
                                </div>
                              </div>
                            </div>

                            <Button onClick={() => setActiveTab('generate')} className="w-full">
                              <PenTool className="h-4 w-4 mr-2" />
                              Generate Posts
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Generate Post Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Social Media Post</CardTitle>
              <CardDescription>
                Create authentic posts that match your unique voice and style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Post Configuration */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={postPlatform} onValueChange={setPostPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="reddit">Reddit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="topic">Post Topic *</Label>
                    <Textarea
                      id="topic"
                      placeholder="What do you want to write about?"
                      value={postTopic}
                      onChange={(e) => setPostTopic(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="sentiment">Sentiment/Tone</Label>
                    <Select value={postSentiment} onValueChange={setPostSentiment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sentiment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="thoughtful">Thoughtful</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="audience">Target Audience *</Label>
                    <Input
                      id="audience"
                      placeholder="Who is your target audience?"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="goal">Post Goal/Conclusion *</Label>
                    <Textarea
                      id="goal"
                      placeholder="What do you want to achieve with this post?"
                      value={postGoal}
                      onChange={(e) => setPostGoal(e.target.value)}
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <div>
                    <Label>Post Length: {postLength[0]}%</Label>
                    <Slider
                      value={postLength}
                      onValueChange={setPostLength}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Short</span>
                      <span>Medium</span>
                      <span>Long</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hashtags"
                        checked={includeHashtags}
                        onChange={(e) => setIncludeHashtags(e.target.checked)}
                      />
                      <Label htmlFor="hashtags">Include hashtags</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="cta"
                        checked={includeCallToAction}
                        onChange={(e) => setIncludeCallToAction(e.target.checked)}
                      />
                      <Label htmlFor="cta">Include call-to-action</Label>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Voice Matching</h4>
                    <p className="text-sm text-purple-800">
                      The AI will analyze your historical posts and generate content that matches
                      your:
                    </p>
                    <ul className="text-sm text-purple-800 mt-2 space-y-1">
                      <li>• Writing tone and style</li>
                      <li>• Common phrases and vocabulary</li>
                      <li>• Platform-specific preferences</li>
                      <li>• Engagement patterns</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleGeneratePost}
                    disabled={loading || !postTopic || !targetAudience || !postGoal}
                    className="w-full"
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    Generate Post
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Posts Tab */}
        <TabsContent value="posts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Posts</CardTitle>
                  <CardDescription>
                    Review and use your AI-generated social media posts
                  </CardDescription>
                </div>
                <Button onClick={fetchGeneratedPosts} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedPosts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No generated posts yet</p>
                ) : (
                  generatedPosts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {getPlatformIcon(post.platform)}
                          <div>
                            <h4 className="font-medium capitalize">{post.platform}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span>Voice Match: {Math.round(post.voice_match_score * 100)}%</span>
                              <span>•</span>
                              <span>Engagement Score: {post.engagement_score}/10</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyPost(post.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                        {post.hashtags.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {post.call_to_action && (
                        <div className="text-sm text-blue-600 font-medium">
                          CTA: {post.call_to_action}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Generated {new Date(post.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                Post Creator uses the same credentials as Project Plan Builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Google Drive</span>
                  <Badge variant={credentials.google_connected ? 'default' : 'destructive'}>
                    {credentials.google_connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pinecone</span>
                  <Badge variant={credentials.pinecone_configured ? 'default' : 'destructive'}>
                    {credentials.pinecone_configured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>OpenAI</span>
                  <Badge variant={credentials.openai_configured ? 'default' : 'secondary'}>
                    {credentials.openai_configured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/business-hacks/project-plan-builder?tab=settings">
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Credentials
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
