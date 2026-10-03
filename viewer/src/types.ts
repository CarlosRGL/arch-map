export type Kind =
  | 'user' | 'ui' | 'api' | 'service' | 'worker'
  | 'cli' | 'database' | 'storage' | 'external' | 'config'

export type Tint = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate' | 'orange'

export interface Group { id: string; label: string; color: Tint }
export interface Component {
  id: string; label: string; group: string; kind: Kind
  tech?: string; description: string; files?: string[]
}
export interface Connection { id: string; source: string; target: string; label?: string }
export interface TourStep {
  title: string; description: string
  components: string[]; connections?: string[]
}
export interface Architecture {
  title: string; description: string
  commit?: string; generatedAt?: string
  groups: Group[]; components: Component[]
  connections: Connection[]; tour: TourStep[]
}
