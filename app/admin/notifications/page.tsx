'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: any
  timestamp: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Set up real-time subscription to user_boosters table
    const channel = supabase
      .channel('booster-purchases')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_boosters'
        },
        (payload) => {
          console.log('New booster purchase:', payload)
          
          // Create notification
          const notification: Notification = {
            id: `notification-${Date.now()}`,
            type: 'booster_purchased',
            title: '🚀 New Booster Purchase!',
            message: `New booster purchased: ${payload.new.booster_pack_id}`,
            data: payload.new,
            timestamp: new Date().toISOString()
          }
          
          setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50
          setIsConnected(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Live Purchase Notifications</h1>
        
        <div className="mb-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              Waiting for booster purchases...
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-green-400">{notification.title}</h3>
                  <span className="text-sm text-gray-400">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-300 mb-2">{notification.message}</p>
                <div className="text-xs text-gray-500">
                  <pre>{JSON.stringify(notification.data, null, 2)}</pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
