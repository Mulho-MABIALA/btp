import { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, BarChart2, Download } from 'lucide-react'
import { adminReports } from '../adminApi'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtK = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : (n || 0)

const PIE_COLORS  = ['#3b82f6','#22c55e','#f97316','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']
const PROJ_COLORS = { active: '#3b82f6', completed: '#22c55e', suspended: '#f97316', pending: '#94a3b8' }
const PROJ_LABELS = { active: 'Actif', completed: 'Terminé', suspended: 'Suspendu', pending: 'En attente' }

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
        <Icon size={16} className="text-blue-500"/> {title}
      </h2>
      {action}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0b1628] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="text-slate-300">{p.name === 'revenue' ? 'Revenus' : p.name === 'expenses' ? 'Dépenses' : p.name === 'profit' ? 'Bénéfice' : p.name}</span>
          <span className="font-bold text-white ml-1">{fmtK(p.value)} MAD</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminReports() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminReports.get().then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const exportPDF = () => {
    if (!data) return
    const doc = new jsPDF()
    const { finance, monthly, expenseCategories, counts } = data

    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('RAPPORT FINANCIER — CONSTRUCTPRO', 15, 20)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 15, 28)

    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Résumé financier', 15, 42)
    autoTable(doc, {
      startY: 46,
      head: [["Indicateur", "Montant (MAD)"]],
      body: [
        ["Chiffre d'affaires", fmt(finance.totalRevenue)],
        ["Dépenses totales", fmt(finance.totalExpenses)],
        ["Bénéfice net", fmt(finance.netProfit)],
        ["Marge bénéficiaire", `${finance.margin}%`],
        ["En attente (factures)", fmt(finance.pendingAmount)],
      ],
      headStyles: { fillColor: [11, 22, 40] },
    })

    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Revenus & Dépenses mensuels', 15, doc.lastAutoTable.finalY + 15)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 19,
      head: [['Mois', 'Revenus (MAD)', 'Dépenses (MAD)', 'Bénéfice (MAD)']],
      body: monthly.map(m => [m.month, fmt(m.revenue), fmt(m.expenses), fmt(m.profit)]),
      headStyles: { fillColor: [37, 99, 235] },
    })

    if (expenseCategories?.length > 0) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold')
      doc.text('Dépenses par catégorie', 15, doc.lastAutoTable.finalY + 15)
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 19,
        head: [['Catégorie', 'Montant (MAD)', '% du total']],
        body: expenseCategories.map(c => [c.name, fmt(c.value), `${((c.value / (finance.totalExpenses || 1)) * 100).toFixed(1)}%`]),
        headStyles: { fillColor: [124, 58, 237] },
      })
    }

    doc.save(`rapport-constructpro-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
  if (!data) return null

  const { finance = {}, monthly = [], expenseCategories = [], projectStatusData = [], invoiceStatusData = [], stockCategories = [], hrByDepartment = [], counts = {}, totalSalaries = 0 } = data

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Rapports & Statistiques</h1>
          <p className="text-slate-500 text-sm mt-1">Vue analytique complète de l'entreprise</p>
        </div>
        <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-navy-700 dark:hover:bg-navy-600 text-white text-sm font-bold rounded-xl transition-colors">
          <Download size={15}/> Exporter PDF
        </button>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Chiffre d'affaires", val: fmtK(finance.totalRevenue) + ' MAD', icon: TrendingUp,   color: 'bg-emerald-500', sub: `Marge ${finance.margin}%` },
          { label: 'Dépenses totales',   val: fmtK(finance.totalExpenses) + ' MAD', icon: TrendingDown, color: 'bg-red-500',     sub: `Bénéfice ${fmtK(finance.netProfit)} MAD` },
          { label: 'Masse salariale',    val: fmtK(totalSalaries) + ' MAD/mois', icon: Users,        color: 'bg-violet-500',  sub: `${counts.employees || 0} employés` },
          { label: 'Factures émises',    val: counts.invoices || 0,             icon: DollarSign,   color: 'bg-blue-500',    sub: `${counts.clients || 0} clients` },
        ].map(({ label, val, icon: Icon, color, sub }) => (
          <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}><Icon size={18} className="text-white"/></div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Graphiques ligne 1 ── */}
      <div className="grid xl:grid-cols-3 gap-5">
        {/* Revenus 12 mois */}
        <div className="xl:col-span-2 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <SectionTitle icon={BarChart2} title="Revenus & Dépenses sur 12 mois"/>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={0.15}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#gR)" dot={false}/>
              <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gE)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Dépenses par catégorie */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <SectionTitle icon={BarChart2} title="Dépenses par catégorie"/>
          {expenseCategories.length === 0 ? <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune donnée</div> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={expenseCategories} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={2}>
                    {expenseCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v) => `${fmt(v)} MAD`}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {expenseCategories.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                    <span className="text-slate-500 flex-1 truncate">{c.name}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{fmtK(c.value)} MAD</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Graphiques ligne 2 ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Statut projets */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <SectionTitle icon={BarChart2} title="Projets par statut"/>
          {projectStatusData.length === 0 ? <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucun projet</div> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {projectStatusData.map((d, i) => <Cell key={i} fill={PROJ_COLORS[d.name] || PIE_COLORS[i]}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, PROJ_LABELS[n] || n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {projectStatusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: PROJ_COLORS[d.name] }}/>
                    <span className="text-slate-500">{PROJ_LABELS[d.name] || d.name}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Statut factures */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <SectionTitle icon={BarChart2} title="Factures par statut"/>
          {invoiceStatusData.length === 0 ? <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune facture</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={invoiceStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={v => ({ draft:'Brouillon', sent:'Envoyée', paid:'Payée', overdue:'En retard' }[v] || v)}/>
                <Tooltip/>
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {invoiceStatusData.map((d, i) => <Cell key={i} fill={({ draft:'#94a3b8', sent:'#3b82f6', paid:'#22c55e', overdue:'#ef4444' })[d.name] || '#3b82f6'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* RH par département */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <SectionTitle icon={Users} title="Effectif par département"/>
          {hrByDepartment.length === 0 ? <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucun employé</div> : (
            <div className="space-y-3 mt-2">
              {hrByDepartment.sort((a,b)=>b.value-a.value).map((d, i) => {
                const max = Math.max(...hrByDepartment.map(x=>x.value))
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[130px]">{d.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(d.value/max)*100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stock par catégorie */}
      {stockCategories.length > 0 && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <SectionTitle icon={BarChart2} title="Valeur du stock par catégorie (MAD)"/>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stockCategories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)}/>
              <Tooltip formatter={(v) => [`${fmt(v)} MAD`, 'Valeur']}/>
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                {stockCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
