# Strategic Recommendations API Debug Guide

## Issue

The Strategic Recommendations API (`/api/ai/project-goal-alignment`) is returning a 500 Internal Server Error.

## Changes Made

### 1. Enhanced Error Handling

- Added detailed error logging throughout the entire API route
- All error messages now include stack traces and error details
- Each major step has a console log with `[Project-Goal-Alignment]` prefix for easy filtering

### 2. Null Safety Improvements

- Added `safeGoals`, `safeTasks`, `safeHabits`, `safePriorities` variables to handle null/undefined arrays
- All category fields now default to `'Uncategorized'` if null/undefined
- All title fields now default to `'Untitled'` if null/undefined
- All numeric fields use `|| 0` fallbacks

### 3. AI API Error Handling

- Wrapped OpenAI API call in try-catch with detailed error logging
- Errors now throw with descriptive messages instead of failing silently
- Added logging for AI response parsing failures

### 4. Debug Logging

The API now logs at each major step:

- `[Project-Goal-Alignment] Starting API call...`
- `[Project-Goal-Alignment] Getting authenticated user...`
- `[Project-Goal-Alignment] User authenticated: [user_id]`
- `[Project-Goal-Alignment] Fetching goals...`
- `[Project-Goal-Alignment] Goals fetched: [count]`
- `[Project-Goal-Alignment] Fetching tasks...`
- `[Project-Goal-Alignment] Tasks fetched: [count]`
- `[Project-Goal-Alignment] Fetching habits...`
- `[Project-Goal-Alignment] Habits fetched: [count]`
- `[Project-Goal-Alignment] Fetching priorities...`
- `[Project-Goal-Alignment] Priorities fetched: [count]`
- `[Project-Goal-Alignment] Calculating progress metrics...`
- `[Project-Goal-Alignment] Progress calculated: { totalTargetPoints, totalCurrentPoints, progressPercentage }`
- `[Project-Goal-Alignment] Calculating category points...`
- `[Project-Goal-Alignment] Category points calculated: [count] categories`
- `[Project-Goal-Alignment] Generating AI prompt...`
- `[Project-Goal-Alignment] Prompt generated, length: [length]`
- `Calling OpenAI API...`
- `OpenAI API call successful`
- `[Project-Goal-Alignment] Parsing AI response...`
- `[Project-Goal-Alignment] AI response parsed successfully`
- `[Project-Goal-Alignment] Returning assessment`

## How to Debug

### Step 1: Restart the Development Server

The changes won't take effect until you restart:

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

### Step 2: Open Browser Console

Open your browser's developer tools and watch the console for:

- Client-side error messages
- Network tab showing the 500 response

### Step 3: Check Server Logs

In your terminal where `npm run dev` is running, look for the `[Project-Goal-Alignment]` logs.

The logs will tell you exactly where the error is occurring:

- **If you see auth logs but no data fetch logs**: Authentication issue
- **If you see data fetch logs but no progress calculation logs**: Database query issue
- **If you see progress logs but no OpenAI logs**: Data processing error
- **If you see "Calling OpenAI API..." but no success message**: OpenAI API error
- **If you see "OpenAI API call successful" but error after**: JSON parsing error

### Step 4: Common Issues and Solutions

#### Issue: OpenAI API Key Invalid/Expired

**Symptom**: Error around "Calling OpenAI API..." step
**Solution**: Check your `.env.local` file for valid `OPENAI_API_KEY`

#### Issue: Database Query Failure

**Symptom**: Error during "Fetching [goals/tasks/habits/priorities]..." step
**Solution**: Check your Supabase connection and table schemas

#### Issue: Null/Undefined Data

**Symptom**: Error during "Calculating progress metrics..." or "Calculating category points..."
**Solution**: This should now be handled by the safe variables, but check the logs for the actual data structure

#### Issue: JSON Parsing Error

**Symptom**: Error after "OpenAI API call successful"
**Solution**: The AI response isn't valid JSON. Check the "Raw AI response" log to see what was returned.

## Testing the Fix

1. Open your application
2. Navigate to the dashboard
3. The strategic recommendations should load
4. Check your terminal logs to see the full execution flow

If you still see a 500 error, the terminal logs will now show you exactly where and why it's failing.

## Error Response Format

On error, the API now returns:

```json
{
  "error": "Internal server error",
  "details": "[Detailed error message]"
}
```

Check the network tab in browser dev tools to see this response.
