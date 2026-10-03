import type { Architecture } from './types'

export const NODE_W = 196
export const NODE_H = 54
const GAP_X = 16
const GAP_Y = 14
const LANE_PAD_Y = 16
const LANE_PAD_X = 20
const LANE_GAP = 10
export const RAIL = 190
const MAX_PER_ROW = 6

export interface LaneBox { id: string; y: number; w: number; h: number; index: number }
export interface NodePos { id: string; x: number; y: number; absY: number; lane: number } // x, y relative to lane

/**
 * Layered layout: one horizontal swimlane per group, top to bottom in the order the groups are declared.
 * Inside a lane, components are ordered by the average position of their neighbours (a few sweeps),
 * which keeps most connections short and vertical.
 */
export function layout(arch: Architecture) {
  const laneIndex = new Map(arch.groups.map((g, i) => [g.id, i]))
  const laneOf = new Map(arch.components.map((c) => [c.id, laneIndex.get(c.group) ?? 0]))
  const lanes: string[][] = arch.groups.map(() => [])
  for (const c of arch.components) lanes[laneOf.get(c.id) ?? 0].push(c.id)

  const neighbours = new Map<string, string[]>()
  for (const c of arch.components) neighbours.set(c.id, [])
  for (const e of arch.connections) {
    neighbours.get(e.source)?.push(e.target)
    neighbours.get(e.target)?.push(e.source)
  }

  const pos = new Map<string, number>()
  const place = (ids: string[]) => ids.forEach((id, i) => pos.set(id, (i + 0.5) / ids.length))
  lanes.forEach(place)
  for (let sweep = 0; sweep < 4; sweep++) {
    const order = lanes.map((_, i) => i)
    if (sweep % 2 === 1) order.reverse()
    for (const li of order) {
      const ids = lanes[li]
      const key = new Map(ids.map((id) => {
        const others = (neighbours.get(id) ?? []).filter((n) => laneOf.get(n) !== li)
        const bc = others.length ? others.reduce((a, n) => a + (pos.get(n) ?? 0.5), 0) / others.length : (pos.get(id) ?? 0.5)
        return [id, bc]
      }))
      ids.sort((a, b) => (key.get(a)! - key.get(b)!) || 0)
      place(ids)
    }
  }

  const rowsFor = (n: number) => Math.max(1, Math.ceil(n / MAX_PER_ROW))
  const perRowFor = (n: number) => Math.ceil(n / rowsFor(n))
  const widest = Math.max(1, ...lanes.map((ids) => perRowFor(ids.length)))
  const innerW = widest * NODE_W + (widest - 1) * GAP_X
  const total = RAIL + LANE_PAD_X * 2 + innerW

  const boxes: LaneBox[] = []
  const nodePos: NodePos[] = []
  let y = 0
  lanes.forEach((ids, li) => {
    const rows = rowsFor(ids.length)
    const perRow = perRowFor(ids.length)
    const h = LANE_PAD_Y * 2 + rows * NODE_H + (rows - 1) * GAP_Y
    boxes.push({ id: arch.groups[li].id, y, w: total, h, index: li })
    ids.forEach((id, i) => {
      const row = Math.floor(i / perRow)
      const inRow = Math.min(perRow, ids.length - row * perRow)
      const rowW = inRow * NODE_W + (inRow - 1) * GAP_X
      const x = RAIL + LANE_PAD_X + (innerW - rowW) / 2 + (i % perRow) * (NODE_W + GAP_X)
      const ny = LANE_PAD_Y + row * (NODE_H + GAP_Y)
      nodePos.push({ id, x, y: ny, absY: y + ny, lane: li })
    })
    y += h + LANE_GAP
  })
  return { boxes, nodePos }
}
