# ChatGPT Integration - Personal AI OS

## Overview

The ChatGPT integration adds an intelligent conversational layer to your Personal AI OS, allowing users to interact with their productivity system through natural language. The AI acts as a productivity advisor, helping users align tasks with goals, suggest appropriate point values, and maintain momentum.

## Features

### 🤖 Intelligent Productivity Advisor

- **Goal Alignment**: Always ensures tasks are linked to weekly goals
- **Point Suggestions**: Recommends appropriate point values based on task complexity
- **Progress Tracking**: Monitors weekly progress and celebrates achievements
- **Motivational Support**: Provides encouragement and actionable advice

### 💬 Conversational Interface

- **Streaming Responses**: Real-time AI responses for natural conversation flow
- **Quick Actions**: One-click buttons for common tasks (+ Goal, + Task, Suggest Points, Today Plan)
- **Confirmation Chips**: Visual feedback when actions are completed successfully
- **Context Awareness**: Remembers conversation history and user preferences

### 🔧 Function Calling

The AI can directly interact with your data through these functions:

1. **create_goal**: Creates new weekly goals with target points
2. **create_task**: Adds tasks linked to specific goals
3. **complete_task**: Marks tasks as completed with optional notes
4. **suggest_points**: Recommends point values based on task complexity
5. **get_weekly_dashboard**: Retrieves current progress and goal data

## Setup

### 1. Environment Variables

Add your OpenAI API key to `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Dependencies

The following packages are already installed:

- `openai`: OpenAI API client
- `ai`: Vercel AI SDK for streaming responses

### 3. API Endpoint

The chat API is available at `/api/chat` and handles:

- Streaming text responses
- Function calling to backend operations
- Error handling and validation

## Usage

### Accessing the Chat Interface

1. The chat interface appears as a floating button in the bottom-right corner
2. Click the button to expand the chat window
3. Start typing to interact with your productivity advisor

### Quick Actions

Use the quick action buttons for common tasks:

- **+ Goal**: Create a new weekly goal
- **+ Task**: Add a new task to an existing goal
- **Suggest Points**: Get point recommendations for a task
- **Today Plan**: Get help planning your day

### Example Conversations

**Creating a Goal:**

```
User: "I want to focus on learning React this week"
AI: "Great! Let me help you create a learning goal. What specific React topics do you want to focus on? I'll suggest an appropriate target point value based on your learning objectives."
```

**Adding a Task:**

```
User: "I need to complete a React tutorial"
AI: "I'll help you add that task! Which of your current goals should this tutorial be linked to? I'll also suggest an appropriate point value based on the tutorial's complexity."
```

**Getting Point Suggestions:**

```
User: "How many points should 'Build a todo app' be worth?"
AI: "Based on the complexity of building a todo app, I'd suggest 8-12 points. This accounts for the planning, implementation, and testing phases. Would you like me to create this task for you?"
```

## System Prompt

The AI follows a comprehensive system prompt that ensures:

- Tasks are always aligned with weekly goals
- Point suggestions are realistic and motivating
- Responses are encouraging and actionable
- Users receive personalized advice based on their data

## Technical Architecture

### Chat API (`/api/chat/route.ts`)

- Uses OpenAI GPT-4o with function calling
- Implements streaming responses for real-time interaction
- Maps function calls to Supabase operations
- Handles error cases gracefully

### Chat Interface (`/components/chat/chat-interface.tsx`)

- Floating chat widget with expand/collapse functionality
- Quick action buttons for common tasks
- Confirmation chips for completed actions
- Responsive design with proper scrolling

### Chat Provider (`/components/chat/chat-provider.tsx`)

- Context provider for chat functionality
- Integrates with current week tracking
- Handles refresh callbacks for data updates

### Current Week Hook (`/hooks/use-current-week.ts`)

- Manages current week ID for goal/task creation
- Automatically creates new weeks when needed
- Provides loading states for UI feedback

## Error Handling

The system includes comprehensive error handling:

- API failures are caught and reported to users
- Invalid function calls are handled gracefully
- Network issues show appropriate error messages
- Fallback responses when AI is unavailable

## Security

- OpenAI API key is stored securely in environment variables
- Supabase operations use service role key for backend access
- User data is validated before database operations
- No sensitive data is logged or exposed

## Future Enhancements

Potential improvements for the chat integration:

- **Voice Input**: Add speech-to-text capabilities
- **Smart Notifications**: Proactive reminders and suggestions
- **Analytics**: Track conversation patterns and user engagement
- **Custom Prompts**: Allow users to customize AI behavior
- **Integration**: Connect with external productivity tools

## Testing

Test the chat integration:

1. Visit `/api/chat/test` to verify API connectivity
2. Check environment variables are properly set
3. Try creating goals and tasks through the chat interface
4. Verify confirmation chips appear for completed actions

## Troubleshooting

**Chat not responding:**

- Check OpenAI API key is valid and has credits
- Verify environment variables are loaded correctly
- Check browser console for JavaScript errors

**Functions not working:**

- Ensure Supabase credentials are correct
- Verify database schema matches expected structure
- Check network connectivity to Supabase

**UI issues:**

- Clear browser cache and reload
- Check for CSS conflicts
- Verify all dependencies are installed

The ChatGPT integration transforms your Personal AI OS into an intelligent, conversational productivity companion that helps users stay focused and achieve their goals!
