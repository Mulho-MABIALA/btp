import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Wrench, Users, FileText, Star,
  Mail, ClipboardList, LogOut, Menu, X, Building2, UserCheck,
  CheckSquare, DollarSign, Package, Calendar, UserCog, Settings,
  BarChart2, Truck, ShoppingCart, HardHat, LogIn, FileX,
  Clock, CalendarOff, Cog, ClipboardCheck, FolderKanban,
  ShieldAlert, TrendingUp, Receipt, Bell, Activity, BookOpen,
  Users2, FileSearch, Hammer, CalendarClock, History, Smartphone,
  Banknote,
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'

const sections = [
  {
    label: 'PRINCIPAL',
    items: [
      { to: '/admin',            label: 'Tableau de bord', icon: LayoutDashboard, end: true },
      { to: '/admin/calendar',   label: 'Calendrier',      icon: Calendar },
      { to: '/admin/reminders',  label: 'Rappels',         icon: Bell },
    ]
  },
  {
    label: 'GESTION',
    items: [
      { to: '/admin/clients',    label: 'Clients',         icon: UserCheck },
      { to: '/admin/tasks',      label: 'Tâches Kanban',   icon: CheckSquare },
      { to: '/admin/projects',   label: 'Projets',         icon: FolderOpen },
      { to: '/admin/equipment',  label: 'Équipements',     icon: Cog },
    ]
  },
  {
    label: 'RESSOURCES HUMAINES',
    items: [
      { to: '/admin/hr',               label: 'Employés',          icon: Users },
      { to: '/admin/attendance',        label: 'Pointage',           icon: Clock },
      { to: '/admin/work-schedules',   label: 'Planning horaires',  icon: CalendarClock },
      { to: '/admin/kiosk-history',    label: 'Historique kiosque', icon: History },
      { to: '/admin/leaves',           label: 'Congés',             icon: CalendarOff },
      { to: '/kiosk',                  label: '🖥 Terminal kiosque', icon: LogIn },
      { to: '/mon-espace',             label: '📱 App employés',    icon: Smartphone },
    ]
  },
  {
    label: 'FINANCES',
    items: [
      { to: '/admin/finance',       label: 'Facturation',      icon: DollarSign },
      { to: '/admin/credit-notes',  label: 'Avoirs',           icon: FileX },
      { to: '/admin/payroll',       label: 'Bulletins de paie',icon: Banknote },
      { to: '/admin/budget',        label: 'Budget analytique',icon: TrendingUp },
      { to: '/admin/tva',           label: 'Récapitulatif TVA', icon: Receipt },
    ]
  },
  {
    label: 'ACHATS & STOCK',
    items: [
      { to: '/admin/inventory',       label: 'Inventaire',       icon: Package },
      { to: '/admin/suppliers',       label: 'Fournisseurs',     icon: Truck },
      { to: '/admin/subcontractors',  label: 'Sous-traitants',   icon: Users2 },
      { to: '/admin/purchase-orders', label: 'Bons de commande', icon: ShoppingCart },
    ]
  },
  {
    label: 'CHANTIER',
    items: [
      { to: '/admin/site-reports',  label: 'Rapports chantier', icon: HardHat },
      { to: '/admin/work-orders',   label: 'Bons de travaux',   icon: Hammer },
      { to: '/admin/hse',           label: 'HSE / Sécurité',    icon: ShieldAlert },
      { to: '/admin/documents',     label: 'Documents',         icon: FolderKanban },
    ]
  },
  {
    label: 'ANALYTICS',
    items: [
      { to: '/admin/reports',      label: 'Rapports & Stats',   icon: BarChart2 },
    ]
  },
  {
    label: 'CONTENU SITE',
    items: [
      { to: '/admin/services',     label: 'Services',     icon: Wrench },
      { to: '/admin/team',         label: 'Équipe',       icon: UserCog },
      { to: '/admin/blog',         label: 'Blog',         icon: FileText },
      { to: '/admin/testimonials', label: 'Témoignages',  icon: Star },
    ]
  },
  {
    label: 'MESSAGERIE',
    items: [
      { to: '/admin/contacts', label: 'Messages',         icon: Mail },
      { to: '/admin/quotes',   label: 'Devis reçus',      icon: ClipboardList },
    ]
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { to: '/admin/users',        label: 'Utilisateurs',    icon: LogIn },
      { to: '/admin/activity-log', label: 'Journal activité',icon: Activity },
      { to: '/admin/settings',     label: 'Paramètres',      icon: Settings },
    ]
  },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-navy-950 font-sans">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0b1628] flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07] shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm leading-none">CONSTRUCTPRO</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">Administration</div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin">
          {sections.map(({ label, items }) => (
            <div key={label}>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-1.5">{label}</p>
              <div className="space-y-0.5">
                {items.map(({ to, label: lbl, icon: Icon, end }) => (
                  <NavLink
                    key={to} to={to} end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group
                      ${isActive
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={14} className={isActive ? 'text-blue-400 shrink-0' : 'text-slate-500 group-hover:text-slate-300 shrink-0'} />
                        <span className="flex-1 truncate">{lbl}</span>
                        {isActive && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.07] shrink-0">
          <button onClick={logout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-700 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white p-1">
            <Menu size={20} />
          </button>
          <GlobalSearch />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="w-px h-5 bg-slate-200 dark:bg-navy-700" />
            <span className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <a href="/" target="_blank" className="text-xs text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1.5 rounded-lg font-medium hidden sm:block">
              ← Site
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-slate-50 dark:bg-navy-950">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="shrink-0 px-4 py-2.5 bg-white dark:bg-navy-900 border-t border-slate-200 dark:border-navy-700 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} <span className="font-semibold text-slate-500">CONSTRUCTPRO</span> — Tous droits réservés
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Système opérationnel
            </span>
            <span className="hidden sm:block">· v3.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
