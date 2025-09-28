'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send,
  Plus,
  Target,
  Lightbulb,
  Calendar,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  onGoalCreated?: () => void
  onTaskCreated?: () => void
  onTaskCompleted?: () => void
  triggerOpen?: boolean
}

export function ChatInterface({
  onGoalCreated,
  onTaskCreated,
  onTaskCompleted,
  triggerOpen,
}: ChatInterfaceProps) {
  // Suppress unused parameter warnings
  void onGoalCreated
  void onTaskCreated
  void onTaskCompleted
  const [isExpanded, setIsExpanded] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 384, height: 600 }) // w-96 = 384px
  const [position, setPosition] = useState({ x: 16, y: 16 }) // Default position (top-4 right-4 = 16px)
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Voice-related state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [continuousMode, setContinuousMode] = useState(false)
  const [lastSpeechTime, setLastSpeechTime] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  // Handle external trigger to open chat
  useEffect(() => {
    if (triggerOpen) {
      setIsExpanded(true)
    }
  }, [triggerOpen])

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check for speech recognition support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true // Enable continuous listening
        recognitionRef.current.interimResults = true // Get interim results for better UX
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onstart = () => {
          setIsListening(true)
        }

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''

          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          console.log('Speech result:', { finalTranscript, interimTranscript, continuousMode })

          // Update input with current transcript
          const currentTranscript = finalTranscript + interimTranscript
          setInput(currentTranscript)

          // Update last speech time
          setLastSpeechTime(Date.now())

          // Clear existing timeout
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current)
          }

          // Set up auto-submit after 2.5 seconds of silence
          if (continuousMode && currentTranscript.trim()) {
            console.log('Setting up auto-submit timeout for:', currentTranscript)
            speechTimeoutRef.current = setTimeout(() => {
              console.log('Auto-submit triggered after 2.5s silence!')
              if (currentTranscript.trim()) {
                console.log('Auto-submitting:', currentTranscript)
                // Directly submit the current transcript
                submitMessage(currentTranscript)
              }
            }, 2500) // 2.5 seconds
          }
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }

      // Load voices for better speech synthesis
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log(
            'Available voices:',
            voices.map((v) => v.name)
          )
        }
      }

      // Load voices immediately and on voice change
      loadVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }, [])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your intelligent AI assistant with full access to your dashboard data. I can help you:

• Plan your day and prioritize tasks based on your goals
• Analyze your progress and suggest improvements
• Create new tasks and goals with appropriate point values
• Focus on specific areas like "Good Living" or "Enjoyment"
• Track your habits, education, and priorities
• Provide personalized advice based on your data

