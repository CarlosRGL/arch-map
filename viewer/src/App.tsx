import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap,
  Handle, Position, MarkerType, useReactFlow, type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import { ChevronLeft, ChevronRight, FileCode2, Play, X, CheckCircle2, Sun, Moon } from 'lucide-react'
import type { Architecture, Component, Kind } from './types'
import { KIND_ICON, KIND_COLOR, TINT, soft } from './theme'
import { layout, NODE_H, NODE_W } from './layout'

type CompData = { comp: Component; dim: boolean; active: boolean }
type GroupData = { label: string; color: string; count: number; dim: boolean }

function KindTile({ kind, size = 34 }: { kind: Kind; size?: number }) {
  const Icon = KIND_ICON[kind]
  const c = KIND_COLOR[kind]
  return (
    <div
      className="grid shrink-0 place-items-center rounded-md"
      style={{ width: size, height: size, background: soft(c, 14), boxShadow: `inset 0 0 0 1px ${soft(c, 28)}`, color: c }}
    >
      <Icon size={size * 0.52} strokeWidth={2} />
    </div>
  )
}

function CompNode({ data, selected }: NodeProps<Node<CompData>>) {
  const { comp, dim, active } = data
  const lit = active || selected
  return (
    <div
      className={`node flex items-center gap-2.5 rounded-lg bg-card px-2.5 ${dim ? 'node-dim' : ''}`}
      style={{
        width: NODE_W, height: NODE_H,
        boxShadow: lit
          ? '0 0 0 1.5px var(--primary), 0 8px 24px -8px var(--primary-line)'
          : 'var(--elevation-card)',
      }}
    >
      <Handle id="l" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="r" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="t" type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <Handle id="b" type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
      <KindTile kind={comp.kind} />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold leading-tight text-foreground">{comp.label}</div>
        <div className="truncate text-[10.5px] leading-tight text-fg-3">
          {comp.kind[0].toUpperCase() + comp.kind.slice(1)}{comp.tech ? ` · ${comp.tech}` : ''}
        </div>
      </div>
    </div>
  )
}

function GroupNode({ data }: NodeProps<Node<GroupData>>) {
  return (
    <div
      className={`node h-full w-full rounded-2xl border ${data.dim ? 'node-dim' : ''}`}
      style={{ background: soft(data.color, 6), borderColor: soft(data.color, 26) }}
    >
      <div className="flex items-center gap-1.5 px-4 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: data.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: data.color }} />
        {data.label}
        <span className="font-semibold opacity-60">{data.count}</span>
      </div>
    </div>
  )
}

const nodeTypes = { comp: CompNode, cluster: GroupNode }

