-- Migration: Add Dream Catcher assessment data to user profiles
-- This allows the assessment data to be stored in the user's profile and referenced in future AI conversations

-- Add assessment_data column to profiles table if it doesn't exist
-- This will store the latest Dream Catcher assessment data
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'assessment_data'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN assessment_data JSONB DEFAULT '{}';
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.profiles.assessment_data IS 'Stores Dream Catcher assessment data including personality traits, personal insights, executive skills, dreams, vision, and goals. Updated when user saves Dream Catcher progress.';
  END IF;
END $$;

-- Create index for faster queries on assessment_data
CREATE INDEX IF NOT EXISTS idx_profiles_assessment_data ON public.profiles USING GIN (assessment_data);

-- If user_profiles table exists, also add it there as a backup
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'assessment_data'
    ) THEN
      ALTER TABLE public.user_profiles 
      ADD COLUMN assessment_data JSONB DEFAULT '{}';
      
      COMMENT ON COLUMN public.user_profiles.assessment_data IS 'Stores Dream Catcher assessment data including personality traits, personal insights, executive skills, dreams, vision, and goals.';
      
      CREATE INDEX IF NOT EXISTS idx_user_profiles_assessment_data ON public.user_profiles USING GIN (assessment_data);
    END IF;
  END IF;
END $$;

