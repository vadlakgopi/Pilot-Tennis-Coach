import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  const features = [
    {
      icon: '🎯',
      title: 'Shot Analysis',
      description: 'Automatic classification of forehands, backhands, volleys, and more',
    },
    {
      icon: '📊',
      title: 'Match Statistics',
      description: 'Comprehensive stats including winners, errors, and rally analysis',
    },
    {
      icon: '🎾',
      title: 'Serve Analytics',
      description: 'Detailed serve analysis with placement, speed, and success rates',
    },
    {
      icon: '🗺️',
      title: 'Heatmaps',
      description: 'Visual shot placement and movement patterns on the court',
    },
    {
      icon: '🏃',
      title: 'Movement Tracking',
      description: 'Analyze footwork, court coverage, and movement efficiency',
    },
    {
      icon: '🎬',
      title: 'Highlights',
      description: 'Automatically generated highlight reels of your best shots',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section with Tennis Court Background */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-600 text-white">
        {/* Tennis Court Background Image */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(/tennis-court-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="container mx-auto px-4 py-16 md:py-20 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-block mb-3">
              <span className="text-5xl animate-bounce">🎾</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-200 to-white drop-shadow-2xl">
              Tennis Buddy
            </h1>
            <p className="text-lg md:text-xl text-green-100 mb-6 font-semibold">
              Your AI-Powered Tennis Performance Coach
            </p>
            <p className="text-base text-green-50 mb-8 max-w-2xl mx-auto">
              Upload match videos and get instant analytics on every shot, serve, and rally.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/upload">
                <Button 
                  size="lg" 
                  className="bg-white text-green-700 hover:bg-green-50 shadow-xl hover:shadow-2xl transition-all font-bold text-base px-6 py-4 hover:scale-105"
                >
                  📤 Upload Match
                </Button>
              </Link>
              <Link href="/matches">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/20 backdrop-blur-sm font-bold text-base px-6 py-4 hover:scale-105"
                >
                  🎾 View Matches
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Compact */}
      <section className="py-12 bg-gradient-to-b from-white to-green-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center justify-center gap-2">
              <span className="text-3xl">🎯</span>
              Powerful Features
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              Everything you need to improve your game
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-4 rounded-xl bg-gradient-to-br from-white to-green-50 border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-600 leading-tight">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Compact */}
      <section className="py-12 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-black mb-3 flex items-center justify-center gap-2">
            <span className="text-3xl">🚀</span>
            Ready to improve your game?
          </h2>
          <p className="text-base text-green-100 mb-6 max-w-xl mx-auto">
            Start analyzing matches and discover insights to level up your game.
          </p>
          <Link href="/upload">
            <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-bold text-base px-6 py-4 shadow-xl hover:scale-105 transition-all">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

