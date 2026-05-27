import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Users, CheckSquare,
  AlertTriangle, Mail, ClipboardList, Package, Clock, Zap,
  Settings2, X, GripVertical, FileText, ListChecks, HardHat,
  Bell, ShoppingCart, Activity, Wrench, ShieldAlert, Truck,
  RefreshCw, Star, BarChart3, Calendar, Target, ChevronRight,
} from 'lucide-react'
import { adminAuth } from '../adminApi'

// ── Widget catalogue ───────────────────────────────────────────────────────
const WIDGET_DEFS = [
  { id: 'active_projects',   label: 'Projets actifs',          desc: 'Avancement des projets en cours' },
  { id: 'invoices',          label: 'Dernières factures',      desc: 'Liste des factures récentes' },
  { id: 'urgent_tasks',      label: 'Tâches prioritaires',     desc: 'Tâches urgentes / haute priorité' },
  { id: 'top_clients',       label: 'Top clients CA',          desc: 'Clients générateurs de revenus' },
  { id: 'aging',             label: 'Vieillissement créances', desc: 'Analyse des impayés par tranche' },
  { id: 'cash_flow',         label: 'Flux de trésorerie',      desc: 'Créances vs dettes fournisseurs' },
  { id: 'budget_burn',       label: 'Budget chantiers',        desc: 'Consommation budgétaire par projet' },
  { id: 'site_reports',      label: 'Rapports de chantier',    desc: 'Derniers rapports journaliers' },
  { id: 'hr_today',          label: 'RH du jour',              desc: 'Présences, absences et congés' },
  { id: 'week_hours',        label: 'Heures semaine',          desc: 'Heures pointées cette semaine' },
  { id: 'reminders_widget',  label: 'Rappels & échéances',     desc: 'Rappels urgents dans les 7 jours' },
  { id: 'equipment_alerts',  label: 'Maintenance équipements', desc: 'Équipements dont la maintenance est due' },
  { id: 'hse',               label: 'HSE / Sécurité',          desc: 'Incidents ouverts et alertes critiques' },
  { id: 'supplier_payments', label: 'Paiements fournisseurs',  desc: 'Échéances fournisseurs à 30 jours' },
  { id: 'subcontractors',    label: 'Soldes sous-traitants',   desc: 'Montants restants à payer' },
  { id: 'pending_po',        label: 'Bons de commande',        desc: 'Commandes en attente fournisseurs' },
  { id: 'recent_activity',   label: 'Activité récente',        desc: 'Dernières actions du journal' },
  { id: 'low_stock',         label: 'Alertes stock',           desc: 'Matériaux en dessous du seuil' },
  { id: 'revenue_chart',     label: 'Revenus & Dépenses',      desc: 'Graphique en aires des 6 derniers mois' },
  { id: 'tasks_pie',         label: 'Statut des tâches',       desc: 'Diagramme en donut par statut' },
  { id: 'messages',          label: 'Derniers messages',       desc: 'Contacts entrants non lus' },
  { id: 'quotes',            label: 'Derniers devis',          desc: 'Devis reçus récemment' },
]
const CHART_IDS       = ['revenue_chart', 'tasks_pie']
const DEFAULT_WIDGETS = WIDGET_DEFS.reduce((acc, w) => ({ ...acc, [w.id]: true }), {})
const DEFAULT_ORDER   = WIDGET_DEFS.map(w => w.id)
const LS_KEY          = 'dashboard_widgets'
const LS_ORDER_KEY    = 'dashboard_order'

function loadWidgets() {
  try { return { ...DEFAULT_WIDGETS, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') } }
  catch { return DEFAULT_WIDGETS }
}
function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_ORDER_KEY) || 'null')
    if (!Array.isArray(saved)) return DEFAULT_ORDER
    const missing = DEFAULT_ORDER.filter(id => !saved.includes(id))
    return [...saved, ...missing]
  } catch { return DEFAULT_ORDER }
}

// ── Animated counter ───────────────────────────────────────────────────────
function useAnimatedNumber(target, duration = 900) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const n = typeof target === 'number' && !isNaN(target) ? target : 0
    if (n === 0) { setVal(0); return }
    const start = performance.now()
    const tick  = (now) => {
      const t    = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(n * ease))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])
  return val
}

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = ({ h = 4, w = 'full', className = '' }) => (
  <div className={`bg-slate-100 dark:bg-navy-800 rounded-lg animate-pulse ${className}`}
    style={{ height: `${h * 4}px`, width: w === 'full' ? '100%' : w }} />
)

// ── Formatters ─────────────────────────────────────────────────────────────
const fmtK     = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}k` : String(n || 0)
const fmtMoney = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0) + ' FCFA'

function timeAgo(date) {
  const m = Math.floor((Date.now() - new Date(date)) / 60000)
  if (m < 1)  return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h/24)}j`
}

const PIE_COLORS    = ['#64748b','#3b82f6','#f97316','#22c55e']
const PRIORITY_LABEL = { urgent: 'Urgent', high: 'Haute', medium: 'Moyenne', low: 'Basse' }

