import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import type { Architecture } from './types'
import sample from './sample.json'

const el = document.getElementById('arch-data')
let data: Architecture | null = null
try { data = JSON.parse(el?.textContent ?? 'null') } catch { data = null }

createRoot(document.getElementById('root')!).render(
  <StrictMode><App arch={data ?? (sample as Architecture)} /></StrictMode>,
)