function Viewer({ arch }: { arch: Architecture }) {
  const rf = useReactFlow()
  const [step, setStep] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggleTheme = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('arch-theme', next ? 'dark' : 'light') } catch { /* private mode */ }
    setDark(next)
  }

  const byId = useMemo(() => new Map(arch.components.map((c) => [c.id, c])), [arch])
  const groupById = useMemo(() => new Map(arch.groups.map((g) => [g.id, g])), [arch])
  const lay = useMemo(() => layout(arch), [arch])

  // What is lit right now: a tour step, or a selected component and its neighbours.
  const hl = useMemo(() => {
    const comps = new Set<string>(), conns = new Set<string>()
    if (step !== null && arch.tour[step]) {
      arch.tour[step].components.forEach((c) => comps.add(c))
      arch.tour[step].connections?.forEach((c) => conns.add(c))
      // a step lists connections: make sure their endpoints are lit too
      arch.connections.filter((c) => conns.has(c.id)).forEach((c) => { comps.add(c.source); comps.add(c.target) })
    } else if (selected) {
      comps.add(selected)
      arch.connections.filter((c) => c.source === selected || c.target === selected)
        .forEach((c) => { conns.add(c.id); comps.add(c.source); comps.add(c.target) })
    }
    return { comps, conns, on: comps.size > 0 }
  }, [step, selected, arch])

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = lay.boxes.map((b) => {
      const g = groupById.get(b.id)!
      const count = arch.components.filter((c) => c.group === b.id).length
      const dim = hl.on && !arch.components.some((c) => c.group === b.id && hl.comps.has(c.id))
      return {
        id: `g:${b.id}`, type: 'cluster', position: { x: b.x, y: b.y },
        width: b.w, height: b.h, style: { width: b.w, height: b.h }, zIndex: 0, selectable: false, draggable: false,
        data: { label: g.label, color: TINT[g.color] ?? TINT.slate, count, dim } satisfies GroupData,
      }
    })
    for (const p of lay.nodePos) {
      const comp = byId.get(p.id)!
      out.push({
        id: comp.id, type: 'comp', parentId: `g:${comp.group}`, extent: 'parent',
        position: { x: p.x, y: p.y }, width: NODE_W, height: NODE_H, zIndex: 2, selected: selected === comp.id,
        data: { comp, dim: hl.on && !hl.comps.has(comp.id), active: hl.comps.has(comp.id) } satisfies CompData,
      })
    }
    return out
  }, [lay, hl, selected, arch, byId, groupById])

  const edges = useMemo<Edge[]>(() => {
    const order = new Map(arch.components.map((c, i) => [c.id, i]))
    return arch.connections.filter((c) => byId.has(c.source) && byId.has(c.target)).map((c) => {
      const sameGroup = byId.get(c.source)!.group === byId.get(c.target)!.group
      const down = (order.get(c.source) ?? 0) < (order.get(c.target) ?? 0)
      const lit = hl.conns.has(c.id)
      const color = lit ? 'var(--primary)' : 'var(--border-strong)'
      return {
        id: c.id, source: c.source, target: c.target, zIndex: lit ? 10 : 1,
        sourceHandle: sameGroup ? (down ? 'b' : 't') : 'r',
        targetHandle: sameGroup ? (down ? 't' : 'b') : 'l',
        label: lit ? c.label : undefined,
        className: lit ? 'edge-flow' : '',
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
        style: { stroke: color, strokeWidth: lit ? 2 : 1.4, opacity: hl.on && !lit ? 0.25 : 1 },
        labelStyle: { fill: 'var(--fg-2)' }, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 5,
        labelBgStyle: { fill: 'var(--card)', stroke: 'var(--border-strong)' },
      }
    })
  }, [arch, byId, hl])

  const focus = useCallback((ids: string[]) => {
    if (!ids.length) return rf.fitView({ padding: 0.15, duration: 600 })
    rf.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.35, duration: 650, maxZoom: 1.15 })
  }, [rf])

  const goStep = useCallback((i: number | null) => {
    setSelected(null)
    setStep(i)
    if (i === null) { rf.fitView({ padding: 0.15, duration: 600 }); return }
    const s = arch.tour[i]
    const ids = new Set(s.components)
    arch.connections.filter((c) => s.connections?.includes(c.id)).forEach((c) => { ids.add(c.source); ids.add(c.target) })
    focus([...ids])
  }, [arch, rf, focus])

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

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.15} maxZoom={1.6}
          nodesConnectable={false} colorMode={dark ? 'dark' : 'light'} proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) => { if (n.type === 'comp') { setStep(null); setSelected(n.id) } }}
          onPaneClick={() => { setSelected(null) }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" maskColor="transparent"
            nodeColor={(n) => (n.type === 'cluster' ? 'var(--surface-3)' : KIND_COLOR[(n.data as CompData).comp.kind])} />
        </ReactFlow>

        {step !== null && (
          <div className="pointer-events-auto absolute left-1/2 top-4 z-20 w-[460px] max-w-[92%] -translate-x-1/2 rounded-xl bg-card/95 p-4 shadow-pop backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-fg-3">
              <span>How it works · {step + 1} of {arch.tour.length}</span>
              <div className="flex items-center gap-1.5">
                {arch.tour.map((_, i) => (
                  <button key={i} aria-label={`Step ${i + 1}`} onClick={() => goStep(i)}
                    className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong hover:bg-fg-4'}`} />
                ))}
                <button aria-label="End tour" onClick={() => goStep(null)} className="ml-2 text-fg-3 hover:text-foreground"><X size={14} /></button>
              </div>
            </div>
            <div className="text-[15px] font-semibold text-foreground">{arch.tour[step].title}</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-2">{arch.tour[step].description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {arch.tour[step].components.map((id) => byId.get(id) && (
                <span key={id} className="flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] text-fg-2">
                  <KindTile kind={byId.get(id)!.kind} size={14} />{byId.get(id)!.label}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button disabled={step === 0} onClick={() => goStep(step - 1)}
                className="flex items-center gap-1 rounded-md border border-border-strong px-3 py-1.5 text-xs text-fg-2 hover:bg-accent disabled:opacity-30">
                <ChevronLeft size={14} />Back
              </button>
              <span className="text-[10.5px] text-fg-4">← → to move · Esc to close</span>
              {step < arch.tour.length - 1 ? (
                <button onClick={() => goStep(step + 1)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                  Next<ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={() => goStep(null)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">Done</button>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar p-6">
        {sel ? (
          <div>
            <button onClick={() => setSelected(null)} className="mb-4 flex items-center gap-1 text-xs text-fg-3 hover:text-foreground">
              <ChevronLeft size={14} />Back to overview
            </button>
            <div className="flex items-center gap-3">
              <KindTile kind={sel.kind} size={42} />
              <div>
                <div className="text-lg font-semibold text-foreground">{sel.label}</div>
                <div className="text-xs text-fg-3">{sel.kind}{sel.tech ? ` · ${sel.tech}` : ''} · {groupById.get(sel.group)?.label}</div>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-fg-2">{sel.description}</p>
            {selConns.length > 0 && (
              <>
                <h3 className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">Connections</h3>
                <ul className="space-y-1.5">
                  {selConns.map((c) => {
                    const out = c.source === sel.id
                    const other = byId.get(out ? c.target : c.source)
                    return (
                      <li key={c.id}>
                        <button onClick={() => { setSelected(other!.id); focus([other!.id]) }}
                          className="flex w-full items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-left text-xs shadow-card hover:bg-accent">
                          <span className="text-fg-4">{out ? '→' : '←'}</span>
                          <span className="min-w-0 flex-1 truncate text-foreground">{other?.label}</span>
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
                <h3 className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">Files</h3>
                <ul className="space-y-1">
                  {sel.files.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 break-all font-mono text-[11px] text-fg-3">
                      <FileCode2 size={12} className="mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{arch.title}</h1>
              <button onClick={toggleTheme} aria-label="Toggle light and dark mode"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-fg-3 shadow-card hover:bg-accent hover:text-foreground">
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-2">{arch.description}</p>
            <p className="mt-3 text-xs text-fg-4">
              {arch.components.length} components · {arch.connections.length} connections · {arch.groups.length} groups
            </p>

            <div className="mb-3 mt-7 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">How it works</h2>
              <button onClick={() => goStep(step === null ? 0 : null)}
                className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90">
                {step === null ? <><Play size={11} />Start tour</> : <>End tour</>}
              </button>
            </div>
            <ol className="space-y-2">
              {arch.tour.map((s, i) => (
                <li key={i}>
                  <button onClick={() => goStep(i)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${step === i ? 'border-primary-line bg-primary-soft' : 'border-transparent hover:bg-accent'}`}>
                    <div className="flex gap-2.5">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${step === i ? 'bg-primary text-primary-foreground' : 'bg-surface-3 text-fg-3'}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-foreground">{s.title}</div>
                        <p className="mt-0.5 text-xs leading-relaxed text-fg-3">{s.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.components.map((id) => byId.get(id) && <KindTile key={id} kind={byId.get(id)!.kind} size={16} />)}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] text-fg-4">Click any component on the canvas to see its role.</p>

            <div className="mt-auto border-t border-divider pt-4 text-xs text-fg-4">
              {arch.generatedAt && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[var(--success)]" />
                  Saved {new Date(arch.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  {arch.commit && <span className="font-mono">· {arch.commit}</span>}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

export default function App({ arch }: { arch: Architecture }) {
  return <ReactFlowProvider><Viewer arch={arch} /></ReactFlowProvider>
}
