'use client'

import { useState } from 'react'
import { ArrowLeft, BookOpen, FileText, Download, Save, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface Chapter {
  id: string
  title: string
  content: string
  order: number
}

interface Book {
  id: string
  title: string
  description: string
  bookType: 'fiction' | 'non-fiction' | 'white-paper'
  targetPages: number
  tableOfContents: string
  chapters: Chapter[]
  created_at: string
}

export default function GhostWriterPage() {
  const [currentStep, setCurrentStep] = useState<'outline' | 'chapters' | 'compile'>('outline')
  const [bookDescription, setBookDescription] = useState('')
  const [bookType, setBookType] = useState<'fiction' | 'non-fiction' | 'white-paper'>('non-fiction')
  const [targetPages, setTargetPages] = useState(100)
  const [tableOfContents, setTableOfContents] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [savedBooks, setSavedBooks] = useState<Book[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateTableOfContents = async () => {
    if (!bookDescription) {
      alert('Please provide a book description first')
      return
    }

    setIsGenerating(true)
    try {
      // Here you would call the AI API to generate table of contents
      // For now, we'll simulate the response
      setTimeout(() => {
        const sampleTOC = `Table of Contents for "${bookDescription.split('.')[0]}"

1. Introduction
   - Overview of the topic
   - Purpose and scope
   - Key concepts to be covered

2. Background and Context
   - Historical perspective
   - Current state of affairs
   - Why this matters now

3. Core Concepts
   - Fundamental principles
   - Key theories and frameworks
   - Practical applications

4. Case Studies and Examples
   - Real-world applications
   - Success stories
   - Lessons learned

5. Implementation Strategies
   - Step-by-step approaches
   - Best practices
   - Common pitfalls to avoid

6. Future Outlook
   - Emerging trends
   - Predictions and projections
   - Next steps for readers

7. Conclusion
   - Summary of key points
   - Call to action
   - Final thoughts`

        setTableOfContents(sampleTOC)
        setIsGenerating(false)
      }, 2000)
    } catch (error) {
      console.error('Error generating table of contents:', error)
      setIsGenerating(false)
    }
  }

  const generateChapters = async () => {
    if (!tableOfContents) {
      alert('Please generate a table of contents first')
      return
    }

    setIsGenerating(true)
    try {
      // Here you would call the AI API to generate chapter structure
      // For now, we'll simulate the response
      setTimeout(() => {
        const chapterTitles = tableOfContents
          .split('\n')
          .filter((line) => line.match(/^\d+\./))
          .map((line, index) => ({
            id: (index + 1).toString(),
            title: line.replace(/^\d+\.\s*/, ''),
            content: '',
            order: index + 1,
          }))

        setChapters(chapterTitles)
        setCurrentStep('chapters')
        setIsGenerating(false)
      }, 1500)
    } catch (error) {
      console.error('Error generating chapters:', error)
      setIsGenerating(false)
    }
  }

  const saveChapter = () => {
    if (!currentChapter) return

    setChapters(
      chapters.map((chapter) => (chapter.id === currentChapter.id ? currentChapter : chapter))
    )
    setCurrentChapter(null)
  }

  const generateChapterContent = async (chapter: Chapter) => {
    setIsGenerating(true)
    try {
      // Here you would call the AI API to generate chapter content
      // For now, we'll simulate the response
      setTimeout(() => {
        const sampleContent = `This is the beginning of ${chapter.title}...

[AI-generated content would appear here based on the book description, type, and any uploaded reference materials]

The content would be tailored to the specific chapter and would incorporate the style and tone appropriate for a ${bookType} book.`

        setCurrentChapter({
          ...chapter,
          content: sampleContent,
        })
        setIsGenerating(false)
      }, 2000)
    } catch (error) {
      console.error('Error generating chapter content:', error)
      setIsGenerating(false)
    }
  }

  const compileBook = async () => {
    if (chapters.some((chapter) => !chapter.content)) {
      alert('Please complete all chapters before compiling')
      return
    }

    setIsGenerating(true)
    try {
      // Here you would compile the book into a PDF
      // For now, we'll simulate the response
      setTimeout(() => {
        const bookTitle = bookDescription.split('.')[0] || 'Untitled Book'
        const newBook: Book = {
          id: Date.now().toString(),
          title: bookTitle,
          description: bookDescription,
          bookType,
          targetPages,
          tableOfContents,
          chapters,
          created_at: new Date().toISOString(),
        }

        setSavedBooks([newBook, ...savedBooks])
        setCurrentStep('compile')
        setIsGenerating(false)
        alert(`Book "${bookTitle}" compiled successfully!`)
      }, 1500)
    } catch (error) {
      console.error('Error compiling book:', error)
      setIsGenerating(false)
    }
  }

  const downloadBook = (book: Book) => {
    const content = `${book.title}\n\n${book.description}\n\n${book.tableOfContents}\n\n${book.chapters.map((chapter) => `\n\n${chapter.title}\n\n${chapter.content}`).join('')}`

    const element = document.createElement('a')
    const file = new Blob([content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
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
              <BookOpen className="h-8 w-8 mr-3 text-green-500" />
              Ghost Writer
            </h1>
            <p className="text-gray-600">AI book writing assistant</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentStep === 'outline' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
          >
            <FileText className="h-4 w-4" />
            <span>1. Outline</span>
          </div>
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentStep === 'chapters' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
          >
            <BookOpen className="h-4 w-4" />
            <span>2. Chapters</span>
          </div>
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentStep === 'compile' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
          >
            <Download className="h-4 w-4" />
            <span>3. Compile</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Book Outline */}
          {currentStep === 'outline' && (
            <Card>
              <CardHeader>
                <CardTitle>Create Your Book Outline</CardTitle>
                <CardDescription>
                  Describe your book and let AI generate a structured outline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Book Type</label>
                  <select
                    value={bookType}
                    onChange={(e) => setBookType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fiction">Fictional Novel</option>
                    <option value="non-fiction">Non-Fictional Study</option>
                    <option value="white-paper">White Paper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Target Page Count</label>
                  <input
                    type="number"
                    value={targetPages}
                    onChange={(e) => setTargetPages(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Book Description</label>
                  <Textarea
                    value={bookDescription}
                    onChange={(e) => setBookDescription(e.target.value)}
                    placeholder="Describe your book idea, topic, target audience, and key points you want to cover..."
                    className="min-h-[200px]"
                  />
                </div>
                <div>
                  <Button
                    onClick={generateTableOfContents}
                    disabled={isGenerating || !bookDescription}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Table of Contents'}
                  </Button>
                </div>

                {tableOfContents && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Generated Table of Contents:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">{tableOfContents}</pre>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <Button onClick={() => setTableOfContents('')} variant="outline">
                        Regenerate
                      </Button>
                      <Button onClick={generateChapters}>Generate Chapters</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Chapter Writing */}
          {currentStep === 'chapters' && (
            <div className="space-y-6">
              {/* Chapter List */}
              <Card>
                <CardHeader>
                  <CardTitle>Chapters</CardTitle>
                  <CardDescription>Work on each chapter individually</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          currentChapter?.id === chapter.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentChapter(chapter)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{chapter.title}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              chapter.content
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {chapter.content ? 'Complete' : 'Empty'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chapter Editor */}
              {currentChapter && (
                <Card>
                  <CardHeader>
                    <CardTitle>Chapter: {currentChapter.title}</CardTitle>
                    <CardDescription>Write and edit this chapter</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => generateChapterContent(currentChapter)}
                        disabled={isGenerating}
                        variant="outline"
                      >
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                      </Button>
                      <Button onClick={saveChapter}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Chapter
                      </Button>
                    </div>
                    <Textarea
                      value={currentChapter.content}
                      onChange={(e) =>
                        setCurrentChapter({ ...currentChapter, content: e.target.value })
                      }
                      placeholder="Write your chapter content here..."
                      className="min-h-[400px]"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Compile Button */}
              {chapters.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        {chapters.filter((c) => c.content).length} of {chapters.length} chapters
                        completed
                      </p>
                      <Button
                        onClick={compileBook}
                        disabled={chapters.some((chapter) => !chapter.content)}
                        size="lg"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Compile Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Compile Results */}
          {currentStep === 'compile' && savedBooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Compiled Books</CardTitle>
                <CardDescription>Your completed books ready for download</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savedBooks.map((book) => (
                    <div key={book.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{book.title}</h3>
                        <span className="text-sm text-gray-500">{book.bookType}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{book.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {book.chapters.length} chapters, {book.targetPages} target pages
                        </span>
                        <Button size="sm" onClick={() => downloadBook(book)}>
                          <Download className="h-3 w-3 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Book Info */}
          <Card>
            <CardHeader>
              <CardTitle>Book Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Type</label>
                <p className="text-sm capitalize">{bookType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Target Pages</label>
                <p className="text-sm">{targetPages}</p>
              </div>
              {chapters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Progress</label>
                  <p className="text-sm">
                    {chapters.filter((c) => c.content).length} / {chapters.length} chapters
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(chapters.filter((c) => c.content).length / chapters.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Materials */}
          <Card>
            <CardHeader>
              <CardTitle>Reference Materials</CardTitle>
              <CardDescription>Upload supporting documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Upload research documents</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
