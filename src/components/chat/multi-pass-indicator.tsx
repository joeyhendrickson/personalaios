'use client'

import { Zap, CheckCircle2, AlertCircle, Layers } from 'lucide-react'

type MultiPassInfo = {
  enabled: boolean
  totalPasses: number
  converged: boolean
  convergenceReason: 'max_passes' | 'no_new_chunks' | 'high_quality'
  totalUniqueChunks: number
  passes: Array<{
    passNumber: number
    query: string
    queryRefinement: string | null
    newChunksFound: number
    strongMatches: number
    avgScore: number
    durationMs: number
  }>
}

interface MultiPassIndicatorProps {
  multiPass?: MultiPassInfo
}

export function MultiPassIndicator({ multiPass }: MultiPassIndicatorProps) {
  if (!multiPass?.enabled) return null

  const getStatusIcon = () => {
    if (multiPass.convergenceReason === 'high_quality') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />
    }
    if (multiPass.convergenceReason === 'no_new_chunks') {
      return <AlertCircle className="w-4 h-4 text-amber-600" />
    }
    return <Layers className="w-4 h-4 text-blue-600" />
  }

  const getStatusLabel = () => {
    switch (multiPass.convergenceReason) {
      case 'high_quality':
        return 'High quality on first pass'
      case 'no_new_chunks':
        return 'Exhausted retrieval'
      case 'max_passes':
        return 'Reached max iterations'
      default:
        return 'Completed'
    }
  }

  return (
    <div className="border-l-2 border-blue-500 bg-blue-50/50 rounded px-3 py-2 text-sm">
      <div className="flex items-center gap-2 font-medium text-blue-900">
        <Zap className="w-4 h-4" />
        Multi-Pass Retrieval Active
      </div>
      <div className="mt-1.5 space-y-1 text-xs text-blue-800">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span>{getStatusLabel()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Passes: {multiPass.totalPasses}</span>
          <span>Unique chunks: {multiPass.totalUniqueChunks}</span>
        </div>
      </div>
    </div>
  )
}

interface MultiPassDetailsProps {
  multiPass?: MultiPassInfo
}

export function MultiPassDetails({ multiPass }: MultiPassDetailsProps) {
  if (!multiPass?.enabled) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Single-pass retrieval was used (confidence was sufficient).
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Multi-Pass Retrieval Trace</h4>
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
          {multiPass.totalPasses} passes
        </span>
      </div>

      <div className="space-y-2">
        {multiPass.passes.map((pass, i) => (
          <details
            key={i}
            className="border rounded-lg overflow-hidden"
            open={i === multiPass.passes.length - 1}
          >
            <summary className="cursor-pointer bg-gray-50 px-3 py-2 text-sm font-medium hover:bg-gray-100">
              <div className="flex items-center justify-between">
                <span>Pass {pass.passNumber}</span>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>+{pass.newChunksFound} new</span>
                  <span>{pass.strongMatches} strong</span>
                  <span className="text-gray-400">{pass.durationMs}ms</span>
                </div>
              </div>
            </summary>
            <div className="p-3 space-y-2 text-xs">
              <div>
                <div className="font-medium text-gray-700 mb-1">Query:</div>
                <div className="text-gray-600 italic bg-gray-50 p-2 rounded">
                  "{pass.query}"
                </div>
              </div>
              {pass.queryRefinement && (
                <div className="text-amber-700 text-xs">
                  <span className="font-medium">Refinement: </span>
                  {pass.queryRefinement}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t text-gray-600">
                <span>Avg score: {(pass.avgScore * 100).toFixed(0)}%</span>
                <span>Strong matches: {pass.strongMatches}</span>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="pt-2 border-t text-xs text-gray-600">
        <div className="flex items-center gap-2">
          {multiPass.converged ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>
            {multiPass.convergenceReason === 'high_quality' &&
              'Initial retrieval was high quality — stopped early'}
            {multiPass.convergenceReason === 'no_new_chunks' &&
              'No new relevant chunks found — converged'}
            {multiPass.convergenceReason === 'max_passes' &&
              'Reached maximum passes — used best available'}
          </span>
        </div>
      </div>
    </div>
  )
}
