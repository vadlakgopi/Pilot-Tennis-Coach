'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      router.push('/')
    }
  }, [router])

  const login = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.access_token)
        if (data.user) {
          localStorage.setItem('user_info', JSON.stringify(data.user))
        }
        // Use requestAnimationFrame to ensure token is committed before navigation
        requestAnimationFrame(() => {
          router.push('/')
          router.refresh()
        })
      }
    },
    onError: (error: any) => {
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')
      const isNetwork = error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK'
      if (isTimeout || isNetwork) {
        setError('Connection timeout. Ensure the API server is running (default: http://localhost:8000) and try again.')
      } else {
        setError('Invalid username or password. Please try again.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username || !password) return
    login.mutate({ username, password })
  }

  return (
    <div className="h-full w-full relative overflow-hidden flex items-center justify-center">
      {/* Full Page - Tennis Image with Analytics Overlay */}
      <div className="w-full h-full relative">
        {/* Background Image - pointer-events-none so clicks pass through */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/images/tennis_court_heatmap.png"
            alt="Tennis court with heatmap analytics"
            fill
            className="object-cover"
            priority
            quality={90}
          />
        </div>
        
        {/* Dark overlay - pointer-events-none so clicks pass through to content */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40 pointer-events-none"></div>

        {/* Analytics Overlays - isolate so z-index works correctly */}
        <div className="relative z-[100] w-full h-full p-4 flex flex-col isolate">
          {/* Top - Match Stats */}
          <div className="flex justify-center mb-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-purple-500 shadow-xl">
              <div className="text-center">
                <div className="text-sm font-black text-gray-900 mb-2 flex items-center justify-center gap-2">
                  <span>📊</span>
                  <span>Match Analytics</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="font-bold text-gray-600 text-sm">Rallies</div>
                    <div className="text-xl font-black text-purple-600">156</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 text-sm">Points</div>
                    <div className="text-xl font-black text-purple-600">48</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 text-sm">Duration</div>
                    <div className="text-xl font-black text-purple-600">2h 15m</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Player Stats Inside Court + Get Started Button */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* Player 1 - Left Side Inside Court */}
            <div className="absolute left-8 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-blue-500 shadow-xl pointer-events-none">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">👤</span>
                <span className="font-bold text-sm text-gray-900">Player 1</span>
              </div>
              
              {/* Shot Types */}
              <div className="mb-3">
                <div className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Shot Types</span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  <div>Forehand: <span className="font-semibold text-blue-600">45%</span></div>
                  <div>Backhand: <span className="font-semibold text-blue-600">32%</span></div>
                  <div>Volley: <span className="font-semibold text-blue-600">15%</span></div>
                  <div>Serve: <span className="font-semibold text-blue-600">8%</span></div>
                </div>
              </div>

              {/* Movement */}
              <div>
                <div className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <span>🏃</span>
                  <span>Movement</span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  <div>Coverage: <span className="font-semibold text-blue-600">78%</span></div>
                  <div>Avg: <span className="font-semibold text-blue-600">8.2 km/h</span></div>
                  <div>Peak: <span className="font-semibold text-blue-600">12.5 km/h</span></div>
                  <div>Changes: <span className="font-semibold text-blue-600">142</span></div>
                </div>
              </div>
            </div>

            {/* Get Started / Login Form - Center. Uses :target so form appears without JavaScript */}
            <div className="relative z-[100] login-toggle">
              <div id="login-form">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-blue-500 p-8 w-96">
                  <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 mb-2 block">
                    ← Back
                  </Link>
                  <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">Sign In</h3>
                  
                  {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. testuser"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                        autoComplete="username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={login.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 text-lg"
                    >
                      {login.isPending ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  <div className="mt-4 text-sm text-gray-500 text-center">
                    Test: <code className="bg-gray-100 px-2 py-1 rounded">testuser / testpassword123</code>
                  </div>
                </div>
              </div>
              <div id="get-started" className="login-get-started">
                <a
                  href="#login-form"
                  className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-2xl px-12 py-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 border-4 border-white/50 backdrop-blur-sm cursor-pointer no-underline"
                >
                  Get Started
                </a>
              </div>
            </div>

            {/* Player 2 - Right Side Inside Court */}
            <div className="absolute right-8 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-green-500 shadow-xl pointer-events-none">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">👤</span>
                <span className="font-bold text-sm text-gray-900">Player 2</span>
              </div>
              
              {/* Shot Types */}
              <div className="mb-3">
                <div className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Shot Types</span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  <div>Forehand: <span className="font-semibold text-green-600">38%</span></div>
                  <div>Backhand: <span className="font-semibold text-green-600">42%</span></div>
                  <div>Volley: <span className="font-semibold text-green-600">12%</span></div>
                  <div>Serve: <span className="font-semibold text-green-600">8%</span></div>
                </div>
              </div>

              {/* Movement */}
              <div>
                <div className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <span>🏃</span>
                  <span>Movement</span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  <div>Coverage: <span className="font-semibold text-green-600">72%</span></div>
                  <div>Avg: <span className="font-semibold text-green-600">7.8 km/h</span></div>
                  <div>Peak: <span className="font-semibold text-green-600">11.9 km/h</span></div>
                  <div>Changes: <span className="font-semibold text-green-600">128</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom - Features Row */}
          <div className="flex justify-center gap-3 flex-wrap mt-4">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-blue-500 shadow-lg">
              <div className="text-xl mb-1 text-center">🎯</div>
              <div className="text-xs font-bold text-gray-900 text-center">Shot Analysis</div>
              <div className="text-xs text-gray-600 text-center">Auto classification</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-purple-500 shadow-lg">
              <div className="text-xl mb-1 text-center">📊</div>
              <div className="text-xs font-bold text-gray-900 text-center">Statistics</div>
              <div className="text-xs text-gray-600 text-center">Comprehensive stats</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-green-500 shadow-lg">
              <div className="text-xl mb-1 text-center">🎾</div>
              <div className="text-xs font-bold text-gray-900 text-center">Serve Analytics</div>
              <div className="text-xs text-gray-600 text-center">Placement & speed</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-orange-500 shadow-lg">
              <div className="text-xl mb-1 text-center">🗺️</div>
              <div className="text-xs font-bold text-gray-900 text-center">Heatmaps</div>
              <div className="text-xs text-gray-600 text-center">Visual insights</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-indigo-500 shadow-lg">
              <div className="text-xl mb-1 text-center">🏃</div>
              <div className="text-xs font-bold text-gray-900 text-center">Movement</div>
              <div className="text-xs text-gray-600 text-center">Court coverage</div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-yellow-500 shadow-lg">
              <div className="text-xl mb-1 text-center">🎬</div>
              <div className="text-xs font-bold text-gray-900 text-center">Highlights</div>
              <div className="text-xs text-gray-600 text-center">Auto-generated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
