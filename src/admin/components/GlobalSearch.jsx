import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, FolderOpen, Receipt, CheckSquare, Package, Users, Truck, X, Loader2 } from 'lucide-react'
import { adminSearch } from '../adminApi'

const TYPE_ICON = {
  client:   User,
  project:  FolderOpen,
  invoice:  Receipt,
  task:     CheckSquare,
  material: Package,
  employee: Users,
  supplier: Truck,
}

const TYPE_LABEL = {
  client:   'Client',
  project:  'Projet',
  invoice:  'Facture',
  task:     'Tâche',
  material: 'Matériau',
  employee: 'Employé',
  supplier: 'Fournisseur',
}

const TYPE_COLOR = {
  client:   'bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  project:  'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  invoice:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  task:     'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  material: 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  employee: 'bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
  supplier: 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
}

export default function GlobalSearch() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const ref                   = useRef(null)
  const navigate              = useNavigate()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    const timer = setTimeout(() => {
      adminSearch.query(query).then(r => {
        setResults(r.data.results || [])
        setOpen(true)
      }).catch(() => {}).finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (link) => {
    setQuery('')
    setOpen(false)
    navigate(link)
  }

  const clear = () => { setQuery(''); setResults([]); setOpen(false) }

  return (
    <div ref={ref} className="relative w-56 xl:w-72">
      <div className="relative flex items-center">
        {loading
          ? <Loader2 size={14} className="absolute left-3 text-slate-400 animate-spin" />
          : <Search size={14} className="absolute left-3 text-slate-400" />
        }
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Recherche globale…"
          className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-navy-700 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
        />
        {query && (
          <button onClick={clear} className="absolute right-2.5 text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl shadow-black/20 z-50 overflow-hidden max-h-80 overflow-y-auto">
          <div className="divide-y divide-slate-50 dark:divide-navy-800">
            {results.map((r, i) => {
              const Icon = TYPE_ICON[r.type] || Search
              const color = TYPE_COLOR[r.type] || TYPE_COLOR.client
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(r.link)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-slate-400 truncate">{r.sub}</p>}
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${color}`}>
                    {TYPE_LABEL[r.type]}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:bg-navy-800/50">
            <p className="text-[10px] text-slate-400">{results.length} résultat{results.length > 1 ? 's' : ''} pour « {query} »</p>
          </div>
        </div>
      )}

      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-xl z-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-400">Aucun résultat pour « {query} »</p>
        </div>
      )}
    </div>
  )
}
