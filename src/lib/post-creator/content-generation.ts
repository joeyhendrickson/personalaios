import OpenAI from 'openai'

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

interface PostGenerationParams {
  platform: string
  topic: string
  sentiment: string
  target_audience: string
  goal: string
  length_percentage: number
  include_hashtags: boolean
  include_call_to_action: boolean
}

interface GeneratedPost {
  title?: string
  content: string
  hashtags?: string[]
  call_to_action?: string
  engagement_score: number
  voice_match_score: number
}

export class ContentGenerator {
  private openai: OpenAI

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  async generatePost(
    voiceProfile: VoiceProfile,
    params: PostGenerationParams
  ): Promise<GeneratedPost> {
    try {
      const prompt = this.buildPrompt(voiceProfile, params)

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert content creator who can write in any voice and style. Generate authentic, engaging social media content that matches the provided voice profile exactly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      })

      const generatedContent = response.choices[0]?.message?.content || ''

      return this.parseGeneratedContent(generatedContent, params)
    } catch (error) {
      console.error('Error generating post:', error)
      throw error
    }
  }

  private buildPrompt(voiceProfile: VoiceProfile, params: PostGenerationParams): string {
    return `
Generate a ${params.platform} post based on the following requirements:

VOICE PROFILE (write exactly in this style):
- Tone: ${voiceProfile.tone}
- Writing Style: ${voiceProfile.writing_style}
- Common Themes: ${voiceProfile.common_themes.join(', ')}
- Language Patterns: ${voiceProfile.language_patterns.sentence_length} sentences, ${voiceProfile.language_patterns.vocabulary_level} vocabulary, ${voiceProfile.language_patterns.punctuation_style} punctuation
- Engagement Style: ${voiceProfile.engagement_style}
- Content Preferences: ${voiceProfile.content_preferences.join(', ')}
- Brand Voice: ${voiceProfile.brand_voice}

POST REQUIREMENTS:
- Topic: ${params.topic}
- Sentiment: ${params.sentiment}
- Target Audience: ${params.target_audience}
- Goal: ${params.goal}
- Length: ${params.length_percentage}% of typical post length
- Include Hashtags: ${params.include_hashtags ? 'Yes' : 'No'}
- Include Call to Action: ${params.include_call_to_action ? 'Yes' : 'No'}
- Platform: ${params.platform}

Generate content that:
1. Matches the voice profile exactly
2. Feels authentic and not AI-generated
3. Is appropriate for the platform
4. Achieves the specified goal
5. Engages the target audience

Return the post content only, without any explanations or metadata.
`
  }

  private parseGeneratedContent(content: string, params: PostGenerationParams): GeneratedPost {
    // Extract hashtags if present
    const hashtagRegex = /#\w+/g
    const hashtags = params.include_hashtags ? content.match(hashtagRegex) || [] : []

    // Remove hashtags from main content
    const cleanContent = content.replace(hashtagRegex, '').trim()

    // Extract potential call to action (look for action words)
    const ctaRegex =
      /(follow|subscribe|like|share|comment|click|visit|learn more|find out|discover)/i
    const callToAction =
      params.include_call_to_action && ctaRegex.test(cleanContent)
        ? cleanContent.match(ctaRegex)?.[0]
        : undefined

    return {
      content: cleanContent,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      call_to_action: callToAction,
      engagement_score: this.calculateEngagementScore(cleanContent),
      voice_match_score: this.calculateVoiceMatchScore(cleanContent),
    }
  }

  private calculateEngagementScore(content: string): number {
    // Simple engagement score calculation based on content characteristics
    let score = 50 // Base score

    if (content.includes('?')) score += 10 // Questions increase engagement
    if (content.length > 100 && content.length < 300) score += 15 // Optimal length
    if (content.includes('!')) score += 5 // Excitement
    if (content.includes('you') || content.includes('your')) score += 10 // Personal address

    return Math.min(100, Math.max(0, score))
  }

  private calculateVoiceMatchScore(content: string): number {
    // Simple voice match score - in reality this would be more sophisticated
    return 85 // Placeholder score
  }
}
