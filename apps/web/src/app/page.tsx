'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'
import { useQuery } from '@tanstack/react-query'
import { usersApi, matchesApi } from '@/lib/api'

export default function Home() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: usersApi.getProfile,
    staleTime: 5 * 60 * 1000,
  })

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list(),
    staleTime: 2 * 60 * 1000,
  })

  // Calculate member since
  const getMemberSince = () => {
    if (!user?.created_at) return 'N/A'
    const createdDate = new Date(user.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - createdDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} ${months === 1 ? 'month' : 'months'}`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      if (remainingMonths > 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
      }
      return `${years} ${years === 1 ? 'year' : 'years'}`
    }
  }

  const totalMatches = matches?.length || 0
  const analyzedMatches = matches?.filter((match: any) => 
    match.status === 'completed' || match.status === 'COMPLETED'
  ).length || 0

  const features = [
    {
      icon: '🎯',
      title: 'Shot Analysis',
      description: 'Automatic classification of forehands, backhands, volleys, and more',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '📊',
      title: 'Match Statistics',
      description: 'Comprehensive stats including winners, errors, and rally analysis',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: '🎾',
      title: 'Serve Analytics',
      description: 'Detailed serve analysis with placement, speed, and success rates',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: '🗺️',
      title: 'Heatmaps',
      description: 'Visual shot placement and movement patterns on the court',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: '🏃',
      title: 'Movement Tracking',
      description: 'Analyze footwork, court coverage, and movement efficiency',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: '🎬',
      title: 'Highlights',
      description: 'Automatically generated highlight reels of your best shots',
      color: 'from-yellow-500 to-orange-500',
    },
  ]

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-8rem)] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Section with Welcome and Stats */}
        <section className="relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-green-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
          
          <div className="relative container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Welcome Section - Takes 2 columns */}
              <div className="lg:col-span-2">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-3xl shadow-lg">
                      👋
                    </div>
                    <div>
                      <h1 className="text-4xl font-black text-gray-900 mb-1">
                        Welcome Back!
                      </h1>
                      <p className="text-lg text-gray-600">
                        {user?.username || 'Tennis Player'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-8 text-lg leading-relaxed">
                    Your AI-powered tennis performance coach is ready to help you improve your game with advanced analytics and insights.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/matches">
                      <Button 
                        size="lg"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <span className="mr-2 text-xl">🎾</span>
                        View Matches
                      </Button>
                    </Link>
                    <Link href="/upload">
                      <Button 
                        size="lg"
                        className="bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 font-bold px-8 py-6 text-base shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <span className="mr-2 text-xl">📤</span>
                        Upload Match
                      </Button>
                    </Link>
                    <Link href="/summary">
                      <Button 
                        size="lg"
                        className="bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-bold px-8 py-6 text-base shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <span className="mr-2 text-xl">📊</span>
                        View Summary
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick Stats - Takes 1 column */}
              <div className="space-y-4">
                {userLoading || matchesLoading ? (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 shadow-xl border border-blue-400/20 transform hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                          👤
                        </div>
                      </div>
                      <p className="text-white/80 text-sm font-medium mb-1">Member Since</p>
                      <p className="text-white text-2xl font-black">{getMemberSince()}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl border border-green-400/20 transform hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                          📤
                        </div>
                      </div>
                      <p className="text-white/80 text-sm font-medium mb-1">Matches Uploaded</p>
                      <p className="text-white text-3xl font-black">{totalMatches}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl border border-purple-400/20 transform hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                          ✅
                        </div>
                      </div>
                      <p className="text-white/80 text-sm font-medium mb-1">Matches Analyzed</p>
                      <p className="text-white text-3xl font-black">{analyzedMatches}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative container mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover comprehensive analytics and insights to take your tennis game to the next level
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} text-white text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-12"></div>
      </div>
    </AuthGuard>
  )
}