What would you like to focus on today? Try asking me about having a "happy day" or planning your strategy!`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const quickActions = [
    {
      label: 'Happy Day',
      icon: Lightbulb,
      prompt: 'Today I want to have a happy day. What should I do?',
      color: 'bg-black hover:bg-gray-800',
    },
    {
      label: 'Today Plan',
      icon: Calendar,
      prompt: 'Help me plan my day and prioritize my tasks based on my weekly goals.',
      color: 'bg-black hover:bg-gray-800',
    },
    {
      label: '+ Goal',
      icon: Target,
      prompt:
        'I want to create a new goal for this week. Help me set it up with appropriate target points.',
      color: 'bg-black hover:bg-gray-800',
    },
    {
      label: '+ Task',
      icon: Plus,
      prompt: 'I want to add a new task. Help me create it and link it to one of my goals.',
      color: 'bg-black hover:bg-gray-800',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== CHAT SUBMIT CALLED ===', { input: input.trim(), isLoading })
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Use the extracted submitMessage function
    await submitMessage(input.trim())
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
  }

  // Submit message function (extracted from handleSubmit for reuse)
  const submitMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    console.log('=== SUBMIT MESSAGE CALLED ===', { messageText, isLoading })

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, assistantMessage])

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let responseContent = ''
      console.log('Starting to read streaming response...')
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Streaming completed')
          break
        }

        const chunk = new TextDecoder().decode(value)
        console.log('Received chunk:', chunk)
        const lines = chunk.split('\n')

        for (const line of lines) {
          console.log('Processing line:', line)
          // Handle different streaming formats
          if (line.startsWith('0:')) {
            // Legacy format
            const content = line.slice(2)
            responseContent += content
            console.log('Added content (legacy):', content)
          } else if (line.startsWith('0"')) {
            // JSON format
            const content = line.slice(2)
            responseContent += content
            console.log('Added content (JSON):', content)
          } else if (line.trim() && !line.startsWith('data:') && !line.startsWith('event:')) {
            // Direct text content
            responseContent += line
            console.log('Added content (direct):', line)
          }

          // Update the message if we have content
          if (responseContent) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, content: responseContent } : msg
              )
            )
          }
        }
      }

      // Speak the complete response if voice is enabled
      if (responseContent && voiceEnabled) {
        // Clean and enhance the message for more natural speech
        const cleanMessage = responseContent
          // Remove markdown formatting
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/#{1,6}\s+/g, '')
          .replace(/^\s*[-*+]\s+/gm, '')
          .replace(/^\s*\d+\.\s+/gm, '')
          // Remove excessive whitespace
          .replace(/\s+/g, ' ')
          .trim()

        console.log('Speaking response:', cleanMessage)
        speakText(cleanMessage)
      }

      // Restart listening if continuous mode is on
      if (continuousMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (error) {
            console.error('Error restarting speech recognition:', error)
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.slice(0, -1)) // Remove the assistant message on error
    } finally {
      setIsLoading(false)
    }
  }

  // Voice input functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setContinuousMode(true)
        recognitionRef.current.start()
      } catch (error) {
        console.error('Error starting speech recognition:', error)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setContinuousMode(false)
      recognitionRef.current.stop()
      // Clear any pending timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }

  const toggleContinuousListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Voice output functions
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return

    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Professional and sophisticated speech parameters
    utterance.rate = 1.1 // Faster, more conversational pace
    utterance.pitch = 0.75 // Lower pitch for professional, sultry tone
    utterance.volume = 0.9 // Slightly lower volume for intimate, engaging delivery
    utterance.lang = 'en-AU' // Australian English accent

    // Try to select the most modern, high-quality voice
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      console.log(
        'Available voices:',
        voices.map((v) => `${v.name} (${v.lang}) - Local: ${v.localService}`)
      )

      // Prioritize professional, sophisticated voices
      const professionalVoices = voices.filter(
        (voice) =>
          // Premium cloud voices (highest quality)
          voice.name.toLowerCase().includes('neural') ||
          voice.name.toLowerCase().includes('enhanced') ||
          voice.name.toLowerCase().includes('premium') ||
          voice.name.toLowerCase().includes('wavenet') ||
          voice.name.toLowerCase().includes('standard') ||
          // Professional-sounding system voices (lower pitch, sophisticated)
          voice.name.toLowerCase().includes('daniel') ||
          voice.name.toLowerCase().includes('alex') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('moira') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('tessa') ||
          voice.name.toLowerCase().includes('veena') ||
          voice.name.toLowerCase().includes('fiona') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('hazel') ||
          voice.name.toLowerCase().includes('sarah') ||
          voice.name.toLowerCase().includes('emma') ||
          // Professional cloud services
          voice.name.toLowerCase().includes('google') ||
          voice.name.toLowerCase().includes('microsoft') ||
          voice.name.toLowerCase().includes('amazon') ||
          voice.name.toLowerCase().includes('azure') ||
          // Look for voices with professional descriptors
          voice.name.toLowerCase().includes('professional') ||
          voice.name.toLowerCase().includes('business') ||
          voice.name.toLowerCase().includes('news') ||
          voice.name.toLowerCase().includes('narrator')
      )

      // Sort by quality preference (cloud voices first, then local)
      const sortedVoices = professionalVoices.sort((a, b) => {
        // Prefer cloud voices over local
        if (a.localService !== b.localService) {
          return a.localService ? 1 : -1
        }
        // Prefer English voices
        if (a.lang.startsWith('en') && !b.lang.startsWith('en')) return -1
        if (!a.lang.startsWith('en') && b.lang.startsWith('en')) return 1
        return 0
      })

      if (sortedVoices.length > 0) {
        utterance.voice = sortedVoices[0]
        console.log('Selected voice:', sortedVoices[0].name, sortedVoices[0].lang)
      } else {
        // Fallback to any non-default voice
        const nonDefaultVoices = voices.filter((voice) => !voice.default)
        if (nonDefaultVoices.length > 0) {
          utterance.voice = nonDefaultVoices[0]
          console.log('Fallback voice:', nonDefaultVoices[0].name)
        }
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
    synthesisRef.current = utterance
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled)
    if (isSpeaking) {
      stopSpeaking()
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startY = e.clientY
    const startPositionX = position.x
    const startPositionY = position.y

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      const newX = Math.max(
        0,
        Math.min(window.innerWidth - dimensions.width, startPositionX + deltaX)
      )
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - dimensions.height, startPositionY + deltaY)
      )

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Resize handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's'
  ) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight

      // Handle different resize directions
      if (direction.includes('e')) newWidth = Math.max(300, startWidth + deltaX)
      if (direction.includes('w')) newWidth = Math.max(300, startWidth - deltaX)
      if (direction.includes('s')) newHeight = Math.max(400, startHeight + deltaY)
      if (direction.includes('n')) newHeight = Math.max(400, startHeight - deltaY)

      setDimensions({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const formatText = (content: string) => {
    // Convert markdown-style formatting to readable text with better spacing
    const formatted = content
      // Remove markdown headers and replace with bold text
      .replace(/^#{1,6}\s+/gm, '')
      // Convert **bold** to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert *italic* to <em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert bullet points to proper spacing with line breaks
      .replace(/^[\s]*[-*+]\s+/gm, '\n• ')
      // Convert numbered lists with line breaks
      .replace(/^[\s]*\d+\.\s+/gm, (match, offset, string) => {
        const num = match.trim().replace('.', '')
        return `\n${num}. `
      })
      // Add extra spacing after colons (for time sections like "Morning:")
      .replace(/([A-Za-z]+:)\s*/g, '$1\n')
      // Add spacing between different time periods or major sections
      .replace(
        /(Morning:|Midday:|Afternoon:|Evening:|Morning|Midday|Afternoon|Evening)\s*/g,
        '\n\n$1\n'
      )
      // Add spacing before questions
      .replace(/(\?)\s*([A-Z])/g, '$1\n\n$2')
      // Add spacing after periods that end sentences
      .replace(/([.!?])\s*([A-Z][a-z])/g, '$1\n\n$2')
      // Add proper spacing between paragraphs
      .replace(/\n\n+/g, '\n\n')
      // Clean up excessive line breaks but keep good spacing
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()

    return formatted
  }

  const formatMessage = (message: ChatMessage) => {
    if (message.role === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div
            className="bg-black text-white rounded-lg px-6 py-3 max-w-[85%]"
            style={{ fontSize: '16px', lineHeight: '1.6' }}
          >
            {message.content}
          </div>
        </div>
      )
    }

    const formattedContent = formatText(message.content)

    return (
      <div className="flex justify-start mb-4">
        <div className="bg-gray-100 rounded-lg px-6 py-4 max-w-[85%]">
          <div
            className="prose max-w-none"
            style={{
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '16px',
              marginBottom: '0.5rem',
            }}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        </div>
      </div>
    )
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full w-14 h-14 shadow-lg bg-black hover:bg-gray-800"
        >
          <Send className="w-6 h-6" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`fixed z-50 bg-white rounded-lg shadow-xl border flex flex-col ${isResizing || isDragging ? 'select-none' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        maxWidth: '80vw',
        maxHeight: 'calc(100vh - 2rem)',
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between p-4 border-b bg-black text-white rounded-t-lg cursor-move"
        onMouseDown={handleDragStart}
      >
        <h3 className="font-semibold">Productivity Advisor</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="text-white hover:bg-gray-800"
        >
          ✕
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>{formatMessage(message)}</div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-t bg-gray-50">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="default"
              onClick={() => handleQuickAction(action.prompt)}
              className={`${action.color} text-white border-0 hover:opacity-90 h-10`}
              disabled={isLoading}
            >
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Voice Controls */}
        {speechSupported && (
          <div className="flex items-center space-x-2 mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleContinuousListening}
              disabled={isLoading}
              className={`h-8 px-3 ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={isSpeaking ? stopSpeaking : () => {}}
              disabled={!isSpeaking}
              className={`h-8 px-3 ${isSpeaking ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleVoice}
              className={`h-8 px-3 ${voiceEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <span className="text-xs text-gray-500">
              {isListening
                ? continuousMode
                  ? 'Continuous Mode'
                  : 'Listening...'
                : isSpeaking
                  ? 'Speaking...'
                  : voiceEnabled
                    ? 'Voice ON'
                    : 'Voice OFF'}
            </span>
          </div>
        )}

        {/* Input */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex space-x-3">
          <Input
            value={input}
            onChange={(e) => {
              console.log('=== INPUT CHANGED ===', e.target.value)
              setInput(e.target.value)
            }}
            placeholder="Ask me anything about your strategy for the day..."
            className="flex-1 h-12 text-base"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="h-12 px-6">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {/* Resize Handles */}
      {/* Corner handles */}
      <div
        className="absolute top-0 right-0 w-3 h-3 cursor-nw-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div
        className="absolute top-0 left-0 w-3 h-3 cursor-ne-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />

      {/* Edge handles */}
      <div
        className="absolute top-0 left-3 right-3 h-1 cursor-n-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'n')}
      />
      <div
        className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      <div
        className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      <div
        className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
    </div>
  )
}
