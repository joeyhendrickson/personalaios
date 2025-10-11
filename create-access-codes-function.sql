-- Create the create_access_code function for the admin dashboard
-- This function generates unique access codes and inserts them into the access_codes table

CREATE OR REPLACE FUNCTION create_access_code(
    code_name TEXT,
    code_email TEXT DEFAULT NULL,
    expires_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    id UUID,
    code TEXT,
    name TEXT,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
    new_id UUID;
    expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate a unique 8-character code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Ensure code is unique
    WHILE EXISTS (SELECT 1 FROM access_codes WHERE code = new_code) LOOP
        new_code := upper(substring(md5(random()::text) from 1 for 8));
    END LOOP;
    
    -- Calculate expiration date
    expires_date := NOW() + (expires_days || ' days')::INTERVAL;
    
    -- Generate new UUID
    new_id := gen_random_uuid();
    
    -- Insert the new access code
    INSERT INTO access_codes (
        id,
        code,
        name,
        email,
        expires_at,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        new_id,
        new_code,
        code_name,
        code_email,
        expires_date,
        true,
        NOW(),
        NOW()
    );
    
    -- Return the created code details
    RETURN QUERY
    SELECT 
        ac.id,
        ac.code,
        ac.name,
        ac.email,
        ac.expires_at,
        ac.created_at
    FROM public.access_codes ac
    WHERE ac.id = new_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Failed to create access code: %', SQLERRM;
END;
$$;

-- Test the function
SELECT 'Access code function created successfully' as status;

-- Verify the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'create_access_code' 
AND routine_schema = 'public';
