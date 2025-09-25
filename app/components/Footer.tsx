'use client'

export function Footer() {
  return (
    <footer className="bg-gray-900/50 border-t border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">
            © 2024 Shillz. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm">
            For any inquiries, contact{' '}
            <a 
              href="https://t.me/oscarthedev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              @oscarthedev
            </a>
            {' '}on Telegram
          </p>
        </div>
      </div>
    </footer>
  )
}
