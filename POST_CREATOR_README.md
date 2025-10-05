# Post Creator Tool - Setup Guide

## Overview

The Post Creator Tool is an AI-powered social media content generator that analyzes your historical posts from Facebook, LinkedIn, Instagram, and Reddit to understand your unique voice and create authentic content that doesn't sound AI-generated.

## Features

### Core Capabilities

- **Voice Analysis**: AI-powered analysis of your writing style, tone, and engagement patterns
- **Multi-Platform Support**: Generate posts for Facebook, LinkedIn, Instagram, and Reddit
- **Voice Matching**: Create content that authentically matches your personal voice
- **Platform Optimization**: Content optimized for each platform's best practices
- **Engagement Scoring**: AI-predicted engagement scores for generated posts

### Voice Analysis Components

- **Writing Style**: Tone, formality, humor level, emotional tone, sentence length, vocabulary complexity
- **Common Phrases**: Frequently used expressions and language patterns
- **Topic Interests**: Subject areas you frequently write about
- **Platform Preferences**: How you adapt your voice for different platforms
- **Engagement Patterns**: Question frequency, call-to-action usage, hashtag patterns, emoji usage

### Platform-Specific Features

- **LinkedIn**: Professional insights, industry discussions, long-form content
- **Facebook**: Personal stories, community engagement, medium-length posts
- **Instagram**: Visual storytelling, motivational content, hashtag optimization
- **Reddit**: Detailed explanations, community discussions, in-depth analysis

## Setup Instructions

### 1. Database Setup

Apply the database migration to create all necessary tables:

```sql
-- Run this in your Supabase SQL editor
-- File: create-post-creator-tables.sql
```

This creates:

- `post_creator_jobs` - Voice analysis job tracking
- `post_creator_voice_profiles` - Analyzed voice profiles
- `post_creator_posts` - Generated posts with scoring
- `post_creator_templates` - Reusable post templates (future)
- `post_creator_analytics` - Performance tracking (future)

### 2. Environment Variables

Uses the same environment variables as Project Plan Builder and RAID Monitoring Tool:

