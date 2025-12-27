export default function Footer() {
  return (
    <footer className="border-t bg-white/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Tennis Buddy</h3>
            <p className="text-sm text-gray-600">
              AI-powered match analysis and performance insights for tennis players and coaches.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Match Analysis</li>
              <li>Shot Classification</li>
              <li>Serve Analytics</li>
              <li>Movement Tracking</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="/docs" className="hover:text-blue-600">Documentation</a>
              </li>
              <li>
                <a href="/api/docs" className="hover:text-blue-600">API Docs</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
          © 2025 Tennis Buddy. All rights reserved.
        </div>
      </div>
    </footer>
  )
}



