#!/usr/bin/env node
// Usage: node build.mjs <architecture.json> [out.html]
// Validates the architecture file and injects it into the prebuilt viewer.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [, , input, outArg] = process.argv
if (!input) { console.error('usage: build.mjs <architecture.json> [out.html]'); process.exit(2) }

const here = dirname(fileURLToPath(import.meta.url))
const template = readFileSync(join(here, '..', 'assets', 'viewer.html'), 'utf8')
const arch = JSON.parse(readFileSync(input, 'utf8'))

const KINDS = new Set(['user','ui','api','service','worker','cli','database','storage','external','config'])
const TINTS = new Set(['blue','violet','emerald','amber','rose','cyan','slate','orange'])
const errors = []
const err = (m) => errors.push(m)

for (const k of ['title', 'description']) if (!arch[k]) err(`missing "${k}"`)
for (const k of ['groups', 'components', 'connections', 'tour']) if (!Array.isArray(arch[k])) err(`"${k}" must be an array`)
if (errors.length) fail()

const unique = (arr, what) => {
  const seen = new Set()
  for (const x of arr) { if (!x.id) err(`${what} without id`); else if (seen.has(x.id)) err(`duplicate ${what} id "${x.id}"`); seen.add(x.id) }
  return seen
}
const groups = unique(arch.groups, 'group')
const comps = unique(arch.components, 'component')
const conns = unique(arch.connections, 'connection')

arch.groups.forEach((g) => { if (!TINTS.has(g.color)) err(`group "${g.id}": color "${g.color}" not in ${[...TINTS]}`) })
arch.components.forEach((c) => {
  if (!groups.has(c.group)) err(`component "${c.id}": unknown group "${c.group}"`)
  if (!KINDS.has(c.kind)) err(`component "${c.id}": kind "${c.kind}" not in ${[...KINDS]}`)
  if (!c.label || !c.description) err(`component "${c.id}": label and description are required`)
})
arch.connections.forEach((c) => {
  if (!comps.has(c.source)) err(`connection "${c.id}": unknown source "${c.source}"`)
  if (!comps.has(c.target)) err(`connection "${c.id}": unknown target "${c.target}"`)
})
arch.tour.forEach((s, i) => {
  if (!s.title || !s.description) err(`tour step ${i + 1}: title and description are required`)
  if (s.narration != null && typeof s.narration !== 'string') err(`tour step ${i + 1}: narration must be a string`)
  ;(s.components ?? []).forEach((id) => { if (!comps.has(id)) err(`tour step ${i + 1}: unknown component "${id}"`) })
  ;(s.connections ?? []).forEach((id) => { if (!conns.has(id)) err(`tour step ${i + 1}: unknown connection "${id}"`) })
})
const used = new Set(arch.connections.flatMap((c) => [c.source, c.target]))
arch.components.forEach((c) => { if (!used.has(c.id)) console.warn(`warning: component "${c.id}" has no connection`) })
if (errors.length) fail()

function fail() { console.error(errors.map((e) => `  - ${e}`).join('\n')); process.exit(1) }

// "<" escaped so the JSON can never close the script tag.
const json = JSON.stringify(arch).replace(/</g, '\\u003c')
const marker = '<script id="arch-data" type="application/json">null</script>'
if (!template.includes(marker)) { console.error('viewer.html: data marker not found'); process.exit(1) }
const out = resolve(outArg ?? join(dirname(resolve(input)), 'index.html'))
writeFileSync(out, template.replace(marker, () => `<script id="arch-data" type="application/json">${json}</script>`))
console.log(`wrote ${out} (${arch.components.length} components, ${arch.connections.length} connections, ${arch.tour.length} tour steps)`)
