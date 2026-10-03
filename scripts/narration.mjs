#!/usr/bin/env node
// Usage: node narration.mjs <architecture.json> [outDir]
// Turns the tour into a narration script (narration.md) and scene data (narration.json)
// for an explainer video. Uses step.narration when present, else step.description.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const [, , input, outArg] = process.argv
if (!input) { console.error('usage: narration.mjs <architecture.json> [outDir]'); process.exit(2) }

const arch = JSON.parse(readFileSync(input, 'utf8'))
const outDir = resolve(outArg ?? dirname(resolve(input)))
const comp = new Map(arch.components.map((c) => [c.id, c]))
const conn = new Map(arch.connections.map((c) => [c.id, c]))
const name = (id) => comp.get(id)?.label ?? id

const scenes = [
  { title: arch.title, narration: arch.description, components: [], hops: [] },
  ...arch.tour.map((s) => ({
    title: s.title,
    narration: s.narration || s.description,
    components: (s.components ?? []).map((id) => ({ id, label: name(id), kind: comp.get(id)?.kind })),
    hops: (s.connections ?? []).map((id, i) => {
      const c = conn.get(id)
      return { n: i + 1, id, from: name(c.source), to: name(c.target), label: c.label }
    }),
  })),
]

const words = (t) => t.trim().split(/\s+/).length
const md = [`# ${arch.title}: narration script`, '']
scenes.forEach((s, i) => {
  md.push(`## Scene ${i + 1}: ${s.title}`, '', s.narration, '')
  if (s.components.length) md.push(`On screen: ${s.components.map((c) => c.label).join(', ')}`)
  s.hops.forEach((h) => md.push(`${h.n}. ${h.from} -> ${h.to}${h.label ? ` (${h.label})` : ''}`))
  md.push(`~${Math.max(3, Math.round(words(s.narration) / 2.5))} s at normal speaking pace`, '')
})

writeFileSync(join(outDir, 'narration.md'), md.join('\n'))
writeFileSync(join(outDir, 'narration.json'), JSON.stringify({ title: arch.title, scenes }, null, 2))
console.log(`wrote ${join(outDir, 'narration.md')} and narration.json (${scenes.length} scenes)`)
