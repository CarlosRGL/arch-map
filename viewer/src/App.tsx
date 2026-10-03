import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, Handle, Position,
  MarkerType, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow,
  type Node, type Edge, type NodeProps, type EdgeProps,
} from '@xyflow/react'
import { ArrowRight, ChevronLeft, ChevronRight, FileCode2, Moon, Play, Sun, X } from 'lucide-react'
import type { Architecture, Component } from './types'
import { KIND_ICON, KIND_COLOR, TINT, soft } from './theme'
import { layout, NODE_H, NODE_W, RAIL } from './layout'

type CompData = { comp: Component; dim: boolean; active: boolean }
type LaneData = { label: string; color: string; count: number; dim: boolean }
type HopData = { label?: string; n?: number; lit: boolean }

const HANDLE = '!h-1.5 !w-1.5 !border-0 !bg-transparent'

function CompNode({ data, selected }: NodeProps<Node<CompData>>) {
  const { comp, dim, active } = data
  const lit = active || selected
  const Icon = KIND_ICON[comp.kind]
  const color = KIND_COLOR[comp.kind]
  return (
    <div
      className={`node relative flex items-center gap-2 overflow-hidden rounded-md bg-card pl-3.5 pr-2.5 ${dim ? 'node-dim' : ''}`}
      style={{
        width: NODE_W, height: NODE_H,
        boxShadow: lit ? '0 0 0 1.5px var(--primary), 0 8px 24px -8px var(--primary-line)' : 'var(--elevation-card)',
      }}
    >
      <Handle id="l" type="target" position={Position.Left} className={HANDLE} />
      <Handle id="r" type="source" position={Position.Right} className={HANDLE} />
      <Handle id="t" type="target" position={Position.Top} className={HANDLE} />
      <Handle id="b" type="source" position={Position.Bottom} className={HANDLE} />
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <Icon size={16} strokeWidth={2} style={{ color }} className="shrink-0" />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold leading-tight text-foreground">{comp.label}</div>
        <div className="truncate font-mono text-[10px] uppercase leading-tight tracking-wide text-fg-4">
          {comp.tech ?? comp.kind}
        </div>
      </div>
    </div>
  )
}

function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  return (
    <div
      className={`node h-full w-full rounded-xl border ${data.dim ? 'node-dim' : ''}`}
      style={{ background: soft(data.color, 5), borderColor: soft(data.color, 22) }}
    >
      <div className="flex h-full items-center border-r px-4" style={{ width: RAIL, borderColor: soft(data.color, 22) }}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: data.color }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: data.color }} />
            <span className="break-words leading-tight">{data.label}</span>
          </div>
          <div className="mt-0.5 pl-3 text-[10.5px] text-fg-4">{data.count} {data.count === 1 ? 'component' : 'components'}</div>
        </div>
      </div>
    </div>
  )
}

