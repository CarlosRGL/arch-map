import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import type { Architecture } from './types'
import sample from './sample.json'
import { setLang } from './i18n'

const el = document.getElementById('arch-data')
let data: Architecture | null = null
try { data = JSON.parse(el?.textContent ?? 'null') } catch { data = null }

const arch = data ?? (sample as Architecture)
setLang(arch.lang)

createRoot(document.getElementById('root')!).render(
  <StrictMode><App arch={arch} /></StrictMode>,
)
