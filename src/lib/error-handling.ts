// Comprehensive error handling utilities for the Personal AI OS

export interface AppError {
  code: string
  message: string
  details?: unknown
  timestamp: string
  userId?: string
  context?: string
}

export class PersonalAIError extends Error {
  public code: string
  public details?: unknown
  public context?: string
  public isOperational: boolean

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: unknown,
    context?: string,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'PersonalAIError'
    this.code = code
    this.details = details
    this.context = context
    this.isOperational = isOperational

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

// Error codes for different types of failures
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Data Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Database Operations
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',

  // External Services
  OPENAI_ERROR: 'OPENAI_ERROR',
  OPENAI_RATE_LIMIT: 'OPENAI_RATE_LIMIT',
  OPENAI_QUOTA_EXCEEDED: 'OPENAI_QUOTA_EXCEEDED',
  SUPABASE_ERROR: 'SUPABASE_ERROR',

  // Business Logic
  GOAL_ALIGNMENT_VIOLATION: 'GOAL_ALIGNMENT_VIOLATION',
  POINT_SUGGESTION_FAILED: 'POINT_SUGGESTION_FAILED',
  WEEK_ROLLOVER_FAILED: 'WEEK_ROLLOVER_FAILED',

  // System Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'Please log in to continue',
  [ERROR_CODES.FORBIDDEN]: "You don't have permission to perform this action",
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields',
  [ERROR_CODES.INVALID_FORMAT]: 'The format of your input is invalid',
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred. Please try again',
  [ERROR_CODES.RECORD_NOT_FOUND]: 'The requested item was not found',
  [ERROR_CODES.DUPLICATE_RECORD]: 'This item already exists',
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 'This action violates a system constraint',
  [ERROR_CODES.OPENAI_ERROR]: 'AI service is temporarily unavailable',
  [ERROR_CODES.OPENAI_RATE_LIMIT]: 'AI service is busy. Please try again in a moment',
  [ERROR_CODES.OPENAI_QUOTA_EXCEEDED]: 'AI service quota exceeded. Please try again later',
  [ERROR_CODES.SUPABASE_ERROR]: 'Database service is temporarily unavailable',
  [ERROR_CODES.GOAL_ALIGNMENT_VIOLATION]: "This task doesn't align with your current goals",
  [ERROR_CODES.POINT_SUGGESTION_FAILED]: 'Unable to suggest points. Please enter manually',
  [ERROR_CODES.WEEK_ROLLOVER_FAILED]: 'Weekly rollover failed. Please contact support',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again',
} as const

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: AppError[] = []

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // Log an error
  logError(error: AppError): void {
    this.errorLog.push(error)

    // In production, you might want to send this to an external logging service
    console.error('Personal AI OS Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      context: error.context,
      timestamp: error.timestamp,
      userId: error.userId,
    })

    // For critical errors, you might want to send alerts
    if (this.getErrorSeverity(error.code) === ErrorSeverity.CRITICAL) {
      this.sendCriticalErrorAlert(error)
    }
  }

  // Get user-friendly error message
  getUserFriendlyMessage(errorCode: string): string {
    return (
      ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] ||
      ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR]
    )
  }

  // Get error severity
  getErrorSeverity(errorCode: string): ErrorSeverity {
    const criticalErrors = [
      ERROR_CODES.DATABASE_ERROR,
      ERROR_CODES.SUPABASE_ERROR,
      ERROR_CODES.WEEK_ROLLOVER_FAILED,
    ]

    const highErrors = [
      ERROR_CODES.OPENAI_ERROR,
      ERROR_CODES.OPENAI_QUOTA_EXCEEDED,
      ERROR_CODES.SERVICE_UNAVAILABLE,
    ]

    const mediumErrors = [
      ERROR_CODES.OPENAI_RATE_LIMIT,
      ERROR_CODES.POINT_SUGGESTION_FAILED,
      ERROR_CODES.GOAL_ALIGNMENT_VIOLATION,
    ]

    if (criticalErrors.includes(errorCode as any)) return ErrorSeverity.CRITICAL

    if (highErrors.includes(errorCode as any)) return ErrorSeverity.HIGH

    if (mediumErrors.includes(errorCode as any)) return ErrorSeverity.MEDIUM
    return ErrorSeverity.LOW
  }

  // Send critical error alert (placeholder for external service integration)
  private sendCriticalErrorAlert(error: AppError): void {
    // In production, integrate with services like Sentry, PagerDuty, etc.
    console.error('CRITICAL ERROR ALERT:', error)
  }

  // Get recent errors
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errorLog
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }
}

