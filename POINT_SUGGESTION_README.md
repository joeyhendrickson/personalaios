# Intelligent Point Suggestion System

## Overview

The Intelligent Point Suggestion System uses machine learning techniques to analyze past completed tasks and suggest appropriate point values for new tasks. This reduces user friction and increases trust by providing data-driven recommendations based on historical patterns.

## 🧠 How It Works

### 1. **Trigram Similarity Search**
- Breaks down task titles and descriptions into 3-word sequences (trigrams)
- Calculates Jaccard similarity between new tasks and completed tasks
- Finds the most similar historical tasks for point value analysis

### 2. **Confidence-Based Recommendations**
- **High Confidence**: Based on 3+ similar completed tasks
- **Medium Confidence**: Based on 1-2 similar completed tasks  
- **Low Confidence**: Falls back to category-based defaults

### 3. **Category-Based Fallbacks**
Each category has default point ranges based on complexity:
- **Health**: Low (3), Medium (6), High (12)
- **Productivity**: Low (2), Medium (5), High (10)
- **Learning**: Low (4), Medium (8), High (15)
- **Financial**: Low (3), Medium (7), High (14)
- **Personal**: Low (2), Medium (4), High (8)
- **Other**: Low (3), Medium (6), High (12)

### 4. **Complexity Estimation**
Automatically estimates task complexity based on keywords:
- **High Complexity**: build, create, develop, implement, design, analyze, research
- **Low Complexity**: check, review, read, watch, call, email, send, update
- **Medium Complexity**: Default for tasks that don't clearly fit high/low

## 🔧 Technical Implementation

### API Endpoint: `/api/suggest-points`

**Request:**
```json
{
  "title": "Go for a 30-minute run",
  "description": "Morning jog around the neighborhood",
  "category": "health"
}
```

**Response:**
```json
{
  "suggested_points": 6,
  "reasoning": "Based on 3 similar completed tasks",
  "confidence": "high",
  "similar_tasks_count": 3,
  "similar_tasks": [
    {
      "title": "Morning jog in the park",
      "points": 5,
      "similarity": 85
    },
    {
      "title": "30-minute run around the block",
      "points": 6,
      "similarity": 78
    }
  ],
  "category_defaults": {
    "low": 3,
    "medium": 6,
    "high": 12
  }
}
```

### React Hook: `usePointSuggestion`

```typescript
const { suggestPoints, isLoading, error } = usePointSuggestion();

const suggestion = await suggestPoints(
  "Go for a 30-minute run",
  "Morning jog around the neighborhood",
  "health"
);
```

### UI Components

#### 1. **PointSuggestion Component**
- Automatically suggests points as user types
- Shows confidence level and reasoning
- Displays similar tasks for transparency
- One-click acceptance of suggestions

#### 2. **PointSuggestionButton Component**
- Manual trigger for point suggestions
- Useful in chat interfaces or quick actions
- Shows loading state and error handling

## 🎯 User Experience

### In Task Creation Form
1. User starts typing a task title
2. System automatically analyzes similar tasks (debounced 500ms)
3. Suggestion card appears with:
   - Suggested point value
   - Confidence level (high/medium/low)
   - Reasoning explanation
   - Similar tasks (expandable)
4. User can accept suggestion with one click

### Visual Indicators
- **High Confidence**: Green badge with trending up icon
- **Medium Confidence**: Yellow badge with target icon  
- **Low Confidence**: Gray badge with users icon

### Transparency Features
- Shows number of similar tasks found
- Displays actual similar tasks with similarity percentages
- Explains reasoning for each suggestion
- Shows category defaults as fallback reference

## 📊 Algorithm Details

### Trigram Generation
```typescript
function generateTrigrams(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const words = normalized.split(' ');
  const trigrams: string[] = [];
  
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  
  return trigrams;
}
```

### Similarity Calculation
```typescript
function calculateSimilarity(trigrams1: string[], trigrams2: string[]): number {
  const set1 = new Set(trigrams1);
  const set2 = new Set(trigrams2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}
```

### Point Suggestion Logic
1. **Find Similar Tasks**: Get tasks with >10% similarity
2. **Calculate Median**: Use median of similar task points (if 3+ matches)
3. **Calculate Average**: Use average of similar task points (if 1-2 matches)
4. **Category Fallback**: Use category defaults based on complexity
5. **Adjust for Length**: ±10% based on task description length
6. **Boundary Check**: Ensure points are between 1-20

## 🚀 Performance Optimizations

- **Debounced Requests**: 500ms delay to avoid excessive API calls
- **Limited History**: Only analyzes last 100 completed tasks
- **Caching**: Suggestions cached per session
- **Efficient Similarity**: Jaccard similarity is O(n) complexity
- **Minimal Trigram Sets**: Only stores unique trigrams

## 🔮 Future Enhancements

### 1. **Embeddings-Based Similarity**
- Use sentence transformers for semantic similarity
- Better understanding of task meaning vs. exact word matches
- More accurate similarity scores

### 2. **Machine Learning Model**
- Train on user's historical point assignments
- Learn individual user preferences and patterns
- Improve suggestions over time

### 3. **Context Awareness**
- Consider time of day, day of week
- Factor in user's current goal progress
- Adjust suggestions based on goal urgency

### 4. **Advanced Analytics**
- Track suggestion acceptance rates
- A/B test different algorithms
- Provide insights on user productivity patterns

## 🧪 Testing

### Test Endpoint: `/api/suggest-points/test`
Returns system status and sample data for testing.

### Manual Testing
1. Create several tasks with different point values
2. Complete them to build historical data
3. Create new similar tasks and verify suggestions
4. Test edge cases (very short/long descriptions, unusual categories)

## 📈 Benefits

### For Users
- **Reduced Friction**: No more guessing point values
- **Increased Trust**: Data-driven suggestions feel more reliable
- **Learning**: See how similar tasks were valued
- **Consistency**: More consistent point assignments over time

### For the System
- **Better Data Quality**: More accurate point values in the database
- **User Engagement**: Faster task creation process
- **Analytics**: Rich data on task patterns and user behavior
- **Scalability**: System improves as more data is collected

## 🔧 Configuration

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Database access

### Customization Options
- Adjust similarity threshold (currently 10%)
- Modify category defaults
- Change complexity keywords
- Update point boundaries (currently 1-20)

The Intelligent Point Suggestion System transforms task creation from a guessing game into a data-driven, user-friendly experience that builds trust and reduces friction! 🎯