```env
# Google OAuth (required for Drive integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/project-plan-builder/auth/google/callback

# Encryption key for user credentials
ENCRYPTION_KEY=your_secure_encryption_key_here

# OpenAI API key (optional - users can provide their own)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Dependencies

Uses the same dependencies as other Business Hacks apps:

```bash
npm install @pinecone-database/pinecone googleapis openai uuid
npm install --save-dev @types/uuid
```

## User Workflow

### Step 1: Export Your Social Media Data

1. **Facebook**: Settings & Privacy → Your Facebook Information → Download Your Information
2. **LinkedIn**: Settings & Privacy → Data Privacy → Get a Copy of Your Data
3. **Instagram**: Settings → Security → Download Your Information
4. **Reddit**: Preferences → Privacy & Security → Download Your Data

### Step 2: Upload to Google Drive

1. Create a folder in Google Drive
2. Upload all your exported social media data files
3. Copy the folder URL for analysis

### Step 3: Analyze Your Voice

1. Navigate to Business Hacks → Post Creator
2. Paste your Google Drive folder URL
3. Click "Analyze My Voice"
4. Monitor progress and review your voice profile

### Step 4: Generate Posts

1. Select target platform (Facebook, LinkedIn, Instagram, Reddit)
2. Enter post topic, target audience, and goals
3. Choose sentiment/tone and post length
4. Configure hashtags and call-to-action options
5. Generate authentic posts in your voice

### Step 5: Review and Use

1. Review generated posts with voice match and engagement scores
2. Copy posts for use on social media
3. Track performance and refine voice profile over time

## Technical Architecture

### Frontend Components

- **Analyze Voice Tab**: Upload and analysis progress tracking
- **Generate Post Tab**: Post configuration and generation
- **Generated Posts Tab**: Review and manage created content
- **Settings Tab**: Connection status and configuration

### API Routes

- `/api/post-creator/analyze` - Start voice analysis from Google Drive
- `/api/post-creator/analysis` - Monitor analysis job progress
- `/api/post-creator/generate` - Generate posts with voice matching
- `/api/post-creator/posts` - Manage generated posts

### Voice Profile Data Model

```typescript
interface VoiceProfile {
  writing_style: {
    tone: string // professional-friendly, casual, etc.
    formality: string // formal, semi-formal, casual
    humor_level: number // 0.0 - 1.0
    emotional_tone: string // encouraging, analytical, etc.
    sentence_length: string // short, medium, long
    vocabulary_complexity: string // basic, intermediate, advanced
  }
  common_phrases: string[] // Frequently used expressions
  topics_interests: string[] // Subject areas you write about
  platform_preferences: {
    facebook: PlatformStyle
    linkedin: PlatformStyle
    instagram: PlatformStyle
    reddit: PlatformStyle
  }
  engagement_patterns: {
    question_frequency: number // 0.0 - 1.0
    call_to_action_usage: number // 0.0 - 1.0
    hashtag_usage: number // 0.0 - 1.0
    emoji_usage: number // 0.0 - 1.0
  }
  confidence_score: number // 0.0 - 1.0
}
```

### Generated Post Data Model

```typescript
interface GeneratedPost {
  id: string
  platform: string
  content: string
  title?: string
  hashtags: string[]
  call_to_action?: string
  engagement_score: number // 1 - 10
  voice_match_score: number // 0.0 - 1.0
  generation_params: {
    topic: string
    sentiment: string
    target_audience: string
    goal: string
    length_percentage: number
    include_hashtags: boolean
    include_call_to_action: boolean
  }
  created_at: string
}
```

## Voice Matching Algorithm

### Content Analysis

1. **Phrase Matching**: Identifies common phrases from voice profile in generated content
2. **Style Consistency**: Matches tone, formality, and emotional characteristics
3. **Length Optimization**: Adapts content length to platform preferences
4. **Engagement Patterns**: Incorporates typical question frequency and CTA usage

### Scoring System

- **Voice Match Score**: 0.0 - 1.0 based on phrase matching and style consistency
- **Engagement Score**: 1 - 10 based on content length, hashtags, CTAs, and questions
- **Platform Optimization**: Content adapted for each platform's best practices

## Platform-Specific Optimization

### LinkedIn

- **Length**: 150-300 characters optimal
- **Style**: Professional insights, industry discussions
- **Structure**: Problem-solution, insights, call-to-action
- **Hashtags**: 3-5 professional hashtags

### Facebook

- **Length**: 100-250 characters optimal
- **Style**: Personal stories, community engagement
- **Structure**: Storytelling, personal experiences
- **Hashtags**: 2-4 community-focused hashtags

### Instagram

- **Length**: 80-200 characters optimal
- **Style**: Visual storytelling, motivational content
- **Structure**: Short, punchy, emoji-enhanced
- **Hashtags**: 5-10 relevant hashtags

### Reddit

- **Length**: 200+ characters optimal
- **Style**: Detailed explanations, community discussions
- **Structure**: In-depth analysis, thoughtful questions
- **Hashtags**: None (Reddit doesn't use hashtags)

## Integration with Existing Apps

### Shared Infrastructure

- **Credentials**: Uses same Google Drive, Pinecone, OpenAI credentials
- **Security**: Same BYOK model with AES-GCM encryption
- **Database**: Integrated with existing user management
- **UI Components**: Consistent design with other Business Hacks apps

### Future Enhancements

- **Template Library**: Save and reuse successful post formats
- **Performance Analytics**: Track engagement of generated posts
- **A/B Testing**: Generate multiple versions for testing
- **Content Calendar**: Schedule and plan content in advance
- **Cross-Platform Publishing**: Direct posting to social platforms

## Security & Privacy

### Data Protection

- **Encrypted Storage**: All credentials encrypted with AES-GCM
- **User Isolation**: Complete data separation between users
- **Temporary Processing**: Social media data processed and then discarded
- **No Data Sharing**: Voice profiles never shared between users

### Privacy Controls

- **Data Deletion**: Users can delete all voice analysis data
- **Export Control**: Users control what data is analyzed
- **Transparency**: Clear indication of what data is processed
- **Compliance**: GDPR and CCPA compliant data handling

## Troubleshooting

### Common Issues

**Voice Analysis Failures**

- Verify Google Drive folder contains social media export files
- Check file formats are supported (JSON, CSV, TXT)
- Ensure sufficient content for analysis (minimum 50 posts recommended)

**Post Generation Issues**

- Complete voice analysis before generating posts
- Provide clear topic, audience, and goal descriptions
- Check OpenAI API key is configured correctly

**Low Voice Match Scores**

- Ensure sufficient historical content for analysis
- Verify exported data includes post content (not just metadata)
- Consider re-running voice analysis with more data

### Debug Mode

Enable debug logging:

```env
DEBUG=post-creator:*
```

## Performance Considerations

### Scalability

- **Efficient Processing**: Chunked text processing for large datasets
- **Background Jobs**: Non-blocking voice analysis processing
- **Caching**: Voice profiles cached for fast post generation
- **Rate Limiting**: API rate limiting for OpenAI requests

### Optimization

- **Vector Storage**: Pinecone integration for semantic voice matching
- **Smart Chunking**: Intelligent text segmentation for analysis
- **Batch Processing**: Efficient processing of multiple posts
- **Progressive Analysis**: Incremental voice profile building

## Success Criteria

### User Experience

- ✅ Voice analysis completes successfully from Google Drive data
- ✅ Generated posts sound authentic and match user's voice
- ✅ Platform-specific optimization works correctly
- ✅ Voice match scores consistently above 80%
- ✅ Engagement scores provide useful predictions

### Technical Performance

- ✅ Voice analysis completes within 10 minutes
- ✅ Post generation responds within 30 seconds
- ✅ All operations use user's BYOK credentials
- ✅ Data isolation maintained across all users
- ✅ System scales to handle multiple concurrent users

The Post Creator Tool provides authentic social media content generation that maintains your unique voice while optimizing for platform-specific best practices and engagement.