function HopEdge(p: EdgeProps<Edge<HopData>>) {
  const [path, lx, ly] = getSmoothStepPath({
    sourceX: p.sourceX, sourceY: p.sourceY, sourcePosition: p.sourcePosition,
    targetX: p.targetX, targetY: p.targetY, targetPosition: p.targetPosition, borderRadius: 12,
  })
  const d = p.data!
  return (
    <>
      <BaseEdge id={p.id} path={path} markerEnd={p.markerEnd} style={p.style} className={d.lit ? 'edge-flow' : ''} />
      {d.lit && (d.label || d.n) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute z-30 flex items-center gap-1 rounded-full bg-card py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-fg-2 shadow-pop"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, paddingLeft: d.n ? 2 : 8 }}
          >
            {d.n && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{d.n}</span>
            )}
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes = { comp: CompNode, lane: LaneNode }
const edgeTypes = { hop: HopEdge }

function Viewer({ arch }: { arch: Architecture }) {
  const rf = useReactFlow()
  const [step, setStep] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggleTheme = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('arch-theme', next ? 'dark' : 'light') } catch { /* storage blocked (file://, private mode) */ }
    setDark(next)
  }

  const byId = useMemo(() => new Map(arch.components.map((c) => [c.id, c])), [arch])
  const groupById = useMemo(() => new Map(arch.groups.map((g) => [g.id, g])), [arch])
  const connById = useMemo(() => new Map(arch.connections.map((c) => [c.id, c])), [arch])
  const lay = useMemo(() => layout(arch), [arch])
  const nodeAt = useMemo(() => new Map(lay.nodePos.map((p) => [p.id, p])), [lay])

  // The hops of the current step, in the order they are listed in the file.
  const hops = useMemo(() => {
    if (step === null) return []
    return (arch.tour[step].connections ?? []).map((id) => connById.get(id)).filter((c) => !!c)
  }, [step, arch, connById])

  const hl = useMemo(() => {
    const comps = new Set<string>(), conns = new Map<string, number | undefined>()
    if (step !== null) {
      arch.tour[step].components.forEach((c) => comps.add(c))
      hops.forEach((c, i) => { conns.set(c.id, i + 1); comps.add(c.source); comps.add(c.target) })
    } else if (selected) {
      comps.add(selected)
      arch.connections.filter((c) => c.source === selected || c.target === selected)
        .forEach((c) => { conns.set(c.id, undefined); comps.add(c.source); comps.add(c.target) })
    }
    return { comps, conns, on: comps.size > 0 }
  }, [step, selected, arch, hops])

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = lay.boxes.map((b) => {
      const g = groupById.get(b.id)!
      const members = arch.components.filter((c) => c.group === b.id)
      return {
        id: `lane:${b.id}`, type: 'lane', position: { x: 0, y: b.y }, width: b.w, height: b.h,
        style: { width: b.w, height: b.h }, zIndex: 0, selectable: false, draggable: false,
        data: {
          label: g.label, color: TINT[g.color] ?? TINT.slate, count: members.length,
          dim: hl.on && !members.some((c) => hl.comps.has(c.id)),
        } satisfies LaneData,
      }
    })
    for (const p of lay.nodePos) {
      const comp = byId.get(p.id)!
      out.push({
        id: comp.id, type: 'comp', parentId: `lane:${comp.group}`, extent: 'parent',
        position: { x: p.x, y: p.y }, width: NODE_W, height: NODE_H, zIndex: 2, selected: selected === comp.id,
        data: { comp, dim: hl.on && !hl.comps.has(comp.id), active: hl.comps.has(comp.id) } satisfies CompData,
      })
    }
    return out
  }, [lay, hl, selected, arch, byId, groupById])

  const edges = useMemo<Edge[]>(() => {
    return arch.connections.filter((c) => byId.has(c.source) && byId.has(c.target)).map((c) => {
      const a = nodeAt.get(c.source)!, b = nodeAt.get(c.target)!
      const dy = b.absY - a.absY
      const vertical = Math.abs(dy) >= NODE_H
      const lit = hl.conns.has(c.id)
      const color = lit ? 'var(--primary)' : 'var(--border-strong)'
      return {
        id: c.id, source: c.source, target: c.target, type: 'hop', zIndex: lit ? 10 : 1,
        sourceHandle: vertical ? (dy > 0 ? 'b' : 't') : (b.x > a.x ? 'r' : 'l'),
        targetHandle: vertical ? (dy > 0 ? 't' : 'b') : (b.x > a.x ? 'l' : 'r'),
        data: { label: c.label, n: hl.conns.get(c.id), lit } satisfies HopData,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
        style: { stroke: color, strokeWidth: lit ? 2 : 1.2, opacity: hl.on && !lit ? 0.18 : 0.7 },
      }
    })
  }, [arch, byId, nodeAt, hl])

  const fit = useCallback((ids: string[], maxZoom = 1.2) => {
    // wait a frame so the canvas has its final size after the dock opens or closes
    setTimeout(() => rf.fitView({ nodes: ids.length ? ids.map((id) => ({ id })) : undefined, padding: ids.length ? 0.3 : 0.06, duration: 650, maxZoom }), 60)
  }, [rf])
  const focus = useCallback((ids: string[]) => fit(ids), [fit])

  const goStep = useCallback((i: number | null) => {
    setSelected(null)
    setStep(i)
    if (i === null) { fit([], 1); return }
    const s = arch.tour[i]
    const ids = new Set(s.components)
    s.connections?.forEach((id) => { const c = connById.get(id); if (c) { ids.add(c.source); ids.add(c.target) } })
    focus([...ids])
  }, [arch, fit, focus, connById])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step === null) { if (e.key === 'Escape') setSelected(null); return }
      if (e.key === 'Escape') goStep(null)
      if (e.key === 'ArrowRight') goStep(Math.min(arch.tour.length - 1, step + 1))
      if (e.key === 'ArrowLeft') goStep(Math.max(0, step - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, arch, goStep])

  const sel = selected ? byId.get(selected) : null
  const selConns = sel ? arch.connections.filter((c) => c.source === sel.id || c.target === sel.id) : []
  const cur = step !== null ? arch.tour[step] : null

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-sidebar-border bg-sidebar px-5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h1 className="shrink-0 text-lg font-semibold tracking-tight text-foreground">{arch.title}</h1>
            <span className="shrink-0 text-xs text-fg-4">
              {arch.components.length} components · {arch.connections.length} connections · {arch.groups.length} layers
              {arch.commit ? <> · <span className="font-mono">{arch.commit}</span></> : null}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 max-w-4xl text-xs leading-snug text-fg-3" title={arch.description}>{arch.description}</p>
        </div>
        <button onClick={toggleTheme} aria-label="Toggle light and dark mode"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-fg-3 shadow-card hover:bg-accent hover:text-foreground">
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          fitView fitViewOptions={{ padding: 0.06 }} minZoom={0.2} maxZoom={1.6}
          nodesConnectable={false} nodesDraggable={false} colorMode={dark ? 'dark' : 'light'} proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) => { if (n.type === 'comp') { setStep(null); setSelected(n.id) } }}
          onPaneClick={() => setSelected(null)}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
          <Controls showInteractive={false} position="top-left" />
          <MiniMap pannable zoomable position="top-right" style={{ width: 150, height: 96 }}
            nodeColor={(n) => (n.type === 'lane' ? 'var(--surface-3)' : KIND_COLOR[(n.data as CompData).comp.kind])} />
        </ReactFlow>

        {sel && (
          <aside className="absolute right-4 top-28 z-20 max-h-[calc(100%-8rem)] w-[340px] overflow-y-auto rounded-xl bg-card p-4 shadow-pop">
            <button onClick={() => setSelected(null)} aria-label="Close" className="absolute right-3 top-3 text-fg-3 hover:text-foreground"><X size={15} /></button>
            <div className="flex items-center gap-2.5 pr-6">
              {(() => { const I = KIND_ICON[sel.kind]; return <I size={18} style={{ color: KIND_COLOR[sel.kind] }} /> })()}
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-foreground">{sel.label}</div>
                <div className="font-mono text-[10.5px] uppercase tracking-wide text-fg-4">{sel.kind}{sel.tech ? ` · ${sel.tech}` : ''}</div>
              </div>
            </div>
            <div className="mt-1 text-xs text-fg-3">in {groupById.get(sel.group)?.label}</div>
            <p className="mt-3 text-[13px] leading-relaxed text-fg-2">{sel.description}</p>
            {selConns.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">Connections</h3>
                <ul className="space-y-1">
                  {selConns.map((c) => {
                    const out = c.source === sel.id
                    const other = byId.get(out ? c.target : c.source)!
                    return (
                      <li key={c.id}>
                        <button onClick={() => { setSelected(other.id); focus([other.id]) }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs shadow-card hover:bg-accent">
                          <span className="text-fg-4">{out ? '→' : '←'}</span>
                          <span className="min-w-0 flex-1 truncate text-foreground">{other.label}</span>
                          <span className="truncate text-fg-4">{c.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
            {sel.files && sel.files.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">Files</h3>
                <ul className="space-y-1">
                  {sel.files.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 break-all font-mono text-[11px] text-fg-3"><FileCode2 size={12} className="mt-0.5 shrink-0" />{f}</li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        )}

      </div>

        <section className="shrink-0 border-t border-sidebar-border bg-card" aria-label="Flows">
          <div className="flex items-center gap-1 overflow-x-auto px-4 py-2">
            <span className="shrink-0 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">Flows</span>
            {arch.tour.map((s, i) => (
              <button key={i} onClick={() => goStep(step === i ? null : i)} title={s.title}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  step === i ? 'bg-primary text-primary-foreground' : 'text-fg-2 hover:bg-accent'}`}>
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${step === i ? 'bg-primary-foreground/20' : 'bg-surface-3 text-fg-3'}`}>{i + 1}</span>
                <span className="max-w-[190px] truncate">{s.title}</span>
              </button>
            ))}
            {step === null && (
              <button onClick={() => goStep(0)} className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
                <Play size={11} />Play the tour
              </button>
            )}
          </div>

          {cur && step !== null && (
            <div className="border-t border-divider px-5 pb-3 pt-3">
              <div className="grid gap-5" style={{ gridTemplateColumns: hops.length ? 'minmax(0,1.15fr) minmax(0,1fr)' : '1fr' }}>
                <div>
                  <div className="text-[15px] font-semibold text-foreground">{cur.title}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-fg-2">{cur.description}</p>
                </div>
                {hops.length > 0 && (
                  <ol className="max-h-36 space-y-1 overflow-y-auto pr-1">
                    {hops.map((c, i) => (
                      <li key={c.id} className="flex items-center gap-2 text-xs">
                        <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                        <span className="truncate text-foreground">{byId.get(c.source)?.label}</span>
                        <ArrowRight size={11} className="shrink-0 text-fg-4" />
                        <span className="truncate text-foreground">{byId.get(c.target)?.label}</span>
                        {c.label && <span className="truncate text-fg-4">{c.label}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button disabled={step === 0} onClick={() => goStep(step - 1)}
                  className="flex items-center gap-1 rounded-md border border-border-strong px-2.5 py-1 text-xs text-fg-2 hover:bg-accent disabled:opacity-30">
                  <ChevronLeft size={13} />Back
                </button>
                <span className="text-[10.5px] text-fg-4">← → to move · Esc to close</span>
                {step < arch.tour.length - 1 ? (
                  <button onClick={() => goStep(step + 1)} className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">Next<ChevronRight size={13} /></button>
                ) : (
                  <button onClick={() => goStep(null)} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">Done</button>
                )}
              </div>
            </div>
          )}
        </section>
    </div>
  )
}

export default function App({ arch }: { arch: Architecture }) {
  return <ReactFlowProvider><Viewer arch={arch} /></ReactFlowProvider>
}
