'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, Upload, Download, Save, Music, FileText, Play, Pause } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface Song {
  id: string
  title: string
  lyrics: string
  version: number
  created_at: string
}

export default function CoWriterPage() {
  const [currentLyrics, setCurrentLyrics] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const [referenceSongs, setReferenceSongs] = useState<string>('')
  const [aiSuggestions, setAiSuggestions] = useState('')
  const [savedSongs, setSavedSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'lyrics' | 'upload' | 'reference'>('lyrics')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Here you would implement file transcription
      // For now, we'll just show a placeholder
      alert(`File "${file.name}" uploaded successfully! Transcription feature coming soon.`)
    }
  }

  const generateSuggestions = async () => {
    setIsLoading(true)
    try {
      // Here you would call the AI API to generate suggestions
      // For now, we'll simulate the response
      setTimeout(() => {
        setAiSuggestions(`AI Suggestions for "${currentTitle}":

1. Consider adding a more emotional bridge between verses
2. The chorus could benefit from a stronger hook
3. Try varying the rhyme scheme in verse 2
4. Consider adding imagery related to [topic] to strengthen the metaphor

Suggested lyrical edits:
- Line 3: Instead of "..." try "..."
- Line 7: Consider "..." for better flow`)
        setIsLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Error generating suggestions:', error)
      setIsLoading(false)
    }
  }

  const saveSong = async () => {
    if (!currentTitle || !currentLyrics) {
      alert('Please provide both title and lyrics')
      return
    }

    const version = savedSongs.filter((song) => song.title === currentTitle).length + 1

    const newSong: Song = {
      id: Date.now().toString(),
      title: currentTitle,
      lyrics: currentLyrics,
      version,
      created_at: new Date().toISOString(),
    }

    setSavedSongs([newSong, ...savedSongs])

    // Here you would save to the database
    alert(`Song "${currentTitle}" saved as version ${version}`)
  }

  const downloadLyrics = (song: Song) => {
    const element = document.createElement('a')
    const file = new Blob([`${song.title} - Version ${song.version}\n\n${song.lyrics}`], {
      type: 'text/plain',
    })
    element.href = URL.createObjectURL(file)
    element.download = `${song.title}_v${song.version}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/business-hacks">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business Hacks
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Music className="h-8 w-8 mr-3 text-blue-500" />
              Co-Writer
            </h1>
            <p className="text-gray-600">AI-powered songwriting assistant</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'lyrics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Lyrics
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Upload Song
            </button>
            <button
              onClick={() => setActiveTab('reference')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'reference'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Music className="h-4 w-4 inline mr-2" />
              Reference Songs
            </button>
          </div>

          {/* Lyrics Tab */}
          {activeTab === 'lyrics' && (
            <Card>
              <CardHeader>
                <CardTitle>Write Your Song</CardTitle>
                <CardDescription>
                  Enter your song lyrics and let AI help improve them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Song Title</label>
                  <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="Enter song title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Lyrics</label>
                  <Textarea
                    value={currentLyrics}
                    onChange={(e) => setCurrentLyrics(e.target.value)}
                    placeholder="Enter your song lyrics here..."
                    className="min-h-[300px]"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button onClick={generateSuggestions} disabled={isLoading || !currentLyrics}>
                    {isLoading ? 'Generating...' : 'Get AI Suggestions'}
                  </Button>
                  <Button onClick={saveSong} variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save Song
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Song for Analysis</CardTitle>
                <CardDescription>
                  Upload a recorded song file for transcription and analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Upload your song file (MP3, WAV, etc.)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>Choose File</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reference Songs Tab */}
          {activeTab === 'reference' && (
            <Card>
              <CardHeader>
                <CardTitle>Reference Songs</CardTitle>
                <CardDescription>
                  Upload or paste lyrics from songs you like for style reference
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-2">Reference Song Lyrics</label>
                  <Textarea
                    value={referenceSongs}
                    onChange={(e) => setReferenceSongs(e.target.value)}
                    placeholder="Paste lyrics from songs you want to reference..."
                    className="min-h-[200px]"
                  />
                </div>
                <div className="mt-4">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Suggestions */}
          {aiSuggestions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm text-gray-700">{aiSuggestions}</div>
              </CardContent>
            </Card>
          )}

          {/* Saved Songs */}
          {savedSongs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Saved Songs</CardTitle>
                <CardDescription>Your completed songs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {savedSongs.map((song) => (
                    <div key={song.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{song.title}</h4>
                        <span className="text-xs text-gray-500">v{song.version}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {song.lyrics.substring(0, 100)}...
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadLyrics(song)}
                        className="w-full"
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
