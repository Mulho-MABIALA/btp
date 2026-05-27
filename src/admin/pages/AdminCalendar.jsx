import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckSquare, Receipt, ShoppingCart, HardHat, Plus } from 'lucide-react'
import { adminTasks, adminInvoices, adminPurchaseOrders, adminSiteReports } from '../adminApi'
import { useNavigate } from 'react-router-dom'

const DAYS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const EVENT_TYPES = {
  task:          { icon: CheckSquare, color: 'bg-blue-500',   label: 'Tâche',    dot: 'bg-blue-400' },
  invoice:       { icon: Receipt,     color: 'bg-emerald-500',label: 'Facture',  dot: 'bg-emerald-400' },
  purchase_order:{ icon: ShoppingCart,color: 'bg-orange-500', label: 'Bon cmde', dot: 'bg-orange-400' },
  site_report:   { icon: HardHat,     color: 'bg-violet-500', label: 'Rapport',  dot: 'bg-violet-400' },
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export default function AdminCalendar() {
  const [current, setCurrent]   = useState(new Date())
  const [events, setEvents]     = useState([])
  const [selected, setSelected] = useState(new Date())
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminTasks.getAll(),
      adminInvoices.getAll(),
      adminPurchaseOrders.getAll(),
      adminSiteReports.getAll(),
    ]).then(([tasksR, invR, poR, srR]) => {
      const all = [
        ...tasksR.data.filter(t => t.dueDate).map(t => ({
          id: t._id, date: t.dueDate, type: 'task',
          title: t.title, sub: t.assignee || '',
          link: '/admin/tasks',
          overdue: t.status !== 'done' && new Date(t.dueDate) < new Date(),
        })),
        ...invR.data.filter(i => i.dueDate).map(i => ({
          id: i._id, date: i.dueDate, type: 'invoice',
          title: i.number, sub: i.client?.name || '',
          link: '/admin/finance',
          overdue: i.status === 'overdue',
        })),
        ...poR.data.filter(p => p.deliveryDate).map(p => ({
          id: p._id, date: p.deliveryDate, type: 'purchase_order',
          title: p.number, sub: p.supplier?.name || '',
          link: '/admin/purchase-orders',
        })),
        ...srR.data.map(r => ({
          id: r._id, date: r.date, type: 'site_report',
          title: r.project, sub: r.weather || '',
          link: '/admin/site-reports',
        })),
      ]
      setEvents(all)
    }).finally(() => setLoading(false))
  }, [])

  const year  = current.getFullYear()
  const month = current.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7  // Monday=0

  const days = []
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1)
    days.push({ date: d, current: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), current: true })
  }
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - startPad + 1)
    days.push({ date: d, current: false })
  }

  const eventsForDay = (date) => events.filter(e => sameDay(e.date, date))
  const selectedEvents = eventsForDay(selected)
  const today = new Date()

  const prev = () => setCurrent(new Date(year, month - 1, 1))
  const next = () => setCurrent(new Date(year, month + 1, 1))
  const goToday = () => { setCurrent(new Date()); setSelected(new Date()) }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Calendrier</h1>
          <p className="text-slate-500 text-sm mt-1">Tâches, factures, bons de commande et rapports de chantier</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          {/* Légende */}
          <div className="flex items-center gap-3">
            {Object.entries(EVENT_TYPES).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2 h-2 rounded-full ${v.dot}`}/>{v.label}
              </span>
            ))}
          </div>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-600 dark:text-slate-300 hover:border-blue-300 transition-colors">
            Aujourd'hui
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-4 gap-5">
        {/* ── Calendrier ── */}
        <div className="xl:col-span-3 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-700">
            <button onClick={prev} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={18}/></button>
            <h2 className="text-base font-black text-slate-900 dark:text-white">{MONTHS[month]} {year}</h2>
            <button onClick={next} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={18}/></button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-navy-700">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide py-3">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {days.map(({ date, current: isCurrent }, i) => {
              const dayEvents = eventsForDay(date)
              const isToday   = sameDay(date, today)
              const isSelected = sameDay(date, selected)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6

              return (
                <div
                  key={i}
                  onClick={() => setSelected(date)}
                  className={`min-h-[80px] p-2 border-b border-r border-slate-50 dark:border-navy-800 cursor-pointer transition-colors
                    ${!isCurrent ? 'bg-slate-50/50 dark:bg-navy-950/30' : 'hover:bg-blue-50/30 dark:hover:bg-blue-500/5'}
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' : ''}
                    ${isWeekend && isCurrent ? 'bg-slate-50/80 dark:bg-navy-800/20' : ''}`}
                >
                  {/* Day number */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1.5 transition-colors
                    ${isToday ? 'bg-blue-500 text-white' : isSelected ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : isCurrent ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-navy-600'}`}>
                    {date.getDate()}
                  </div>

                  {/* Events pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const t = EVENT_TYPES[ev.type] || EVENT_TYPES.task
                      return (
                        <div key={ev.id} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded text-white truncate ${ev.overdue ? 'bg-red-500' : t.color}`}>
                          {ev.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-slate-400 pl-1">+{dayEvents.length - 3} autres</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Détail jour sélectionné ── */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{DAYS[(selected.getDay() + 6) % 7]}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{selected.getDate()} {MONTHS[selected.getMonth()]}</p>
            <p className="text-xs text-slate-500">{selected.getFullYear()}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {selectedEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Aucun événement</p>
                <p className="text-xs mt-1">Ce jour est libre</p>
              </div>
            ) : selectedEvents.map(ev => {
              const t = EVENT_TYPES[ev.type] || EVENT_TYPES.task
              const Icon = t.icon
              return (
                <button key={ev.id} onClick={() => navigate(ev.link)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-sm
                    ${ev.overdue ? 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5' : 'border-slate-100 dark:border-navy-700 hover:border-blue-200 dark:hover:border-blue-500/30'}`}>
                  <div className={`w-8 h-8 ${ev.overdue ? 'bg-red-500' : t.color} rounded-lg flex items-center justify-center shrink-0`}>
                    <Icon size={14} className="text-white"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ev.title}</p>
                    {ev.sub && <p className="text-xs text-slate-400 truncate">{ev.sub}</p>}
                    <span className={`text-[9px] font-bold uppercase ${ev.overdue ? 'text-red-500' : 'text-slate-400'}`}>{ev.overdue ? 'En retard' : t.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Quick add */}
          <div className="p-4 border-t border-slate-100 dark:border-navy-700">
            <button onClick={() => navigate('/admin/tasks')}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-blue-500 hover:text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors">
              <Plus size={13}/> Ajouter une tâche
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