// Utility functions for common error scenarios
export const createError = (
  code: string,
  message: string,
  details?: unknown,
  context?: string
): PersonalAIError => {
  return new PersonalAIError(message, code, details, context)
}

export const handleApiError = (error: unknown, context?: string): PersonalAIError => {
  if (error instanceof PersonalAIError) {
    return error
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const errorCode = (error as { code: string }).code
    switch (errorCode) {
      case 'PGRST116':
        return createError(ERROR_CODES.RECORD_NOT_FOUND, 'Record not found', error, context)
      case '23505':
        return createError(ERROR_CODES.DUPLICATE_RECORD, 'Duplicate record', error, context)
      case '23503':
        return createError(ERROR_CODES.CONSTRAINT_VIOLATION, 'Constraint violation', error, context)
      default:
        return createError(ERROR_CODES.DATABASE_ERROR, 'Database error', error, context)
    }
  }

  // Handle OpenAI errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    switch (status) {
      case 401:
        return createError(ERROR_CODES.OPENAI_ERROR, 'OpenAI authentication failed', error, context)
      case 429:
        return createError(
          ERROR_CODES.OPENAI_RATE_LIMIT,
          'OpenAI rate limit exceeded',
          error,
          context
        )
      case 500:
        return createError(ERROR_CODES.OPENAI_ERROR, 'OpenAI service error', error, context)
      default:
        return createError(ERROR_CODES.OPENAI_ERROR, 'OpenAI API error', error, context)
    }
  }

  // Handle network errors
  if (
    error &&
    typeof error === 'object' &&
    (('name' in error && (error as { name: string }).name === 'NetworkError') ||
      ('message' in error &&
        typeof (error as { message: string }).message === 'string' &&
        (error as { message: string }).message.includes('fetch')))
  ) {
    return createError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Network error', error, context)
  }

  // Default to internal error
  return createError(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred', error, context)
}

// GPT fallback mechanisms
export const createGPTFallback = (originalError: unknown, context: string) => {
  const fallbackError = createError(
    ERROR_CODES.OPENAI_ERROR,
    'AI service is temporarily unavailable. Please try again later.',
    originalError,
    context
  )

  ErrorHandler.getInstance().logError({
    code: fallbackError.code,
    message: fallbackError.message,
    details: fallbackError.details,
    context: fallbackError.context,
    timestamp: new Date().toISOString(),
  })

  return fallbackError
}

// Goal alignment validation
export const validateGoalAlignment = (
  taskTitle: string,
  taskDescription: string,
  goalTitle: string,
  goalDescription: string
): { isValid: boolean; reason?: string } => {
  // Simple keyword-based alignment check
  const taskText = `${taskTitle} ${taskDescription}`.toLowerCase()
  const goalText = `${goalTitle} ${goalDescription}`.toLowerCase()

  // Extract key concepts from goal
  const goalKeywords = goalText
    .split(' ')
    .filter((word) => word.length > 3)
    .filter(
      (word) =>
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were'].includes(word)
    )

  // Check if task contains any goal keywords
  const hasAlignment = goalKeywords.some((keyword) => taskText.includes(keyword))

  if (!hasAlignment) {
    return {
      isValid: false,
      reason: `Task "${taskTitle}" doesn't appear to align with goal "${goalTitle}". Consider revising the task or goal.`,
    }
  }

  return { isValid: true }
}
