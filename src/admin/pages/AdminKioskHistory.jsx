import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, LogIn, LogOut, RefreshCw, Download, MapPin, Search, Filter, Clock, RotateCcw } from 'lucide-react'
import { adminKiosk, adminEmployees } from '../adminApi'

const ACTION_CFG = {
  'in':    { label: 'Entrée',   icon: LogIn,    cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',  dot: 'bg-green-500'  },
  'out':   { label: 'Sortie',   icon: LogOut,   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', dot: 'bg-orange-500' },
  're-in': { label: 'Re-entrée',icon: RotateCcw,cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',   dot: 'bg-blue-500'   },
}

const DEPT_COLORS = {
  'Chantier':            'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  "Bureau d'études":     'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  'Direction':           'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400',
  'Comptabilité':        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'Ressources humaines': 'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  'Commercial':          'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  'Logistique':          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
}
const deptCls = d => DEPT_COLORS[d] || DEPT_COLORS['Chantier']

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

// ── Timeline view: group by employee for a single day ────────────────────────
function DayTimeline({ logs }) {
  if (!logs.length) return null

  const byEmp = {}
  logs.forEach(l => {
    const id = l.employee?._id
    if (!id) return
    if (!byEmp[id]) byEmp[id] = { emp: l.employee, scans: [] }
    byEmp[id].scans.push(l)
  })

  return (
    <div className="space-y-2">
      {Object.values(byEmp).map(({ emp, scans }) => (
        <div key={emp._id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-navy-800/50 rounded-xl">
          {/* Avatar */}
          <div className="shrink-0">
            {emp.photo
              ? <img src={emp.photo} className="w-9 h-9 rounded-xl object-cover" alt=""/>
              : <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                  {emp.firstName?.[0]}{emp.lastName?.[0]}
                </div>
            }
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${deptCls(emp.department)}`}>{emp.department}</span>
            </div>
            {/* Scans timeline */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {scans.map((s, i) => {
                const cfg = ACTION_CFG[s.action] || ACTION_CFG['in']
                const Icon = cfg.icon
                return (
                  <span key={s._id || i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${cfg.cls}`}>
                    <Icon size={11}/>
                    {s.time}
                    {s.site && <span className="opacity-70">· {s.site}</span>}
                  </span>
                )
              })}
            </div>
          </div>
          {/* Hours worked for the day (if in + out) */}
          {(() => {
            const inScan  = scans.find(s => s.action === 'in' || s.action === 're-in')
            const outScan = scans.find(s => s.action === 'out')
            if (!inScan || !outScan) return null
            const [ih, im] = inScan.time.split(':').map(Number)
            const [oh, om] = outScan.time.split(':').map(Number)
            const mins = (oh*60+om) - (ih*60+im)
            if (mins <= 0) return null
            const h = Math.floor(mins/60), m = mins%60
            return (
              <div className="shrink-0 text-center">
                <p className="text-lg font-black text-slate-900 dark:text-white">{h}h{m > 0 ? String(m).padStart(2,'0') : ''}</p>
                <p className="text-[9px] text-slate-400">travaillé</p>
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(logs) {
  const header = ['Date', 'Heure', 'Employé', 'Département', 'Action', 'Chantier', 'Latitude', 'Longitude', 'Message']
  const rows = logs.map(l => [
    fmtDate(l.createdAt),
    fmt(l.createdAt),
    `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim(),
    l.employee?.department || '',
    ACTION_CFG[l.action]?.label || l.action,
    l.site || '',
    l.latitude  != null ? l.latitude  : '',
    l.longitude != null ? l.longitude : '',
    l.message || '',
  ])
  const csv  = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `historique_kiosque_${todayStr()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminKioskHistory() {
  const [logs, setLogs]           = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [view, setView]           = useState('table') // 'table' | 'timeline'

  // Filters
  const [date, setDate]             = useState(todayStr())
  const [empFilter, setEmpFilter]   = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch]         = useState('')

  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const params = { date, action: actionFilter }
      if (empFilter) params.employee = empFilter
      const [logsR, empsR] = await Promise.all([
        adminKiosk.getLogs(params),
        employees.length === 0 ? adminEmployees.getAll() : Promise.resolve({ data: employees })
      ])
      setLogs(logsR.data)
      if (employees.length === 0) setEmployees(empsR.data)
    } finally { setLoading(false) }
  }, [date, empFilter, actionFilter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Auto-refresh every 30s when enabled
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 30000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh, load])

  const displayed = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.employee?.firstName?.toLowerCase().includes(q) ||
      l.employee?.lastName?.toLowerCase().includes(q)  ||
      l.site?.toLowerCase().includes(q)
    )
  })

  // KPI summary
  const ins   = displayed.filter(l => l.action === 'in').length
  const outs  = displayed.filter(l => l.action === 'out').length
  const reins = displayed.filter(l => l.action === 're-in').length
  const uniqueEmps = new Set(displayed.map(l => l.employee?._id)).size

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Historique kiosque</h1>
          <p className="text-slate-500 text-sm mt-1">Journal de tous les passages au terminal</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400'
                : 'bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 text-slate-500'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}/>
            {autoRefresh ? 'Temps réel' : 'Pause'}
          </button>

          <button onClick={load} className="p-2 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
          </button>

          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900">
            {['table', 'timeline'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  view === v ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}>
                {v === 'table' ? 'Tableau' : 'Timeline'}
              </button>
            ))}
          </div>

          <button onClick={() => exportCsv(displayed)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 font-medium transition-colors">
            <Download size={13}/> CSV
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Scans total',      value: displayed.length, color: 'text-slate-900 dark:text-white' },
          { label: 'Entrées',          value: ins,              color: 'text-green-500'  },
          { label: 'Sorties',          value: outs,             color: 'text-orange-500' },
          { label: 'Employés distincts', value: uniqueEmps,     color: 'text-blue-500'   },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 px-4 py-3">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"/>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Action</label>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
            <option value="all">Toutes</option>
            <option value="in">Entrées</option>
            <option value="out">Sorties</option>
            <option value="re-in">Re-entrées</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Employé</label>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
            <option value="">Tous</option>
            {employees.map(e => (
              <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Recherche</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, chantier…"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"/>
          </div>
        </div>
        <button onClick={() => { setDate(todayStr()); setEmpFilter(''); setActionFilter('all'); setSearch('') }}
          className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-navy-600 rounded-xl hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
          Réinitialiser
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700">
          <Clock size={32} className="mx-auto mb-3 text-slate-300"/>
          <p className="text-slate-400 text-sm">Aucun scan trouvé pour ces filtres</p>
        </div>
      ) : view === 'timeline' ? (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
            Timeline du {fmtDate(date + 'T00:00:00')} · {uniqueEmps} employé{uniqueEmps !== 1 ? 's' : ''}
          </p>
          <DayTimeline logs={displayed}/>
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-800/50">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Heure</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Employé</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Département</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Chantier</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Localisation</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {displayed.map((log, i) => {
                  const cfg = ACTION_CFG[log.action] || ACTION_CFG['in']
                  const Icon = cfg.icon
                  const hasLoc = log.latitude != null && log.longitude != null
                  return (
                    <tr key={log._id || i} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/20 transition-colors">
                      {/* Time */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}/>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white tabular-nums">{log.time || fmt(log.createdAt)}</p>
                            <p className="text-[10px] text-slate-400">{fmtDate(log.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {log.employee?.photo
                            ? <img src={log.employee.photo} className="w-7 h-7 rounded-lg object-cover shrink-0" alt=""/>
                            : <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                              </div>
                          }
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white text-xs">
                              {log.employee?.firstName} {log.employee?.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">{log.employee?.position}</p>
                          </div>
                        </div>
                      </td>
                      {/* Department */}
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${deptCls(log.employee?.department)}`}>
                          {log.employee?.department || '—'}
                        </span>
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${cfg.cls}`}>
                          <Icon size={11}/> {cfg.label}
                        </span>
                      </td>
                      {/* Site */}
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{log.site || <span className="text-slate-300 dark:text-navy-600">—</span>}</td>
                      {/* Location */}
                      <td className="px-4 py-3">
                        {hasLoc ? (
                          <a
                            href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 font-medium">
                            <MapPin size={11}/> Voir sur la carte
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-navy-600 text-xs">—</span>
                        )}
                      </td>
                      {/* Message */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{log.message || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Footer count */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-800/30">
            <p className="text-xs text-slate-400">{displayed.length} entrée{displayed.length !== 1 ? 's' : ''} · Actualisation automatique {autoRefresh ? 'activée (30s)' : 'désactivée'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
