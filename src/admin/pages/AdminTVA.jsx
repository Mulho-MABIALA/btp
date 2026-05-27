import { useState, useEffect, useCallback } from 'react'
import { Loader2, Receipt, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { adminTVA } from '../adminApi'
import { exportCsv } from '../utils/exportCsv'

const fmt  = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtK = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n/1000)}k` : String(n || 0)

export default function AdminTVA() {
  const currentYear = new Date().getFullYear()
  const [year, setYear]   = useState(currentYear)
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminTVA.get(year); setData(r.data) } finally { setLoading(false) }
  }, [year])
  useEffect(() => { load() }, [load])

  if (loading || !data) return (
    <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
  )

  const { months, totalCollectee, totalDeductible, totalDue } = data

  const chartData = months.map(m => ({
    name: m.label.substring(0, 3),
    'TVA collectée': m.tvaCollectee,
    'TVA déductible': m.tvaDeductible,
    'Solde': m.solde,
  }))

  const doExport = () => exportCsv(`tva-${year}.csv`, months.map(m => ({
    Mois: m.label, 'TVA collectée': m.tvaCollectee, 'TVA déductible': m.tvaDeductible, Solde: m.solde,
  })))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Récapitulatif TVA</h1>
          <p className="text-slate-500 text-sm mt-1">Déclaration TVA annuelle</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Année</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={doExport} className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">↓ CSV</button>
        </div>
      </div>

      {/* KPI totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center mb-3"><TrendingUp size={16} className="text-white"/></div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{fmt(totalCollectee)} MAD</div>
          <div className="text-xs text-slate-500">TVA collectée (sur ventes)</div>
        </div>
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center mb-3"><TrendingDown size={16} className="text-white"/></div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{fmt(totalDeductible)} MAD</div>
          <div className="text-xs text-slate-500">TVA déductible (sur achats)</div>
        </div>
        <div className={`rounded-2xl border p-5 ${totalDue > 0 ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20' : 'bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700'}`}>
          <div className={`w-9 h-9 ${totalDue > 0 ? 'bg-amber-500' : 'bg-emerald-500'} rounded-xl flex items-center justify-center mb-3`}>
            {totalDue > 0 ? <AlertCircle size={16} className="text-white"/> : <Receipt size={16} className="text-white"/>}
          </div>
          <div className={`text-xl font-black ${totalDue > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmt(Math.abs(totalDue))} MAD</div>
          <div className="text-xs text-slate-500">{totalDue > 0 ? 'TVA à payer à l\'État' : 'Crédit TVA'}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Évolution mensuelle {year}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ left: 10 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)}/>
            <Tooltip formatter={v => fmt(v) + ' MAD'}/>
            <Legend />
            <Bar dataKey="TVA collectée"  fill="#10b981" radius={[4,4,0,0]}/>
            <Bar dataKey="TVA déductible" fill="#3b82f6" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tableau mensuel {year}</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-navy-700">
              {['Mois', 'TVA collectée', 'TVA déductible', 'Solde', 'Action'].map(h => (
                <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
            {months.map(m => (
              <tr key={m.month} className={`hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors ${m.month === new Date().getMonth() + 1 && year === currentYear ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}>
                <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white capitalize">{m.label}</td>
                <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">{fmt(m.tvaCollectee)} MAD</td>
                <td className="px-4 py-3.5 font-semibold text-blue-600 dark:text-blue-400">{fmt(m.tvaDeductible)} MAD</td>
                <td className="px-4 py-3.5 font-bold">
                  <span className={m.solde > 0 ? 'text-amber-600 dark:text-amber-400' : m.solde < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                    {m.solde > 0 ? '+' : ''}{fmt(m.solde)} MAD
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {m.solde > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">À payer</span>
                  ) : m.solde < 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">Crédit</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Néant</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-800">
              <td className="px-4 py-3.5 font-black text-slate-900 dark:text-white">TOTAL {year}</td>
              <td className="px-4 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{fmt(totalCollectee)} MAD</td>
              <td className="px-4 py-3.5 font-black text-blue-600 dark:text-blue-400">{fmt(totalDeductible)} MAD</td>
              <td className="px-4 py-3.5 font-black">
                <span className={totalDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}>
                  {totalDue > 0 ? '+' : ''}{fmt(totalDue)} MAD
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${totalDue > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'}`}>
                  {totalDue > 0 ? `${fmt(totalDue)} MAD à payer` : 'Crédit TVA'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  )
}
