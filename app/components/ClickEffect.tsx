'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ClickEffectItem {
  id: number
  x: number
  y: number
}

export function ClickEffect() {
  const [effects, setEffects] = useState<ClickEffectItem[]>([])
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only trigger on shill button clicks
      const target = e.target as HTMLElement
      if (target.textContent?.includes('SHILL') || target.closest('[data-shill-button]')) {
        const rect = target.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        
        const newEffect = {
          id: counter,
          x,
          y,
        }
        
        setEffects(current => [...current, newEffect])
        setCounter(c => c + 1)

        // Remove effect after animation
        setTimeout(() => {
          setEffects(current => current.filter(effect => effect.id !== newEffect.id))
        }, 1000)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [counter])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {effects.map(effect => (
          <motion.div
            key={effect.id}
            initial={{ 
              opacity: 0,
              scale: 0.5,
              x: effect.x - 25,
              y: effect.y - 25
            }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0],
              y: effect.y - 100
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute w-12 h-12 flex items-center justify-center text-green-400 font-bold text-xl"
          >
            +1
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
