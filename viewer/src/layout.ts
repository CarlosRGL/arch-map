import dagre from '@dagrejs/dagre'
import type { Architecture } from './types'

export const NODE_W = 212
export const NODE_H = 58
const GAP = 12
const PAD = 16
const HEAD = 38
const PER_COL = 8

export interface GroupBox { id: string; x: number; y: number; w: number; h: number }
export interface NodePos { id: string; x: number; y: number } // relative to its group

/** Stack components in columns inside each group, then lay groups out left-to-right with dagre. */
export function layout(arch: Architecture) {
  const members = new Map<string, string[]>()
  for (const g of arch.groups) members.set(g.id, [])
  for (const c of arch.components) members.get(c.group)?.push(c.id)

  const sizes = new Map<string, { w: number; h: number; cols: number }>()
  const nodePos: NodePos[] = []
  for (const g of arch.groups) {
    const ids = members.get(g.id) ?? []
    const cols = Math.max(1, Math.ceil(ids.length / PER_COL))
    const rows = Math.ceil(ids.length / cols)
    const w = cols * NODE_W + (cols - 1) * GAP + PAD * 2
    const h = HEAD + rows * NODE_H + Math.max(0, rows - 1) * GAP + PAD
    sizes.set(g.id, { w, h, cols })
    ids.forEach((id, i) => {
      const col = Math.floor(i / rows)
      const row = i % rows
      nodePos.push({ id, x: PAD + col * (NODE_W + GAP), y: HEAD + row * (NODE_H + GAP) })
    })
  }

  const groupOf = new Map(arch.components.map((c) => [c.id, c.group]))
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 32, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const grp of arch.groups) {
    const s = sizes.get(grp.id)!
    g.setNode(grp.id, { width: s.w, height: s.h })
  }
  const weights = new Map<string, number>()
  for (const e of arch.connections) {
    const a = groupOf.get(e.source), b = groupOf.get(e.target)
    if (!a || !b || a === b) continue
    const k = `${a}\u0000${b}`
    weights.set(k, (weights.get(k) ?? 0) + 1)
  }
  for (const [k, weight] of weights) {
    const [a, b] = k.split('\u0000')
    if (!g.hasEdge(b, a)) g.setEdge(a, b, { weight }) // skip back-edges so dagre keeps a clean flow
  }
  dagre.layout(g)

  const boxes: GroupBox[] = arch.groups.map((grp) => {
    const n = g.node(grp.id)
    const s = sizes.get(grp.id)!
    return { id: grp.id, x: n.x - s.w / 2, y: n.y - s.h / 2, w: s.w, h: s.h }
  })
  return { boxes, nodePos }
}
