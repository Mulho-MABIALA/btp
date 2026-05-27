import { useState, useEffect, useCallback } from 'react'
import { Loader2, Activity, Trash2, RefreshCw } from 'lucide-react'
import { adminActivityLog } from '../adminApi'

const ACTION_CONFIG = {
  create: { label: 'Créé',     cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
  update: { label: 'Modifié',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  delete: { label: 'Supprimé', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  login:  { label: 'Connexion', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  email:  { label: 'Email',    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
  export: { label: 'Export',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  other:  { label: 'Autre',    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
}

const ENTITY_LABELS = {
  Invoice: 'Facture', Client: 'Client', Employee: 'Employé', Supplier: 'Fournisseur',
  CreditNote: 'Avoir', Leave: 'Congé', Equipment: 'Équipement', WorkOrder: 'Bon travaux',
  Document: 'Document', Subcontractor: 'Sous-traitant', HSEIncident: 'Incident HSE',
  PurchaseOrder: 'Bon commande', SiteReport: 'Rapport chantier', Project: 'Projet',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'à l\'instant'
  if (m < 60)  return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d} jour${d > 1 ? 's' : ''}`
}

export default function AdminActivityLog() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [clearing, setClearing]   = useState(false)
  const [entityFilter, setEntityFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminActivityLog.getAll({ limit: 200 }); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const clearAll = async () => {
    if (!window.confirm('Effacer tout le journal d\'activité ?')) return
    setClearing(true)
    try { await adminActivityLog.clear(); await load() } finally { setClearing(false) }
  }

  const entities = ['all', ...new Set(data.map(d => d.entity).filter(Boolean))]
  const filtered = entityFilter === 'all' ? data : data.filter(d => d.entity === entityFilter)

  // Group by day
  const grouped = {}
  filtered.forEach(log => {
    const day = new Date(log.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(log)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Journal d'activité</h1>
          <p className="text-slate-500 text-sm mt-1">{data.length} événement{data.length > 1 ? 's' : ''} enregistré{data.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} disabled={loading} className="p-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-slate-500 hover:text-blue-500 transition-colors disabled:opacity-40">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
          </button>
          <button onClick={clearAll} disabled={clearing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-navy-900 border border-red-200 dark:border-red-500/30 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
            {clearing ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>} Effacer tout
          </button>
        </div>
      </div>

      {/* Entity filter */}
      <div className="flex gap-1.5 flex-wrap">
        {entities.map(e => (
          <button key={e} onClick={() => setEntityFilter(e)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${entityFilter === e ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
            {e === 'all' ? 'Tous' : (ENTITY_LABELS[e] || e)}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
      : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-slate-400">
          <Activity size={32} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Aucune activité enregistrée</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, logs]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide capitalize">{day}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-navy-700"/>
                <span className="text-xs text-slate-400">{logs.length} événement{logs.length > 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 divide-y divide-slate-50 dark:divide-navy-800">
                {logs.map((log, i) => {
                  const ac = ACTION_CONFIG[log.action] || ACTION_CONFIG.other
                  return (
                    <div key={i} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${ac.cls}`}>{ac.label}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{log.entityLabel || log.entity || '—'}</span>
                          {log.details && <span className="text-slate-500"> · {log.details}</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{log.user} · {ENTITY_LABELS[log.entity] || log.entity}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(log.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