const INVOICE_STATUS = {
  paid:    { label: 'Payée',      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  sent:    { label: 'Envoyée',   cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  draft:   { label: 'Brouillon', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400' },
  overdue: { label: 'En retard', cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  partial: { label: 'Partiel',   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
}
const ACTION_COLORS = {
  create: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  update: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  delete: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  login:  'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  email:  'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  export: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  other:  'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
}

// ── Design tokens ──────────────────────────────────────────────────────────
const CARD  = 'bg-white dark:bg-navy-900 rounded-2xl border border-slate-100 dark:border-navy-800'
const ROW   = 'flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 dark:border-navy-800/80 last:border-0'
const BADGE = 'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide'
const EMPTY = 'text-center text-slate-400 dark:text-slate-500 text-sm py-10'

// ── Chart tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }}/>
          <span className="text-slate-300">{p.name === 'revenue' ? 'Revenus' : 'Dépenses'}</span>
          <span className="font-bold text-white ml-1">{fmtK(p.value)} FCFA</span>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────
const ICON_CLR = {
  'bg-emerald-500':'text-emerald-500','bg-red-500':'text-red-500','bg-blue-500':'text-blue-500',
  'bg-amber-500':'text-amber-500','bg-violet-500':'text-violet-500','bg-indigo-500':'text-indigo-500',
  'bg-rose-500':'text-rose-500',
}
function KpiCard({ label, rawValue, value, sub, icon: Icon, color, trend, link }) {
  const animated = useAnimatedNumber(typeof rawValue === 'number' ? rawValue : 0)
  const display  = typeof rawValue === 'number'
    ? (rawValue >= 1e6 ? `${(animated/1e6).toFixed(1)}M` : rawValue >= 1e3 ? `${Math.round(animated/1e3)}k` : animated)
      + (rawValue > 100 ? ' FCFA' : '')
    : value
  const iconCls = ICON_CLR[color] || 'text-blue-500'
  const card = (
    <div className={`${CARD} p-4 hover:shadow-md hover:border-slate-200 dark:hover:border-navy-700 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-navy-800 flex items-center justify-center">
          <Icon size={15} className={iconCls}/>
        </div>
        {trend != null && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full
            ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{display}</div>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  )
  return link ? <Link to={link} className="block">{card}</Link> : card
}

// ── Widget card wrapper ────────────────────────────────────────────────────
function WCard({ title, icon: Icon, iconCls, link, onRefresh, refreshing, children, className = '' }) {
  return (
    <div className={`${CARD} overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 dark:border-navy-800/80 shrink-0">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          {Icon && <Icon size={13} className={iconCls || 'text-slate-400 dark:text-slate-500'}/>}
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} disabled={refreshing}
            className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors disabled:opacity-30">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''}/>
          </button>
          {link && (
            <Link to={link} className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              Voir <ChevronRight size={11}/>
            </Link>
          )}
        </div>
      </div>
      <div className="relative flex-1">
        {refreshing && (
          <div className="absolute inset-0 bg-white/70 dark:bg-navy-900/70 z-10 flex items-center justify-center">
            <RefreshCw size={13} className="animate-spin text-blue-400"/>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ── Priority badge ─────────────────────────────────────────────────────────
function PBadge({ priority }) {
  const cls = { urgent:'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400', high:'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400', medium:'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', low:'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400' }
  return <span className={`${BADGE} ${cls[priority]||cls.low}`}>{PRIORITY_LABEL[priority]||priority}</span>
}

// ══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [widgets,     setWidgets]     = useState(loadWidgets)
  const [widgetOrder, setWidgetOrder] = useState(loadOrder)
  const [showConfig,  setShowConfig]  = useState(false)
  const [dragging,    setDragging]    = useState(null)
  const [dragOver,    setDragOver]    = useState(null)
  const [period,      setPeriod]      = useState('month')
  const configRef = useRef(null)

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try { const r = await adminAuth.dashboard(period); setData(r.data) }
    finally { setLoading(false); setRefreshing(false) }
  }, [period])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  useEffect(() => {
    if (!showConfig) return
    const h = e => { if (configRef.current && !configRef.current.contains(e.target)) setShowConfig(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showConfig])

  const toggleWidget = id => setWidgets(prev => {
    const next = { ...prev, [id]: !prev[id] }
    localStorage.setItem(LS_KEY, JSON.stringify(next)); return next
  })
  const handleDragStart = id => setDragging(id)
  const handleDragOver  = (e, id) => { e.preventDefault(); setDragOver(id) }
  const handleDrop      = id => {
    if (!dragging || dragging === id) { setDragging(null); setDragOver(null); return }
    const arr  = [...widgetOrder]
    const from = arr.indexOf(dragging), to = arr.indexOf(id)
    arr.splice(from, 1); arr.splice(to, 0, dragging)
    setWidgetOrder(arr); localStorage.setItem(LS_ORDER_KEY, JSON.stringify(arr))
    setDragging(null); setDragOver(null)
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex items-center justify-between"><Sk h={7} w="200px"/><Sk h={8} w="200px"/></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array(6).fill(0).map((_,i)=>(
          <div key={i} className={`${CARD} p-4 space-y-3`}><Sk h={8} w="32px"/><Sk h={6} w="70%"/><Sk h={3} w="50%"/></div>
        ))}
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <div className={`${CARD} xl:col-span-2 p-4 space-y-3`}><Sk h={4} w="160px"/><Sk h={52}/></div>
        <div className={`${CARD} p-4 space-y-3`}><Sk h={4} w="120px"/><Sk h={36}/><Sk h={3}/><Sk h={3}/></div>
      </div>
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_,i)=>(
          <div key={i} className={`${CARD} p-4 space-y-2`}><Sk h={4} w="50%"/>{Array(3).fill(0).map((_,j)=><Sk key={j} h={3}/>)}</div>
        ))}
      </div>
    </div>
  )

  // ── Data ──────────────────────────────────────────────────────────────────
  const d = data || {}
  const {
    finance = {}, counts = {}, taskStats = {}, invoiceStats = {},
    monthlyData = [], recentInvoices = [], urgentTasks = [],
    lowStockMaterials = [], recentContacts = [], recentQuotes = [],
    activeProjects = [], upcomingReminders = [], hrToday = {},
    equipmentAlerts = [], hseStats = {}, cashFlow = {},
    recentActivity = [], pendingPOs = [], recentSiteReports = [],
    trends = {}, topClients = [], aging = {},
    supplierPayments = [], weekHours = {}, monthlyTarget = 0,
    subcontractorBalance = [],
  } = d

  const taskTotal   = (taskStats.todo||0)+(taskStats.inProgress||0)+(taskStats.review||0)+(taskStats.done||0)
  const activeTasks = (taskStats.todo||0)+(taskStats.inProgress||0)
  const taskPieData = [
    { name:'À faire',  value: taskStats.todo       || 0 },
    { name:'En cours', value: taskStats.inProgress || 0 },
    { name:'Révision', value: taskStats.review     || 0 },
    { name:'Terminé',  value: taskStats.done       || 0 },
  ].filter(x => x.value > 0)

  const periodLabel = { month:'Ce mois', quarter:'Ce trim.', year:'Cette année' }[trends.period||'month']
  const refresh = () => fetchDashboard(true)

  // ── Per-widget renderer ──────────────────────────────────────────────────
  const renderWidget = id => {
    switch (id) {

      // ── Projets actifs ────────────────────────────────────────────────
      case 'active_projects': return (
        <WCard key={id} title="Projets actifs" icon={Target} iconCls="text-blue-500"
          link="/admin/projects" onRefresh={refresh} refreshing={refreshing}>
          {activeProjects.length === 0
            ? <p className={EMPTY}>Aucun projet actif</p>
            : <div>{activeProjects.map(p => {
                const left = p.deliveryDate ? Math.ceil((new Date(p.deliveryDate)-Date.now())/86400000) : null
                return (
                  <div key={p._id} className="px-4 py-3 border-b border-slate-50 dark:border-navy-800/80 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate flex-1 mr-2">{p.title}</span>
                      <span className="text-xs font-bold text-blue-500 shrink-0">{p.progress||0}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{width:`${p.progress||0}%`}}/>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{p.clientName||'—'}</span>
                      {left !== null && (
                        <span className={left<0?'text-red-500 font-semibold':left<=14?'text-amber-500 font-semibold':''}>
                          {left<0?`Retard ${Math.abs(left)}j`:`J-${left}`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Factures ──────────────────────────────────────────────────────
      case 'invoices': return (
        <WCard key={id} title="Dernières factures" icon={FileText} iconCls="text-emerald-500"
          link="/admin/finance" onRefresh={refresh} refreshing={refreshing}>
          {recentInvoices.length === 0
            ? <p className={EMPTY}>Aucune facture</p>
            : <div>{recentInvoices.map(inv => {
                const s = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft
                return (
                  <div key={inv._id} className={ROW}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{inv.number}</span>
                        <span className={`${BADGE} ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{inv.client?.name}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">{fmtK(inv.amount)} FCFA</span>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Tâches urgentes ───────────────────────────────────────────────
      case 'urgent_tasks': return (
        <WCard key={id} title="Tâches prioritaires" icon={Zap} iconCls="text-orange-500"
          link="/admin/tasks" onRefresh={refresh} refreshing={refreshing}>
          {urgentTasks.length === 0
            ? <p className={EMPTY}>Aucune tâche urgente</p>
            : <div>{urgentTasks.slice(0,5).map(t => (
                <div key={t._id} className={ROW}>
                  <PBadge priority={t.priority}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                    <p className="text-[11px] text-slate-400">{t.assignee||'—'}{t.dueDate&&` · ${new Date(t.dueDate).toLocaleDateString('fr-FR')}`}</p>
                  </div>
                </div>
              ))}</div>
          }
        </WCard>
      )

      // ── Top clients ───────────────────────────────────────────────────
      case 'top_clients': return (
        <WCard key={id} title="Top clients CA" icon={Star} iconCls="text-amber-500"
          link="/admin/clients" onRefresh={refresh} refreshing={refreshing}>
          {topClients.length === 0
            ? <p className={EMPTY}>Aucune donnée</p>
            : <div>{topClients.map((c,i) => {
                const pct = Math.round((c.total/(topClients[0]?.total||1))*100)
                return (
                  <div key={c._id||i} className="px-4 py-3 border-b border-slate-50 dark:border-navy-800/80 last:border-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black text-slate-300 dark:text-slate-600 w-4">#{i+1}</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">{c.name}</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">{fmtK(c.total)} FCFA</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{width:`${pct}%`}}/>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{c.count} fact.</span>
                    </div>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Vieillissement créances ───────────────────────────────────────
      case 'aging': return (
        <WCard key={id} title="Vieillissement créances" icon={BarChart3} iconCls="text-rose-500"
          link="/admin/finance" onRefresh={refresh} refreshing={refreshing}>
          {(aging.total||0) === 0
            ? <p className={EMPTY}>Aucune créance en cours</p>
            : <div className="p-4 space-y-3">
                {[
                  {label:'0–30 j',  val:aging.current||0, bar:'bg-emerald-400', txt:'text-emerald-600 dark:text-emerald-400'},
                  {label:'31–60 j', val:aging.d30||0,     bar:'bg-amber-400',   txt:'text-amber-600 dark:text-amber-400'},
                  {label:'61–90 j', val:aging.d60||0,     bar:'bg-orange-500',  txt:'text-orange-600 dark:text-orange-400'},
                  {label:'90+ j',   val:aging.d90plus||0, bar:'bg-red-500',     txt:'text-red-600 dark:text-red-400'},
                ].map(({label,val,bar,txt}) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">{label}</span>
                      <span className={`font-bold ${txt}`}>{fmtMoney(val)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full`} style={{width:`${aging.total?Math.round(val/aging.total*100):0}%`}}/>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-navy-700 text-xs">
                  <span className="text-slate-400">Total créances</span>
                  <span className="font-black text-slate-700 dark:text-slate-200">{fmtMoney(aging.total)}</span>
                </div>
              </div>
          }
        </WCard>
      )

      // ── Flux de trésorerie ────────────────────────────────────────────
      case 'cash_flow': return (
        <WCard key={id} title="Flux de trésorerie" icon={DollarSign} iconCls="text-emerald-500"
          link="/admin/finance" onRefresh={refresh} refreshing={refreshing}>
          <div className="p-4 space-y-2">
            {[
              {label:'Créances clients', val:cashFlow.receivables||0, cls:'bg-blue-50 dark:bg-blue-500/10', txt:'text-blue-600 dark:text-blue-400', sub:'Factures en cours'},
              {label:'Dettes fournisseurs', val:cashFlow.payables||0, cls:'bg-red-50 dark:bg-red-500/10', txt:'text-red-600 dark:text-red-400', sub:'Bons de commande actifs'},
              {label:'Soldes sous-traitants', val:cashFlow.subDebt||0, cls:'bg-amber-50 dark:bg-amber-500/10', txt:'text-amber-600 dark:text-amber-400', sub:'Contrats en cours'},
            ].map(({label,val,cls,txt,sub})=>(
              <div key={label} className={`${cls} rounded-xl p-3 flex items-center justify-between`}>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                </div>
                <span className={`text-base font-black ${txt}`}>{fmtK(val)} FCFA</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 font-medium">Position nette</span>
              <span className={`font-black text-sm ${((cashFlow.receivables||0)-(cashFlow.payables||0)-(cashFlow.subDebt||0))>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>
                {fmtMoney((cashFlow.receivables||0)-(cashFlow.payables||0)-(cashFlow.subDebt||0))}
              </span>
            </div>
          </div>
        </WCard>
      )

      // ── Budget chantiers ──────────────────────────────────────────────
      case 'budget_burn': return (
        <WCard key={id} title="Budget chantiers" icon={Target} iconCls="text-emerald-500"
          link="/admin/projects" onRefresh={refresh} refreshing={refreshing}>
          {activeProjects.filter(p=>p.budgetAmount>0).length === 0
            ? <p className={EMPTY}>Aucun budget renseigné</p>
            : <div>{activeProjects.filter(p=>p.budgetAmount>0).map(p => {
                const pct  = Math.min(Math.round((p.spent||0)/p.budgetAmount*100),100)
                const over = (p.spent||0) > p.budgetAmount
                return (
                  <div key={p._id} className="px-4 py-3 border-b border-slate-50 dark:border-navy-800/80 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex-1 mr-2">{p.title}</span>
                      <span className={`text-xs font-bold shrink-0 ${over?'text-red-500':pct>80?'text-amber-500':'text-emerald-600 dark:text-emerald-400'}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${over?'bg-red-500':pct>80?'bg-amber-400':'bg-emerald-400'}`} style={{width:`${pct}%`}}/>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{fmtK(p.spent||0)} / {fmtK(p.budgetAmount)} FCFA</span>
                      {over
                        ? <span className="text-red-500 font-semibold">+{fmtK((p.spent||0)-p.budgetAmount)} dépassé</span>
                        : <span>Reste {fmtK(p.budgetAmount-(p.spent||0))} FCFA</span>
                      }
                    </div>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Rapports de chantier ──────────────────────────────────────────
      case 'site_reports': return (
        <WCard key={id} title="Rapports de chantier" icon={HardHat} iconCls="text-green-600"
          link="/admin/site-reports" onRefresh={refresh} refreshing={refreshing}>
          {recentSiteReports.length === 0
            ? <p className={EMPTY}>Aucun rapport récent</p>
            : <div>{recentSiteReports.map(r => (
                <div key={r._id} className={ROW}>
                  <div className="w-8 h-8 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <HardHat size={13} className="text-green-600 dark:text-green-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {typeof r.project==='object' ? r.project?.title : r.project || 'Chantier'}
                    </p>
                    <p className="text-[11px] text-slate-400">{r.author||'—'}{r.weather?` · ${r.weather}`:''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-400">{new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</p>
                    {r.progress!=null && <p className="text-[11px] font-bold text-blue-500">{r.progress}%</p>}
                  </div>
                </div>
              ))}</div>
          }
        </WCard>
      )

      // ── RH du jour ────────────────────────────────────────────────────
      case 'hr_today': return (
        <WCard key={id} title="RH du jour" icon={Users} iconCls="text-violet-500"
          link="/admin/attendance" onRefresh={refresh} refreshing={refreshing}>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                {n:hrToday.presentCount||0, label:'Présents', cls:'text-emerald-600 dark:text-emerald-400', bg:'bg-emerald-50 dark:bg-emerald-500/10'},
                {n:hrToday.absentCount||0,  label:'Absents',  cls:'text-red-600 dark:text-red-400',         bg:'bg-red-50 dark:bg-red-500/10'},
                {n:(hrToday.onLeave||[]).length, label:'Congés', cls:'text-amber-600 dark:text-amber-400',  bg:'bg-amber-50 dark:bg-amber-500/10'},
              ].map(({n,label,cls,bg})=>(
                <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                  <div className={`text-xl font-black ${cls}`}>{n}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {(hrToday.totalActive||0) > 0 && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Taux présence</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {Math.round(((hrToday.presentCount||0)/hrToday.totalActive)*100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{width:`${Math.round(((hrToday.presentCount||0)/hrToday.totalActive)*100)}%`}}/>
                </div>
              </div>
            )}
            {(hrToday.onLeave||[]).slice(0,3).map((l,i)=>(
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {l.employee?`${l.employee.firstName} ${l.employee.lastName}`:'—'}
                </span>
                <span className="text-slate-400">jusqu'au {new Date(l.endDate).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span>
              </div>
            ))}
          </div>
        </WCard>
      )

      // ── Heures semaine ────────────────────────────────────────────────
      case 'week_hours': return (
        <WCard key={id} title="Heures semaine" icon={Clock} iconCls="text-indigo-500"
          link="/admin/attendance" onRefresh={refresh} refreshing={refreshing}>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{weekHours.total||0}<span className="text-sm">h</span></div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pointées</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{weekHours.overtime||0}<span className="text-sm">h</span></div>
                <div className="text-[10px] text-slate-400 mt-0.5">Heures sup.</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-500"><span>Employés actifs</span><span className="font-semibold text-slate-700 dark:text-slate-200">{weekHours.employeeCount||0}</span></div>
              <div className="flex justify-between text-slate-500"><span>Jours pointés</span><span className="font-semibold text-slate-700 dark:text-slate-200">{weekHours.daysLogged||0}</span></div>
              {(weekHours.employeeCount||0)>0 && (
                <div className="flex justify-between text-slate-500 border-t border-slate-100 dark:border-navy-700 pt-1.5">
                  <span>Moy. / employé</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.round((weekHours.total||0)/weekHours.employeeCount)}h</span>
                </div>
              )}
            </div>
          </div>
        </WCard>
      )

      // ── Rappels ───────────────────────────────────────────────────────
      case 'reminders_widget': return (
        <WCard key={id} title="Rappels & échéances" icon={Bell} iconCls="text-amber-500"
          link="/admin/reminders" onRefresh={refresh} refreshing={refreshing}>
          {upcomingReminders.length === 0
            ? <p className={EMPTY}>Aucun rappel urgent</p>
            : <div>{upcomingReminders.map(r => {
                const left = r.dueDate ? Math.ceil((new Date(r.dueDate)-Date.now())/86400000) : null
                const cls  = left==null?'text-slate-400':left<0?'text-red-500 font-semibold':left<=3?'text-amber-500 font-medium':'text-slate-400'
                return (
                  <div key={r._id} className={ROW}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`${BADGE} bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400`}>{r.type}</span>
                        {r.priority&&r.priority!=='normal'&&<PBadge priority={r.priority}/>}
                      </div>
                    </div>
                    {left!=null && <span className={`text-xs shrink-0 ${cls}`}>{left<0?`J+${Math.abs(left)}`:left===0?'Auj.': `J-${left}`}</span>}
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Maintenance équipements ───────────────────────────────────────
      case 'equipment_alerts': return (
        <WCard key={id} title="Maintenance équipements" icon={Wrench} iconCls="text-amber-500"
          link="/admin/equipment" onRefresh={refresh} refreshing={refreshing}>
          {equipmentAlerts.length === 0
            ? <p className={EMPTY}>Aucune maintenance imminente</p>
            : <div>{equipmentAlerts.map(eq => {
                const days = eq.nextMaintenanceDate ? Math.ceil((new Date(eq.nextMaintenanceDate)-Date.now())/86400000) : null
                const cls  = days==null?'text-slate-400':days<=0?'text-red-500 font-bold':days<=3?'text-amber-500 font-semibold':'text-slate-400'
                return (
                  <div key={eq._id} className={ROW}>
                    <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <Wrench size={13} className="text-amber-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{eq.name}</p>
                      <p className="text-[11px] text-slate-400">{eq.type||'—'}</p>
                    </div>
                    <span className={`text-xs shrink-0 ${cls}`}>{days==null?'—':days<=0?`${Math.abs(days)}j retard`:days===0?'Auj.':`Dans ${days}j`}</span>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── HSE ───────────────────────────────────────────────────────────
      case 'hse': return (
        <WCard key={id} title="HSE / Sécurité" icon={ShieldAlert} iconCls="text-red-500"
          link="/admin/hse" onRefresh={refresh} refreshing={refreshing}>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                {n:hseStats.open||0,       label:'Ouverts',  cls:'text-red-600 dark:text-red-400',    bg:'bg-red-50 dark:bg-red-500/10'},
                {n:hseStats.inProgress||0, label:'En cours', cls:'text-amber-600 dark:text-amber-400', bg:'bg-amber-50 dark:bg-amber-500/10'},
                {n:hseStats.critical||0,   label:'Critiques',cls:'text-rose-700 dark:text-rose-400',   bg:'bg-rose-50 dark:bg-rose-500/10'},
              ].map(({n,label,cls,bg})=>(
                <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                  <div className={`text-xl font-black ${cls}`}>{n}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {hseStats.lastIncident && (
              <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <AlertTriangle size={9}/> Dernier incident
                </p>
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">{hseStats.lastIncident.title}</p>
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                  {hseStats.lastIncident.date&&new Date(hseStats.lastIncident.date).toLocaleDateString('fr-FR')}
                  {hseStats.lastIncident.site&&` · ${hseStats.lastIncident.site}`}
                </p>
              </div>
            )}
            {!hseStats.lastIncident&&!(hseStats.open)&&<p className="text-center text-emerald-600 dark:text-emerald-400 text-sm font-semibold py-1">✓ Aucun incident ouvert</p>}
          </div>
        </WCard>
      )

      // ── Paiements fournisseurs ────────────────────────────────────────
      case 'supplier_payments': return (
        <WCard key={id} title="Paiements fournisseurs" icon={Calendar} iconCls="text-purple-500"
          link="/admin/purchase-orders" onRefresh={refresh} refreshing={refreshing}>
          {supplierPayments.length === 0
            ? <p className={EMPTY}>Aucune échéance dans 30 jours</p>
            : <div>{supplierPayments.map(po => {
                const days = po.deliveryDate ? Math.ceil((new Date(po.deliveryDate)-Date.now())/86400000) : null
                const cls  = days==null?'text-slate-400':days<=0?'text-red-500 font-bold':days<=7?'text-amber-500 font-semibold':'text-purple-500'
                return (
                  <div key={po._id} className={ROW}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{po.number}</p>
                      <p className="text-[11px] text-slate-400 truncate">{po.supplier?.name||'—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmtK(po.total)} FCFA</p>
                      <p className={`text-[11px] ${cls}`}>{days==null?'—':days<=0?`${Math.abs(days)}j retard`:`Dans ${days}j`}</p>
                    </div>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Sous-traitants ────────────────────────────────────────────────
      case 'subcontractors': return (
        <WCard key={id} title="Soldes sous-traitants" icon={Wrench} iconCls="text-orange-500"
          link="/admin/subcontractors" onRefresh={refresh} refreshing={refreshing}>
          {subcontractorBalance.length === 0
            ? <p className={EMPTY}>Aucun solde en attente</p>
            : <div>{subcontractorBalance.map((s,i) => {
                const pct = s.contractAmount>0 ? Math.round(s.paidAmount/s.contractAmount*100) : 0
                return (
                  <div key={i} className="px-4 py-3 border-b border-slate-50 dark:border-navy-800/80 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex-1 mr-2">{s.name}</span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 shrink-0">{fmtMoney(s.balance)}</span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-orange-300 rounded-full" style={{width:`${pct}%`}}/>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{fmtMoney(s.paidAmount)} payé</span>
                      <span>/ {fmtMoney(s.contractAmount)}</span>
                    </div>
                  </div>
                )
              })}</div>
          }
        </WCard>
      )

      // ── Bons de commande ──────────────────────────────────────────────
      case 'pending_po': return (
        <WCard key={id} title="Bons de commande en attente" icon={Truck} iconCls="text-blue-500"
          link="/admin/purchase-orders" onRefresh={refresh} refreshing={refreshing}>
          {pendingPOs.length === 0
            ? <p className={EMPTY}>Aucun bon de commande en attente</p>
            : <div>{pendingPOs.map(po => (
                <div key={po._id} className={ROW}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{po.number}</p>
                    <p className="text-[11px] text-slate-400 truncate">{po.supplier?.name||'—'}{po.orderDate&&` · ${new Date(po.orderDate).toLocaleDateString('fr-FR')}`}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">{fmtMoney(po.total)}</span>
                </div>
              ))}</div>
          }
        </WCard>
      )

      // ── Activité récente ──────────────────────────────────────────────
      case 'recent_activity': return (
        <WCard key={id} title="Activité récente" icon={Activity} iconCls="text-indigo-500"
          link="/admin/activity-log" onRefresh={refresh} refreshing={refreshing}>
          {recentActivity.length === 0
            ? <p className={EMPTY}>Aucune activité récente</p>
            : <div>{recentActivity.map(a => (
                <div key={a._id} className={`${ROW} gap-2`}>
                  <span className={`${BADGE} shrink-0 ${ACTION_COLORS[a.action]||ACTION_COLORS.other}`}>{a.action}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">
                      <span className="font-semibold">{a.entity}</span>{a.entityLabel&&` · ${a.entityLabel}`}
                    </p>
                    <p className="text-[10px] text-slate-400">{a.user||'Système'}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(a.createdAt)}</span>
                </div>
              ))}</div>
          }
        </WCard>
      )

      // ── Alertes stock ─────────────────────────────────────────────────
      case 'low_stock': return lowStockMaterials.length === 0 ? null : (
        <WCard key={id} title="Alertes stock" icon={AlertTriangle} iconCls="text-amber-500"
          link="/admin/inventory" onRefresh={refresh} refreshing={refreshing}>
          <div>{lowStockMaterials.map(m => (
            <div key={m._id} className={ROW}>
              <div className="w-7 h-7 bg-amber-50 dark:bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Package size={12} className="text-amber-500"/>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{m.name}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">{m.quantity} {m.unit}</span>
            </div>
          ))}</div>
        </WCard>
      )

      // ── Messages ──────────────────────────────────────────────────────
      case 'messages': return recentContacts.length === 0 ? null : (
        <WCard key={id} title="Nouveaux messages" icon={Mail} iconCls="text-blue-500"
          link="/admin/contacts" onRefresh={refresh} refreshing={refreshing}>
          <div>{recentContacts.map(c => (
            <div key={c._id} className={ROW}>
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center shrink-0 text-blue-500 font-bold text-xs">{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{c.subject||c.email}</p>
              </div>
            </div>
          ))}</div>
        </WCard>
      )

      // ── Devis ─────────────────────────────────────────────────────────
      case 'quotes': return recentQuotes.length === 0 ? null : (
        <WCard key={id} title="Nouveaux devis" icon={ClipboardList} iconCls="text-orange-500"
          link="/admin/quotes" onRefresh={refresh} refreshing={refreshing}>
          <div>{recentQuotes.map(q => (
            <div key={q._id} className={ROW}>
              <div className="w-8 h-8 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center shrink-0 text-orange-500 font-bold text-xs">{q.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{q.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{q.serviceType||q.email}</p>
              </div>
              {q.budget && <span className="text-xs text-slate-400 shrink-0">{q.budget}</span>}
            </div>
          ))}</div>
        </WCard>
      )

      default: return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-[1600px]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Tableau de bord</h1>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-sm text-slate-400 capitalize mr-1">
              {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
            </span>
            {upcomingReminders.length > 0 && (
              <Link to="/admin/reminders"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                <Bell size={10}/>{upcomingReminders.length} rappel{upcomingReminders.length>1?'s':''}
              </Link>
            )}
            {activeTasks > 0 && (
              <Link to="/admin/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                <CheckSquare size={10}/>{activeTasks} tâche{activeTasks>1?'s':''}
              </Link>
            )}
            {(counts.newContacts||0)>0 && (
              <Link to="/admin/contacts"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors">
                <Mail size={10}/>{counts.newContacts} message{counts.newContacts>1?'s':''}
              </Link>
            )}
            {(counts.newQuotes||0)>0 && (
              <Link to="/admin/quotes"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors">
                <ClipboardList size={10}/>{counts.newQuotes} devis
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sélecteur période */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-navy-800 rounded-xl p-1">
            {[['month','Mois'],['quarter','Trim.'],['year','Année']].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all
                  ${period===v?'bg-white dark:bg-navy-700 text-blue-600 dark:text-blue-400 shadow-sm':'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={refresh} disabled={refreshing}
            className={`${CARD} p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-40`}>
            <RefreshCw size={14} className={refreshing?'animate-spin':''}/>
          </button>

          {/* Config */}
          <div className="relative" ref={configRef}>
            <button onClick={()=>setShowConfig(s=>!s)}
              className={`p-2 rounded-xl border text-sm font-medium transition-all
                ${showConfig?'bg-blue-500 border-blue-500 text-white':'bg-white dark:bg-navy-900 border-slate-100 dark:border-navy-800 text-slate-400 hover:text-blue-500'}`}>
              <Settings2 size={14}/>
            </button>
            {showConfig && (
              <div className="absolute right-0 top-full mt-2 w-76 bg-white dark:bg-navy-900 rounded-2xl border border-slate-100 dark:border-navy-800 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 dark:border-navy-800">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">Widgets</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Glisser pour réordonner</span>
                    <button onClick={()=>setShowConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={13}/></button>
                  </div>
                </div>
                <div className="p-2 space-y-0.5 max-h-[400px] overflow-y-auto">
                  {widgetOrder.map(id => {
                    const w = WIDGET_DEFS.find(d=>d.id===id)
                    if (!w) return null
                    return (
                      <div key={w.id} draggable
                        onDragStart={()=>handleDragStart(w.id)} onDragOver={e=>handleDragOver(e,w.id)}
                        onDrop={()=>handleDrop(w.id)} onDragEnd={()=>{setDragging(null);setDragOver(null)}}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-grab active:cursor-grabbing
                          ${dragOver===w.id?'bg-blue-50 dark:bg-blue-500/10':' hover:bg-slate-50 dark:hover:bg-navy-800'}
                          ${dragging===w.id?'opacity-40':''}`}>
                        <GripVertical size={12} className="text-slate-300 dark:text-slate-600 shrink-0"/>
                        <input type="checkbox" checked={!!widgets[w.id]} onChange={()=>toggleWidget(w.id)}
                          className="w-3.5 h-3.5 rounded accent-blue-500 shrink-0" onClick={e=>e.stopPropagation()}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none">{w.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{w.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-50 dark:border-navy-800">
                  <button onClick={()=>{ setWidgets(DEFAULT_WIDGETS); localStorage.setItem(LS_KEY,JSON.stringify(DEFAULT_WIDGETS)); setWidgetOrder(DEFAULT_ORDER); localStorage.removeItem(LS_ORDER_KEY) }}
                    className="text-xs text-slate-400 hover:text-blue-500 transition-colors">
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Chiffre d'affaires" rawValue={finance.totalRevenue}
          sub={`${periodLabel} : ${fmtK(trends.currRev||0)} FCFA`}
          icon={TrendingUp} color="bg-emerald-500" trend={trends.revenue} link="/admin/finance"/>
        <KpiCard label="Dépenses totales" rawValue={finance.totalExpenses}
          sub="Toutes catégories"
          icon={TrendingDown} color="bg-red-500" trend={trends.expenses} link="/admin/finance"/>
        <KpiCard label="Bénéfice net" rawValue={finance.netProfit}
          sub={(finance.netProfit||0)>=0?'Positif':'Négatif'}
          icon={DollarSign} color={(finance.netProfit||0)>=0?'bg-blue-500':'bg-rose-500'}/>
        <KpiCard label="En attente" rawValue={finance.pendingAmount}
          sub={`${invoiceStats.sent||0} facture${(invoiceStats.sent||0)>1?'s':''}`}
          icon={Clock} color="bg-amber-500" link="/admin/finance"/>
        <KpiCard label="Clients actifs" value={counts.clients||0}
          sub={`${counts.projects||0} projet${(counts.projects||0)>1?'s':''}`}
          icon={Users} color="bg-violet-500" trend={trends.clients} link="/admin/clients"/>
        <KpiCard label="Tâches actives" value={activeTasks}
          sub={`${taskStats.done||0} terminée${(taskStats.done||0)>1?'s':''}`}
          icon={CheckSquare} color="bg-indigo-500" trend={trends.tasks} link="/admin/tasks"/>
      </div>

      {/* ── Objectif mensuel ─────────────────────────────────────────────── */}
      {monthlyTarget > 0 && (() => {
        const pct  = Math.min(Math.round((trends.currRev||0)/monthlyTarget*100), 100)
        const over = pct >= 100
        return (
          <div className={`${CARD} px-5 py-3.5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Target size={13} className="text-blue-500"/> Objectif CA mensuel
              </span>
              <span className={`text-sm font-black ${over?'text-emerald-500':'text-blue-500'}`}>
                {fmtK(trends.currRev||0)} / {fmtK(monthlyTarget)} FCFA · {pct}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${over?'bg-emerald-400':'bg-blue-500'}`} style={{width:`${pct}%`}}/>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {over?`Objectif dépassé de ${fmtK((trends.currRev||0)-monthlyTarget)} FCFA`:`Encore ${fmtK(monthlyTarget-(trends.currRev||0))} FCFA`}
            </p>
          </div>
        )
      })()}

      {/* ── Graphiques ──────────────────────────────────────────────────── */}
      {(widgets.revenue_chart || widgets.tasks_pie) && (
        <div className={`grid gap-4 ${widgets.revenue_chart&&widgets.tasks_pie?'xl:grid-cols-3':''}`}>
          {widgets.revenue_chart && (
            <WCard title="Revenus & Dépenses" icon={TrendingUp} iconCls="text-blue-500"
              link="/admin/finance" onRefresh={refresh} refreshing={refreshing}
              className={widgets.tasks_pie?'xl:col-span-2':''}>
              <div className="px-4 pb-4 pt-1">
                <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block"/>Revenus</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block"/>Dépenses</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyData} margin={{top:5,right:5,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f87171" stopOpacity={0.08}/>
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="revenue"  stroke="#3b82f6" strokeWidth={1.5} fill="url(#gR)" dot={{fill:'#3b82f6',r:2}} activeDot={{r:4}}/>
                    <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={1.5} fill="url(#gE)" dot={{fill:'#f87171',r:2}} activeDot={{r:4}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </WCard>
          )}
          {widgets.tasks_pie && (
            <WCard title="Statut des tâches" icon={CheckSquare} iconCls="text-indigo-500"
              link="/admin/tasks" onRefresh={refresh} refreshing={refreshing}>
              {taskTotal === 0
                ? <p className={EMPTY}>Aucune tâche</p>
                : <div className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                          {taskPieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                        </Pie>
                        <Tooltip formatter={(v,n)=>[v,n]}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {[{label:'À faire',val:taskStats.todo||0,c:'bg-slate-400'},{label:'En cours',val:taskStats.inProgress||0,c:'bg-blue-500'},{label:'Révision',val:taskStats.review||0,c:'bg-orange-400'},{label:'Terminé',val:taskStats.done||0,c:'bg-emerald-500'}].map(({label,val,c})=>(
                        <div key={label} className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 ${c} rounded-full shrink-0`}/>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-auto">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
              }
            </WCard>
          )}
        </div>
      )}

      {/* ── Actions rapides ──────────────────────────────────────────────── */}
      <div className={`${CARD} px-4 py-3 flex items-center gap-1.5 flex-wrap`}>
        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mr-1">Créer</span>
        <div className="w-px h-3.5 bg-slate-100 dark:bg-navy-800"/>
        {[
          {to:'/admin/finance',         icon:FileText,    label:'Facture',         cls:'bg-blue-500 hover:bg-blue-600 text-white'},
          {to:'/admin/tasks',           icon:ListChecks,  label:'Tâche',           cls:'bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300'},
          {to:'/admin/site-reports',    icon:HardHat,     label:'Rapport chantier',cls:'bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300'},
          {to:'/admin/reminders',       icon:Bell,        label:'Rappel',          cls:'bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300'},
          {to:'/admin/purchase-orders', icon:ShoppingCart,label:'Bon de commande', cls:'bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300'},
        ].map(({to,icon:I,label,cls})=>(
          <Link key={to} to={to} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${cls}`}>
            <I size={11}/>{label}
          </Link>
        ))}
      </div>

      {/* ── Widgets grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {widgetOrder
          .filter(id => !CHART_IDS.includes(id) && widgets[id])
          .map(id => renderWidget(id))
        }
      </div>

    </div>
  )
}
