import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import Layout       from './components/layout/Layout'
import Loader       from './components/ui/Loader'
import ScrollToTop  from './components/ui/ScrollToTop'
import AdminLayout  from './admin/components/AdminLayout'
import AdminGuard   from './admin/components/AdminGuard'

// ── Spinner léger utilisé pendant le lazy loading ──────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// ── Pages publiques (lazy) ─────────────────────────────────────────────────
const Home         = lazy(() => import('./pages/Home'))
const About        = lazy(() => import('./pages/About'))
const Services     = lazy(() => import('./pages/Services'))
const Projects     = lazy(() => import('./pages/Projects'))
const Team         = lazy(() => import('./pages/Team'))
const Testimonials = lazy(() => import('./pages/Testimonials'))
const Blog         = lazy(() => import('./pages/Blog'))
const Contact      = lazy(() => import('./pages/Contact'))
const Quote        = lazy(() => import('./pages/Quote'))
const NotFound     = lazy(() => import('./pages/NotFound'))
const Kiosk        = lazy(() => import('./pages/Kiosk'))
const EmployeeSpace= lazy(() => import('./pages/EmployeeSpace'))

// ── Pages admin (lazy) ─────────────────────────────────────────────────────
const Login              = lazy(() => import('./admin/pages/Login'))
const Dashboard          = lazy(() => import('./admin/pages/Dashboard'))
const AdminProjects      = lazy(() => import('./admin/pages/AdminProjects'))
const AdminProjectDetail = lazy(() => import('./admin/pages/AdminProjectDetail'))
const AdminServices      = lazy(() => import('./admin/pages/AdminServices'))
const AdminTeam          = lazy(() => import('./admin/pages/AdminTeam'))
const AdminBlog          = lazy(() => import('./admin/pages/AdminBlog'))
const AdminTestimonials  = lazy(() => import('./admin/pages/AdminTestimonials'))
const AdminContacts      = lazy(() => import('./admin/pages/AdminContacts'))
const AdminQuotes        = lazy(() => import('./admin/pages/AdminQuotes'))
const AdminClients       = lazy(() => import('./admin/pages/AdminClients'))
const AdminClientDetail  = lazy(() => import('./admin/pages/AdminClientDetail'))
const AdminFinance       = lazy(() => import('./admin/pages/AdminFinance'))
const AdminCreditNotes   = lazy(() => import('./admin/pages/AdminCreditNotes'))
const AdminBudget        = lazy(() => import('./admin/pages/AdminBudget'))
const AdminTVA           = lazy(() => import('./admin/pages/AdminTVA'))
const AdminInventory     = lazy(() => import('./admin/pages/AdminInventory'))
const AdminTasks         = lazy(() => import('./admin/pages/AdminTasks'))
const AdminCalendar      = lazy(() => import('./admin/pages/AdminCalendar'))
const AdminHR            = lazy(() => import('./admin/pages/AdminHR'))
const AdminEmployeeDetail= lazy(() => import('./admin/pages/AdminEmployeeDetail'))
const AdminPayroll       = lazy(() => import('./admin/pages/AdminPayroll'))
const AdminAttendance    = lazy(() => import('./admin/pages/AdminAttendance'))
const AdminLeaves        = lazy(() => import('./admin/pages/AdminLeaves'))
const AdminWorkSchedules = lazy(() => import('./admin/pages/AdminWorkSchedules'))
const AdminKioskHistory  = lazy(() => import('./admin/pages/AdminKioskHistory'))
const AdminSuppliers     = lazy(() => import('./admin/pages/AdminSuppliers'))
const AdminPurchaseOrders= lazy(() => import('./admin/pages/AdminPurchaseOrders'))
const AdminSubcontractors= lazy(() => import('./admin/pages/AdminSubcontractors'))
const AdminEquipment     = lazy(() => import('./admin/pages/AdminEquipment'))
const AdminWorkOrders    = lazy(() => import('./admin/pages/AdminWorkOrders'))
const AdminInventoryPage = lazy(() => import('./admin/pages/AdminInventory'))
const AdminDocuments     = lazy(() => import('./admin/pages/AdminDocuments'))
const AdminHSE           = lazy(() => import('./admin/pages/AdminHSE'))
const AdminSiteReports   = lazy(() => import('./admin/pages/AdminSiteReports'))
const AdminReminders     = lazy(() => import('./admin/pages/AdminReminders'))
const AdminActivityLog   = lazy(() => import('./admin/pages/AdminActivityLog'))
const AdminReports       = lazy(() => import('./admin/pages/AdminReports'))
const AdminUsers         = lazy(() => import('./admin/pages/AdminUsers'))
const AdminSettings      = lazy(() => import('./admin/pages/AdminSettings'))

// ── Restore scroll on route change ────────────────────────────────────────
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
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* ── Site public ── */}
            <Route path="/" element={<Layout />}>
              <Route index             element={<Home />} />
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

            {/* ── Pages standalone ── */}
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
              <Route path="projects/:id"    element={<AdminProjectDetail />} />
              <Route path="services"        element={<AdminServices />} />
              <Route path="team"            element={<AdminTeam />} />
              <Route path="blog"            element={<AdminBlog />} />
              <Route path="testimonials"    element={<AdminTestimonials />} />
              <Route path="contacts"        element={<AdminContacts />} />
              <Route path="quotes"          element={<AdminQuotes />} />
              <Route path="clients"         element={<AdminClients />} />
              <Route path="clients/:id"     element={<AdminClientDetail />} />
              <Route path="finance"         element={<AdminFinance />} />
              <Route path="credit-notes"    element={<AdminCreditNotes />} />
              <Route path="budget"          element={<AdminBudget />} />
              <Route path="tva"             element={<AdminTVA />} />
              <Route path="inventory"       element={<AdminInventory />} />
              <Route path="tasks"           element={<AdminTasks />} />
              <Route path="calendar"        element={<AdminCalendar />} />
              <Route path="hr"              element={<AdminHR />} />
              <Route path="hr/:id"          element={<AdminEmployeeDetail />} />
              <Route path="payroll"         element={<AdminPayroll />} />
              <Route path="attendance"      element={<AdminAttendance />} />
              <Route path="leaves"          element={<AdminLeaves />} />
              <Route path="work-schedules"  element={<AdminWorkSchedules />} />
              <Route path="kiosk-history"   element={<AdminKioskHistory />} />
              <Route path="suppliers"       element={<AdminSuppliers />} />
              <Route path="purchase-orders" element={<AdminPurchaseOrders />} />
              <Route path="subcontractors"  element={<AdminSubcontractors />} />
              <Route path="equipment"       element={<AdminEquipment />} />
              <Route path="work-orders"     element={<AdminWorkOrders />} />
              <Route path="documents"       element={<AdminDocuments />} />
              <Route path="hse"             element={<AdminHSE />} />
              <Route path="site-reports"    element={<AdminSiteReports />} />
              <Route path="reminders"       element={<AdminReminders />} />
              <Route path="activity-log"    element={<AdminActivityLog />} />
              <Route path="reports"         element={<AdminReports />} />
              <Route path="users"           element={<AdminUsers />} />
              <Route path="settings"        element={<AdminSettings />} />
            </Route>
          </Routes>
        </Suspense>
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
