'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  onRatingChange: (rating: number) => void
  interactive?: boolean
  size?: 'sm' | 'md' | 'lg'
  showAverage?: boolean
  averageRating?: number
  totalRatings?: number
}

export default function RatingStars({
  rating,
  onRatingChange,
  interactive = true,
  size = 'md',
  showAverage = false,
  averageRating = 0,
  totalRatings = 0,
}: RatingStarsProps) {
  const [hoveredRating, setHoveredRating] = useState(0)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const handleStarClick = (starRating: number) => {
    if (interactive) {
      onRatingChange(starRating)
    }
  }

  const handleStarHover = (starRating: number) => {
    if (interactive) {
      setHoveredRating(starRating)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoveredRating(0)
    }
  }

  const displayRating = interactive ? hoveredRating || rating : rating

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => handleStarHover(star)}
          onMouseLeave={handleMouseLeave}
          disabled={!interactive}
          className={`transition-colors ${
            interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          } ${interactive ? '' : 'pointer-events-none'}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= displayRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            } transition-all duration-150`}
          />
        </button>
      ))}
      {showAverage && (
        <span className="ml-2 text-sm text-gray-600">
          {averageRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  )
}
