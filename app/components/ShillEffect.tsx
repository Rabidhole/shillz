'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShillEffect {
  x: number
  y: number
  id: number
}

export function ShillEffect() {
  const [effects, setEffects] = useState<ShillEffect[]>([])
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const newEffect = {
        x: e.clientX,
        y: e.clientY,
        id: counter,
      }
      setEffects(current => [...current, newEffect])
      setCounter(c => c + 1)
      

      // Remove effect after animation
      setTimeout(() => {
        setEffects(current => current.filter(effect => effect.id !== newEffect.id))
      }, 1000)
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [counter])

  return (
    <div className="fixed inset-0 pointer-events-none">
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
            className="absolute w-12 h-12 text-green-500 font-bold"
          >
            +1
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}