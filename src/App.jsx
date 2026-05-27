import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import Loader from './components/ui/Loader'
import ScrollToTop from './components/ui/ScrollToTop'
import Home from './pages/Home'
import About from './pages/About'
import Services from './pages/Services'
import Projects from './pages/Projects'
import Team from './pages/Team'
import Testimonials from './pages/Testimonials'
import Blog from './pages/Blog'
import Contact from './pages/Contact'
import Quote from './pages/Quote'
import NotFound from './pages/NotFound'
import Kiosk         from './pages/Kiosk'
import EmployeeSpace from './pages/EmployeeSpace'

// ── Admin ──────────────────────────────────────────────────────────────────
import AdminLayout      from './admin/components/AdminLayout'
import AdminGuard       from './admin/components/AdminGuard'
import Login            from './admin/pages/Login'
import Dashboard        from './admin/pages/Dashboard'
import AdminProjects    from './admin/pages/AdminProjects'
import AdminServices    from './admin/pages/AdminServices'
import AdminTeam        from './admin/pages/AdminTeam'
import AdminBlog        from './admin/pages/AdminBlog'
import AdminTestimonials from './admin/pages/AdminTestimonials'
import AdminContacts    from './admin/pages/AdminContacts'
import AdminQuotes      from './admin/pages/AdminQuotes'
import AdminClients       from './admin/pages/AdminClients'
import AdminClientDetail   from './admin/pages/AdminClientDetail'
import AdminProjectDetail  from './admin/pages/AdminProjectDetail'
import AdminFinance      from './admin/pages/AdminFinance'
import AdminInventory    from './admin/pages/AdminInventory'
import AdminTasks        from './admin/pages/AdminTasks'
import AdminCalendar     from './admin/pages/AdminCalendar'
import AdminHR              from './admin/pages/AdminHR'
import AdminEmployeeDetail from './admin/pages/AdminEmployeeDetail'
import AdminSuppliers    from './admin/pages/AdminSuppliers'
import AdminPurchaseOrders from './admin/pages/AdminPurchaseOrders'
import AdminSiteReports  from './admin/pages/AdminSiteReports'
import AdminReports      from './admin/pages/AdminReports'
import AdminUsers        from './admin/pages/AdminUsers'
import AdminSettings     from './admin/pages/AdminSettings'
import AdminCreditNotes  from './admin/pages/AdminCreditNotes'
import AdminAttendance   from './admin/pages/AdminAttendance'
import AdminLeaves       from './admin/pages/AdminLeaves'
import AdminEquipment    from './admin/pages/AdminEquipment'
import AdminWorkOrders   from './admin/pages/AdminWorkOrders'
import AdminDocuments    from './admin/pages/AdminDocuments'
import AdminSubcontractors from './admin/pages/AdminSubcontractors'
import AdminHSE          from './admin/pages/AdminHSE'
import AdminBudget       from './admin/pages/AdminBudget'
import AdminTVA          from './admin/pages/AdminTVA'
import AdminReminders    from './admin/pages/AdminReminders'
import AdminActivityLog    from './admin/pages/AdminActivityLog'
import AdminWorkSchedules  from './admin/pages/AdminWorkSchedules'
import AdminKioskHistory  from './admin/pages/AdminKioskHistory'
import AdminPayroll       from './admin/pages/AdminPayroll'

function ScrollRestorer() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [pathname])
  return null
}

function AppRoutes() {
  return (
    <>
      <ScrollRestorer />
      <AnimatePresence mode="wait">
        <Routes>
          {/* ── Site public ── */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about"        element={<About />} />
            <Route path="services"     element={<Services />} />
            <Route path="projects"     element={<Projects />} />
            <Route path="team"         element={<Team />} />
            <Route path="testimonials" element={<Testimonials />} />
            <Route path="blog"         element={<Blog />} />
            <Route path="contact"      element={<Contact />} />
            <Route path="quote"        element={<Quote />} />
            <Route path="*"            element={<NotFound />} />
          </Route>

          {/* ── Public pages ── */}
          <Route path="/kiosk"      element={<Kiosk />} />
          <Route path="/mon-espace" element={<EmployeeSpace />} />

          {/* ── Admin login ── */}
          <Route path="/admin/login" element={<Login />} />

          {/* ── Admin protégé ── */}
          <Route path="/admin" element={
            <AdminGuard><AdminLayout /></AdminGuard>
          }>
            <Route index                  element={<Dashboard />} />
            <Route path="projects"        element={<AdminProjects />} />
            <Route path="services"        element={<AdminServices />} />
            <Route path="team"            element={<AdminTeam />} />
            <Route path="blog"            element={<AdminBlog />} />
            <Route path="testimonials"    element={<AdminTestimonials />} />
            <Route path="contacts"        element={<AdminContacts />} />
            <Route path="quotes"          element={<AdminQuotes />} />
            <Route path="clients"          element={<AdminClients />} />
            <Route path="clients/:id"     element={<AdminClientDetail />} />
            <Route path="projects/:id"    element={<AdminProjectDetail />} />
            <Route path="finance"          element={<AdminFinance />} />
            <Route path="inventory"        element={<AdminInventory />} />
            <Route path="tasks"            element={<AdminTasks />} />
            <Route path="calendar"         element={<AdminCalendar />} />
            <Route path="hr"               element={<AdminHR />} />
            <Route path="hr/:id"          element={<AdminEmployeeDetail />} />
            <Route path="suppliers"        element={<AdminSuppliers />} />
            <Route path="purchase-orders"  element={<AdminPurchaseOrders />} />
            <Route path="site-reports"     element={<AdminSiteReports />} />
            <Route path="reports"          element={<AdminReports />} />
            <Route path="users"            element={<AdminUsers />} />
            <Route path="settings"         element={<AdminSettings />} />
            <Route path="credit-notes"     element={<AdminCreditNotes />} />
            <Route path="attendance"       element={<AdminAttendance />} />
            <Route path="leaves"           element={<AdminLeaves />} />
            <Route path="equipment"        element={<AdminEquipment />} />
            <Route path="work-orders"      element={<AdminWorkOrders />} />
            <Route path="documents"        element={<AdminDocuments />} />
            <Route path="subcontractors"   element={<AdminSubcontractors />} />
            <Route path="hse"              element={<AdminHSE />} />
            <Route path="budget"           element={<AdminBudget />} />
            <Route path="tva"              element={<AdminTVA />} />
            <Route path="reminders"        element={<AdminReminders />} />
            <Route path="activity-log"     element={<AdminActivityLog />} />
            <Route path="work-schedules"   element={<AdminWorkSchedules />} />
            <Route path="kiosk-history"   element={<AdminKioskHistory />} />
            <Route path="payroll"         element={<AdminPayroll />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ThemeProvider>
      <Router>
        <AnimatePresence>
          {loading && <Loader key="loader" />}
        </AnimatePresence>
        {!loading && (
          <>
            <AppRoutes />
            <ScrollToTop />
          </>
        )}
      </Router>
    </ThemeProvider>
  )
}
