'use client'

import { ShiftCategory } from "@/config/types/crewShift";

const CATEGORY_CONFIG: Record<
  ShiftCategory,
  { label: string; bg: string; text: string }
> = {
  STANDBY: { label: 'STAND BY', bg: '#1976d2', text: '#fff' },
  ON_DUTY: { label: 'ON DUTY', bg: '#2e7d32', text: '#fff' },
  OFF_DUTY: { label: 'OFF DUTY', bg: '#ef6c00', text: '#fff' },
  TRAINING: { label: 'TRAINING', bg: '#6a1b9a', text: '#fff' },
}

interface CategoryBadgeProps {
  category: ShiftCategory
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]
  const padding = size === 'sm' ? '2px 8px' : '4px 12px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span
      style={{
        background: config.bg,
        color: config.text,
        padding,
        fontSize,
        borderRadius: '4px',
        fontWeight: 600,
        letterSpacing: '0.5px',
        display: 'inline-block',
        lineHeight: 1.6,
      }}
    >
      {config.label}
    </span>
  )
}

interface CategoryLegendProps {
  isDark: boolean
}

export function CategoryLegend({ isDark }: CategoryLegendProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {(Object.keys(CATEGORY_CONFIG) as ShiftCategory[]).map((cat) => (
        <CategoryBadge key={cat} category={cat} />
      ))}
    </div>
  )
}