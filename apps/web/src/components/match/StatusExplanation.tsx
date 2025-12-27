'use client'

import { useState } from 'react'

export default function StatusExplanation() {
  const [isOpen, setIsOpen] = useState(false)

  const statuses = [
    {
      status: 'Uploading',
      icon: '📤',
      description: 'Video upload is in progress',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      status: 'Analyzing',
      icon: '🔍',
      description: 'Uploaded, but analytics is pending',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      status: 'Ready',
      icon: '✅',
      description: 'Upload complete and analytics available',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center text-xs text-white/80 hover:text-white transition-colors underline"
        aria-label="View status explanations"
      >
        <span className="mr-1">ℹ️</span>
        <span>What do these statuses mean?</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Match Status Guide</h3>
              <p className="text-xs text-gray-600 mt-1">Understanding match processing states</p>
            </div>
            
            <div className="p-4 space-y-3">
              {statuses.map((status) => (
                <div
                  key={status.status}
                  className={`p-3 rounded-lg border ${status.bgColor} ${status.borderColor}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{status.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${status.color}`}>
                          {status.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{status.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


