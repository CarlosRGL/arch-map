// UI strings for the viewer. The diagram content itself (labels, descriptions) is written
// by the agent in the language set in architecture.json ("lang"); this only covers the chrome.
export interface Strings {
  howItWorks: string; startTour: string; endTour: string; step: string
  stepOf: (n: number, total: number) => string
  back: string; next: string; done: string; keys: string
  connections: string; files: string; backToOverview: string; toggleTheme: string
  counts: (c: number, k: number, g: number) => string
  hint: string; saved: string; locale: string
  kinds: Record<string, string>
}

const en: Strings = {
  howItWorks: 'How it works', startTour: 'Start tour', endTour: 'End tour', step: 'Step',
  stepOf: (n, t) => `${n} of ${t}`,
  back: 'Back', next: 'Next', done: 'Done', keys: '← → to move · Esc to close',
  connections: 'Connections', files: 'Files', backToOverview: 'Back to overview', toggleTheme: 'Toggle light and dark mode',
  counts: (c, k, g) => `${c} components · ${k} connections · ${g} groups`,
  hint: 'Click any component on the canvas to see its role.', saved: 'Saved', locale: 'en-GB',
  kinds: {},
}

const fr: Strings = {
  howItWorks: 'Comment ça marche', startTour: 'Lancer la visite', endTour: 'Fermer la visite', step: 'Étape',
  stepOf: (n, t) => `${n} sur ${t}`,
  back: 'Retour', next: 'Suivant', done: 'Terminer', keys: '← → pour naviguer · Échap pour fermer',
  connections: 'Connexions', files: 'Fichiers', backToOverview: 'Retour à la vue d’ensemble', toggleTheme: 'Basculer entre mode clair et sombre',
  counts: (c, k, g) => `${c} composants · ${k} connexions · ${g} groupes`,
  hint: 'Cliquez sur un composant pour voir son rôle.', saved: 'Généré le', locale: 'fr-FR',
  kinds: { user: 'utilisateur', ui: 'interface', api: 'API', service: 'service', worker: 'tâche de fond', cli: 'CLI', database: 'base de données', storage: 'stockage', external: 'externe', config: 'configuration' },
}

const es: Strings = {
  howItWorks: 'Cómo funciona', startTour: 'Iniciar recorrido', endTour: 'Cerrar recorrido', step: 'Paso',
  stepOf: (n, t) => `${n} de ${t}`,
  back: 'Atrás', next: 'Siguiente', done: 'Terminar', keys: '← → para moverse · Esc para cerrar',
  connections: 'Conexiones', files: 'Archivos', backToOverview: 'Volver a la vista general', toggleTheme: 'Cambiar entre modo claro y oscuro',
  counts: (c, k, g) => `${c} componentes · ${k} conexiones · ${g} grupos`,
  hint: 'Haz clic en un componente para ver su función.', saved: 'Generado el', locale: 'es-ES',
  kinds: { user: 'usuario', ui: 'interfaz', api: 'API', service: 'servicio', worker: 'tarea en segundo plano', cli: 'CLI', database: 'base de datos', storage: 'almacenamiento', external: 'externo', config: 'configuración' },
}

const DICTS: Record<string, Strings> = { en, fr, es }

export let T: Strings = en
/** Pick the dictionary from a BCP-47 tag ("fr", "fr-FR", "es-MX"); unknown tags fall back to English. */
export function setLang(lang?: string) {
  const code = (lang ?? 'en').toLowerCase().split('-')[0]
  T = DICTS[code] ?? en
  document.documentElement.lang = DICTS[code] ? code : 'en'
}
export const kindLabel = (k: string) => T.kinds[k] ?? k
