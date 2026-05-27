require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express  = require('express')
const cors     = require('cors')
const mongoose = require('mongoose')
const path     = require('path')

const app  = express()
const PORT = process.env.PORT || 5000

// ── Middlewares ────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.CLIENT_URL, // ex: https://btp-construction.netlify.app
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Autoriser les appels sans origin (Postman, curl, Render health checks)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS bloqué pour : ${origin}`))
  },
  credentials: true,
}))
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── MongoDB ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => { console.error('❌ MongoDB erreur:', err.message); process.exit(1) })

// ── Routes publiques ───────────────────────────────────────────────────────
app.use('/api/projects',      require('./routes/projects'))
app.use('/api/services',      require('./routes/services'))
app.use('/api/team',          require('./routes/team'))
app.use('/api/blog',          require('./routes/blog'))
app.use('/api/testimonials',  require('./routes/testimonials'))
app.use('/api/contact',       require('./routes/contact'))
app.use('/api/quotes',        require('./routes/quotes'))

// ── Routes admin (protégées JWT) ───────────────────────────────────────────
app.use('/api/admin',           require('./routes/admin'))
app.use('/api/clients',         require('./routes/clients'))
app.use('/api/invoices',        require('./routes/invoices'))
app.use('/api/expenses',        require('./routes/expenses'))
app.use('/api/materials',       require('./routes/materials'))
app.use('/api/tasks',           require('./routes/tasks'))
app.use('/api/settings',        require('./routes/settings'))
app.use('/api/employees',       require('./routes/employees'))
app.use('/api/suppliers',       require('./routes/suppliers'))
app.use('/api/purchase-orders', require('./routes/purchase-orders'))
app.use('/api/site-reports',    require('./routes/site-reports'))
app.use('/api/notifications',   require('./routes/notifications'))
app.use('/api/search',          require('./routes/search'))
app.use('/api/reports',         require('./routes/reports'))

// ── Nouveaux modules ──────────────────────────────────────────────────────
app.use('/api/credit-notes',    require('./routes/credit-notes'))
app.use('/api/attendance',      require('./routes/attendance'))
app.use('/api/leaves',          require('./routes/leaves'))
app.use('/api/equipment',       require('./routes/equipment'))
app.use('/api/work-orders',     require('./routes/work-orders'))
app.use('/api/documents',       require('./routes/documents'))
app.use('/api/subcontractors',  require('./routes/subcontractors'))
app.use('/api/hse',             require('./routes/hse'))
app.use('/api/activity-log',    require('./routes/activity-log'))
app.use('/api/reminders',       require('./routes/reminders'))
app.use('/api/tva',             require('./routes/tva'))
app.use('/api/backup',          require('./routes/backup'))
app.use('/api/work-schedules',  require('./routes/work-schedules'))
app.use('/api/kiosk',           require('./routes/kiosk'))
app.use('/api/payroll',         require('./routes/payroll'))

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState }))

// ── Static (production) ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')))
}

const server = app.listen(PORT, () => console.log(`🚀 Serveur BTP sur http://localhost:${PORT}`))

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} déjà utilisé. Libérez-le ou changez PORT dans server/.env`)
    process.exit(1)
  } else {
    throw err
  }
})
