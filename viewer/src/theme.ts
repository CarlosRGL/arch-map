import {
  User, LayoutPanelLeft, Plug, Cog, Timer, Terminal, Database, HardDrive, Cloud, Settings,
} from 'lucide-react'
import type { Kind, Tint } from './types'

export const KIND_ICON: Record<Kind, typeof User> = {
  user: User, ui: LayoutPanelLeft, api: Plug, service: Cog, worker: Timer,
  cli: Terminal, database: Database, storage: HardDrive, external: Cloud, config: Settings,
}

// CSS color per kind: loniar tone tokens, so tiles follow light/dark mode.
export const KIND_COLOR: Record<Kind, string> = {
  user: 'var(--tone-slate)', ui: 'var(--tone-blue)', api: 'var(--tone-violet)', service: 'var(--primary)',
  worker: 'var(--tone-orange)', cli: 'var(--tone-green)', database: 'var(--tone-teal)',
  storage: 'var(--tone-amber)', external: 'var(--tone-rose)', config: 'var(--fg-4)',
}

export const TINT: Record<Tint, string> = {
  blue: 'var(--tone-blue)', violet: 'var(--tone-violet)', emerald: 'var(--tone-green)',
  amber: 'var(--tone-amber)', rose: 'var(--tone-rose)', cyan: 'var(--tone-teal)',
  slate: 'var(--tone-slate)', orange: 'var(--tone-orange)',
}

export const soft = (c: string, pct = 14) => `color-mix(in srgb, ${c} ${pct}%, transparent)`
