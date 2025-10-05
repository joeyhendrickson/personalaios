import OpenAI from 'openai'

interface SocialMediaPost {
  content: string
  timestamp: string
  platform: string
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
  }
}

interface VoiceProfile {
  tone: string
  writing_style: string
  common_themes: string[]
  language_patterns: {
    sentence_length: string
    vocabulary_level: string
    punctuation_style: string
  }
  engagement_style: string
  content_preferences: string[]
  brand_voice: string
}

interface VoiceAnalysisResult {
  voice_profile: VoiceProfile
  confidence_score: number
  sample_analysis: string[]
}

export class VoiceAnalyzer {
  private openai: OpenAI

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  async analyzeVoice(posts: SocialMediaPost[]): Promise<VoiceAnalysisResult> {
    try {
      // Combine posts for analysis
      const combinedContent = posts.map((post) => post.content).join('\n\n')

      const prompt = `
Analyze the following social media posts to extract the user's unique voice and writing style. Provide a comprehensive voice profile.

Posts to analyze:
${combinedContent}

Please analyze and provide:
1. Overall tone (professional, casual, humorous, serious, etc.)
2. Writing style characteristics
3. Common themes and topics
4. Language patterns (sentence length, vocabulary, punctuation)
5. Engagement style (how they interact with audience)
6. Content preferences
7. Brand voice characteristics

Return the analysis as a structured voice profile.
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at analyzing writing styles and extracting unique voice characteristics from social media content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      const analysisText = response.choices[0]?.message?.content || ''

      // Parse the response into structured data
      const voiceProfile = this.parseAnalysisResponse(analysisText)

      return {
        voice_profile: voiceProfile,
        confidence_score: 0.85, // Placeholder confidence score
        sample_analysis: this.extractSampleAnalysis(analysisText),
      }
    } catch (error) {
      console.error('Error analyzing voice:', error)
      throw error
    }
  }

  private parseAnalysisResponse(analysisText: string): VoiceProfile {
    // This is a simplified parser - in a real implementation, you'd want
    // more sophisticated parsing or ask the AI to return structured JSON

    return {
      tone: this.extractField(analysisText, 'tone') || 'conversational',
      writing_style: this.extractField(analysisText, 'writing style') || 'direct and engaging',
      common_themes: this.extractArray(analysisText, 'themes') || ['general topics'],
      language_patterns: {
        sentence_length: this.extractField(analysisText, 'sentence length') || 'varied',
        vocabulary_level: this.extractField(analysisText, 'vocabulary') || 'accessible',
        punctuation_style: this.extractField(analysisText, 'punctuation') || 'standard',
      },
      engagement_style:
        this.extractField(analysisText, 'engagement') || 'friendly and approachable',
      content_preferences: this.extractArray(analysisText, 'preferences') || [
        'informative content',
      ],
      brand_voice: this.extractField(analysisText, 'brand voice') || 'authentic and relatable',
    }
  }

  private extractField(text: string, fieldName: string): string | null {
    const regex = new RegExp(`${fieldName}[:\\s]+([^\\n]+)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }

  private extractArray(text: string, fieldName: string): string[] {
    const regex = new RegExp(`${fieldName}[:\\s]+([^\\n]+)`, 'i')
    const match = text.match(regex)
    if (match) {
      return match[1]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    }
    return []
  }

  private extractSampleAnalysis(analysisText: string): string[] {
    // Extract key insights from the analysis
    const lines = analysisText.split('\n').filter((line) => line.trim().length > 0)
    return lines.slice(0, 5) // Return first 5 meaningful lines
  }
}
