// Weekly period calculation utilities
// Week runs from Monday 00:00:01 to Sunday 23:59:59

export function getCurrentWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days since Monday (if today is Sunday, go back 6 days)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysSinceMonday)
  weekStart.setHours(0, 0, 1, 0) // Monday 00:00:01
  
  return weekStart
}

export function getCurrentWeekEnd(): Date {
  const weekStart = getCurrentWeekStart()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999) // Sunday 23:59:59
  
  return weekEnd
}

export function getCurrentWeekPeriod(): { start: Date; end: Date } {
  return {
    start: getCurrentWeekStart(),
    end: getCurrentWeekEnd()
  }
}

export function isWithinCurrentWeek(date: Date): boolean {
  const { start, end } = getCurrentWeekPeriod()
  return date >= start && date <= end
}

export function getWeekNumber(date: Date = new Date()): string {
  const year = date.getFullYear()
  const weekStart = getCurrentWeekStart()
  const weekNumber = Math.ceil((weekStart.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`
}

// For debugging
export function getWeekInfo() {
  const { start, end } = getCurrentWeekPeriod()
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    weekNumber: getWeekNumber(),
    isCurrentlyMonday: new Date().getDay() === 1,
    isCurrentlySunday: new Date().getDay() === 0,
    daysUntilNextMonday: new Date().getDay() === 0 ? 1 : (8 - new Date().getDay()) % 7
  }
}
