import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Mail, ClipboardList, DollarSign, Package, CheckSquare, Zap,
         Receipt, Wrench, CalendarOff, ShoppingCart } from 'lucide-react'
import { adminNotifications, adminReminders } from '../adminApi'

const ICONS = {
  mail:      Mail,
  clipboard: ClipboardList,
  dollar:    DollarSign,
  package:   Package,
  check:     CheckSquare,
}

const SOURCE_ICON = {
  invoice:        Receipt,
  task:           CheckSquare,
  purchase_order: ShoppingCart,
  equipment:      Wrench,
  leave:          CalendarOff,
}

const TYPE_STYLE = {
  danger:  'text-red-500 bg-red-50 dark:bg-red-500/10',
  warning: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10',
  info:    'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
}

export default function NotificationBell() {
  const [data, setData]     = useState({ notifications: [], total: 0 })
  const [autoAlerts, setAuto] = useState([])
  const [open, setOpen]     = useState(false)
  const ref                 = useRef(null)
  const navigate            = useNavigate()

  const fetchNotifs = () => {
    adminNotifications.get().then(r => setData(r.data)).catch(() => {})
    adminReminders.getAuto().then(r => setAuto(r.data.alerts || [])).catch(() => {})
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = (link) => { setOpen(false); navigate(link) }

  const urgentAuto  = autoAlerts.filter(a => a.overdue || a.priority === 'urgent')
  const totalBadge  = data.total + urgentAuto.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 transition-all"
      >
        <Bell size={18} />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl shadow-black/20 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-navy-700">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
            {totalBadge > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{totalBadge}</span>}
          </div>

          <div className="max-h-80 overflow-y-auto">

            {/* ── Alertes automatiques urgentes ── */}
            {urgentAuto.length > 0 && (
              <>
                <div className="px-4 py-2 bg-red-50 dark:bg-red-500/5 border-b border-red-100 dark:border-red-500/20 flex items-center gap-2">
                  <Zap size={11} className="text-red-500"/>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Alertes automatiques</span>
                </div>
                {urgentAuto.slice(0, 4).map(a => {
                  const Icon = SOURCE_ICON[a.source] || Bell
                  return (
                    <button key={a.id} onClick={() => handleClick(a.link)}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors text-left border-b border-slate-50 dark:border-navy-800/80 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-red-500"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{a.notes}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-red-500 shrink-0">{a.overdue ? 'Retard' : 'Urgent'}</span>
                    </button>
                  )
                })}
                {urgentAuto.length > 4 && (
                  <button onClick={() => handleClick('/admin/reminders')}
                    className="w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors border-b border-slate-100 dark:border-navy-700">
                    +{urgentAuto.length - 4} autres alertes →
                  </button>
                )}
              </>
            )}

            {/* ── Notifications standard ── */}
            <div className="divide-y divide-slate-50 dark:divide-navy-800">
              {data.notifications.length === 0 && urgentAuto.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Bell size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Aucune notification</p>
                </div>
              ) : data.notifications.map(n => {
                const Icon  = ICONS[n.icon] || Bell
                const style = TYPE_STYLE[n.type] || TYPE_STYLE.info
                return (
                  <button key={n.id} onClick={() => handleClick(n.link)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors text-left">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-slate-500 truncate">{n.message}</p>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${n.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400'}`}>
                      {n.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:bg-navy-800/50 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">Mis à jour toutes les 30 secondes</p>
            <button onClick={() => handleClick('/admin/reminders')} className="text-[10px] text-blue-500 font-semibold hover:underline">
              Voir tous les rappels →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
