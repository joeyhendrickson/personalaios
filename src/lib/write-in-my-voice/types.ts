import type { VoiceMaterialType, VoiceSampleSourceType } from './constants'

export type VoiceLanguagePatterns = {
  sentence_length: string
  vocabulary_level: string
  punctuation_style: string
  formality: string
}

export type VoiceProfile = {
  tone: string
  writing_style: string
  common_themes: string[]
  signature_phrases: string[]
  language_patterns: VoiceLanguagePatterns
  engagement_style: string
  content_preferences: string[]
  personal_voice: string
  do_list: string[]
  avoid_list: string[]
}

export type VoiceSample = {
  id: string
  user_id: string
  source_type: VoiceSampleSourceType
  file_name: string
  content_text: string
  word_count: number
  metadata: Record<string, unknown>
  created_at: string
}

export type VoiceDraft = {
  id: string
  user_id: string
  material_type: VoiceMaterialType
  prompt: string
  title: string | null
  content: string
  voice_match_score: number | null
  cross_context_modules: string[]
  generation_params: Record<string, unknown>
  created_at: string
}

export type VoiceAnalysisResult = {
  voice_profile: VoiceProfile
  confidence_score: number
  sample_analysis: string[]
}

export type CrossContextBundle = {
  voiceCorpusExcerpts: string[]
  crossModuleContext: string
  relevantModules: string[]
}

export type GenerateVoiceContentInput = {
  userId: string
  openaiKey: string
  voiceProfile: VoiceProfile
  materialType: VoiceMaterialType
  prompt: string
  crossContext: CrossContextBundle
  route: string
}

export type GeneratedVoiceContent = {
  title?: string
  content: string
  voice_match_score: number
}
