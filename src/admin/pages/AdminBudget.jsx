import { useState, useEffect, useCallback } from 'react'
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { adminProjects, adminExpenses, adminInvoices } from '../adminApi'
import { exportCsv } from '../utils/exportCsv'

const fmt  = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtK = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n/1000)}k` : String(n || 0)

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316']

export default function AdminBudget() {
  const [projects, setProjects]   = useState([])
  const [expenses, setExpenses]   = useState([])
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pR, eR, iR] = await Promise.all([adminProjects.getAll(), adminExpenses.getAll(), adminInvoices.getAll()])
      setProjects(pR.data); setExpenses(eR.data); setInvoices(iR.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // Build per-project budget data
  const projectData = projects.map(p => {
    const projectExp = expenses.filter(e => e.project && e.project.toLowerCase().includes(p.title?.toLowerCase() || '___'))
    const projectInv = invoices.filter(i => i.project && i.project.toLowerCase().includes(p.title?.toLowerCase() || '___') && i.status === 'paid')
    const totalExpenses = projectExp.reduce((s, e) => s + (e.amount || 0), 0)
    const totalRevenue  = projectInv.reduce((s, i) => s + (i.amount || 0), 0)
    const budget        = p.budgetAmount || 0
    const spent         = p.spent || totalExpenses
    const variance      = budget - spent
    const usedPct       = budget > 0 ? Math.min(Math.round(spent / budget * 100), 100) : 0
    return { ...p, totalExpenses, totalRevenue, budget, spent, variance, usedPct }
  }).filter(p => p.budget > 0 || p.spent > 0)

  // Global stats
  const totalBudget   = projectData.reduce((s, p) => s + p.budget, 0)
  const totalSpent    = projectData.reduce((s, p) => s + p.spent, 0)
  const totalRevenue  = projectData.reduce((s, p) => s + p.totalRevenue, 0)
  const globalMargin  = totalRevenue > 0 ? Math.round((totalRevenue - totalSpent) / totalRevenue * 100) : 0

  // Expenses by category
  const catMap = {}
  expenses.forEach(e => {
    const cat = e.category || 'Autre'
    catMap[cat] = (catMap[cat] || 0) + (e.amount || 0)
  })
  const catData = Object.entries(catMap).sort((a,b) => b[1]-a[1]).map(([name, value]) => ({ name, value }))

  // Chart data
  const chartData = projectData.map(p => ({
    name: p.title?.length > 12 ? p.title.substring(0, 12) + '…' : p.title,
    Budget: p.budget,
    Dépensé: p.spent,
  }))

  const sel = selected ? projectData.find(p => p._id === selected) : null

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Budget analytique</h1>
          <p className="text-slate-500 text-sm mt-1">{projectData.length} projet{projectData.length > 1 ? 's' : ''} avec budget</p>
        </div>
        <button onClick={() => exportCsv('budget.csv', projectData.map(p => ({ Projet: p.title, Budget: p.budget, Dépensé: p.spent, Variance: p.variance, 'Utilisé %': p.usedPct })))}
          className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
          ↓ CSV
        </button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Budget total',   val: fmtK(totalBudget) + ' MAD',  icon: DollarSign,   color: 'bg-blue-500' },
          { label: 'Dépensé total',  val: fmtK(totalSpent) + ' MAD',   icon: TrendingDown, color: 'bg-orange-500' },
          { label: 'CA encaissé',    val: fmtK(totalRevenue) + ' MAD', icon: TrendingUp,   color: 'bg-emerald-500' },
          { label: 'Marge globale',  val: globalMargin + '%',           icon: BarChart3,    color: globalMargin >= 0 ? 'bg-violet-500' : 'bg-red-500' },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}><Icon size={16} className="text-white"/></div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div> : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Budget vs Dépensé chart */}
          <div className="lg:col-span-2 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Budget vs Dépensé par projet</h3>
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-slate-400"><BarChart3 size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">Aucune donnée budget</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ left: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} />
                  <Tooltip formatter={v => fmt(v) + ' MAD'} />
                  <Legend />
                  <Bar dataKey="Budget" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.6}/>
                  <Bar dataKey="Dépensé" fill="#f97316" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category breakdown */}
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Dépenses par catégorie</h3>
            {catData.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">Aucune dépense</p> : (
              <div className="space-y-3">
                {catData.map(({ name, value }, i) => {
                  const total = catData.reduce((s, d) => s + d.value, 0)
                  const pct = total > 0 ? Math.round(value / total * 100) : 0
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{name}</span>
                        <span className="text-slate-500">{fmtK(value)} MAD <span className="text-slate-400">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project table */}
      {projectData.length > 0 && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-navy-700">
                {['Projet', 'Budget prévu', 'Dépensé', 'Variance', 'Avancement budget', 'Statut'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
              {projectData.map(p => (
                <tr key={p._id} onClick={() => setSelected(selected === p._id ? null : p._id)}
                  className={`hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors cursor-pointer ${selected === p._id ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`}>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-900 dark:text-white">{p.title}</p>
                    {p.clientName && <p className="text-xs text-slate-400">{p.clientName}</p>}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{fmt(p.budget)} MAD</td>
                  <td className="px-4 py-3.5 font-semibold text-orange-600 dark:text-orange-400">{fmt(p.spent)} MAD</td>
                  <td className="px-4 py-3.5 font-bold">
                    <span className={p.variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {p.variance >= 0 ? '+' : ''}{fmt(p.variance)} MAD
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.usedPct > 90 ? 'bg-red-500' : p.usedPct > 70 ? 'bg-orange-400' : 'bg-blue-500'}`} style={{ width: `${p.usedPct}%` }}/>
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${p.usedPct > 90 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>{p.usedPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' :
                      p.status === 'active'    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' :
                      p.status === 'suspended' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' :
                                                 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'}`}>
                      {p.status === 'completed' ? 'Terminé' : p.status === 'active' ? 'En cours' : p.status === 'suspended' ? 'Suspendu' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
