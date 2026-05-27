import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth & Dashboard ──────────────────────────────────────────────────────
export const adminAuth = {
  login:      (email, password) => api.post('/admin/login', { email, password }),
  stats:      ()               => api.get('/admin/stats'),
  dashboard:  (period = 'month') => api.get(`/admin/dashboard?period=${period}`),
  users:      {
    getAll: ()       => api.get('/admin/users'),
    create: d        => api.post('/admin/users', d),
    update: (id, d)  => api.put(`/admin/users/${id}`, d),
    delete: id       => api.delete(`/admin/users/${id}`),
  },
}

// ── Contenu site ──────────────────────────────────────────────────────────
export const adminProjects     = { getAll: () => api.get('/projects'), getOne: id => api.get(`/projects/${id}`), create: d => api.post('/projects', d), update: (id, d) => api.put(`/projects/${id}`, d), delete: id => api.delete(`/projects/${id}`), uploadImage: (id, fd) => api.post(`/projects/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }), uploadPhoto: (id, fd) => api.post(`/projects/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }), deletePhoto: (id, idx) => api.delete(`/projects/${id}/photos/${idx}`) }
export const adminServices     = { getAll: () => api.get('/services'),     create: d => api.post('/services', d),     update: (id, d) => api.put(`/services/${id}`, d),     delete: id => api.delete(`/services/${id}`) }
export const adminTeam         = { getAll: () => api.get('/team'),         create: d => api.post('/team', d),         update: (id, d) => api.put(`/team/${id}`, d),         delete: id => api.delete(`/team/${id}`) }
export const adminBlog         = { getAll: () => api.get('/blog'),         create: d => api.post('/blog', d),         update: (id, d) => api.put(`/blog/${id}`, d),         delete: id => api.delete(`/blog/${id}`) }
export const adminTestimonials = { getAll: () => api.get('/testimonials'), create: d => api.post('/testimonials', d), update: (id, d) => api.put(`/testimonials/${id}`, d), delete: id => api.delete(`/testimonials/${id}`) }

// ── Messagerie ────────────────────────────────────────────────────────────
export const adminContacts = { getAll: () => api.get('/contact'), updateStatus: (id, s) => api.put(`/contact/${id}/status`, { status: s }), delete: id => api.delete(`/contact/${id}`) }
export const adminQuotes   = {
  getAll:          ()      => api.get('/quotes'),
  updateStatus:    (id, s) => api.put(`/quotes/${id}/status`, { status: s }),
  delete:          id      => api.delete(`/quotes/${id}`),
  convertToInvoice: id     => api.post(`/quotes/${id}/convert`),
}

// ── Business core ─────────────────────────────────────────────────────────
export const adminClients   = { getAll: () => api.get('/clients'),   getOne: id => api.get(`/clients/${id}`),   getDetails: id => api.get(`/clients/${id}/details`),   create: d => api.post('/clients', d),   update: (id, d) => api.put(`/clients/${id}`, d),   delete: id => api.delete(`/clients/${id}`),   sendEmail: (id, d) => api.post(`/clients/${id}/send-email`, d) }
export const adminExpenses  = { getAll: () => api.get('/expenses'),  create: d => api.post('/expenses', d),  update: (id, d) => api.put(`/expenses/${id}`, d),  delete: id => api.delete(`/expenses/${id}`) }
export const adminMaterials = { getAll: () => api.get('/materials'), create: d => api.post('/materials', d), update: (id, d) => api.put(`/materials/${id}`, d), delete: id => api.delete(`/materials/${id}`), addMovement: (id, d) => api.post(`/materials/${id}/movement`, d) }
export const adminTasks     = { getAll: () => api.get('/tasks'),     getByProject: id => api.get(`/tasks?projectRef=${id}`),     getByEmployee: id => api.get(`/tasks?employeeRef=${id}`),     create: d => api.post('/tasks', d),     update: (id, d) => api.put(`/tasks/${id}`, d),     updateStatus: (id, s) => api.patch(`/tasks/${id}/status`, { status: s }), delete: id => api.delete(`/tasks/${id}`) }

export const adminInvoices = {
  getAll:        ()        => api.get('/invoices'),
  create:        d         => api.post('/invoices', d),
  update:        (id, d)   => api.put(`/invoices/${id}`, d),
  updateStatus:  (id, s)   => api.patch(`/invoices/${id}/status`, { status: s }),
  delete:        id        => api.delete(`/invoices/${id}`),
  addPayment:    (id, d)   => api.post(`/invoices/${id}/payments`, d),
  deletePayment: (id, pid) => api.delete(`/invoices/${id}/payments/${pid}`),
  sendEmail:     (id, d)   => api.post(`/invoices/${id}/send-email`, d),
  bulkRemind:    ()        => api.post('/invoices/bulk-remind'),
  getRecurring:  ()        => api.get('/invoices/recurring'),
  generateNext:  id        => api.post(`/invoices/${id}/generate-next`),
}

// ── Modules existants ─────────────────────────────────────────────────────
export const adminSettings       = { get: () => api.get('/settings'), update: d => api.put('/settings', d) }
export const adminEmployees      = {
  getAll:        ()       => api.get('/employees'),
  create:        d        => api.post('/employees', d),
  update:        (id, d)  => api.put(`/employees/${id}`, d),
  delete:        id       => api.delete(`/employees/${id}`),
  uploadPhoto:   (id, fd) => api.post(`/employees/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Avances sur salaire
  addAdvance:    (id, d)       => api.post(`/employees/${id}/advances`, d),
  patchAdvance:  (id, aid, s)  => api.patch(`/employees/${id}/advances/${aid}/status`, { status: s }),
  deleteAdvance: (id, aid)     => api.delete(`/employees/${id}/advances/${aid}`),
  // Formations & habilitations
  addTraining:    (id, d)      => api.post(`/employees/${id}/trainings`, d),
  deleteTraining: (id, tid)    => api.delete(`/employees/${id}/trainings/${tid}`),
}
export const adminSuppliers      = { getAll: () => api.get('/suppliers'),       create: d => api.post('/suppliers', d),       update: (id, d) => api.put(`/suppliers/${id}`, d),       delete: id => api.delete(`/suppliers/${id}`) }
export const adminPurchaseOrders = { getAll: () => api.get('/purchase-orders'), create: d => api.post('/purchase-orders', d), update: (id, d) => api.put(`/purchase-orders/${id}`, d), updateStatus: (id, s) => api.patch(`/purchase-orders/${id}/status`, { status: s }), delete: id => api.delete(`/purchase-orders/${id}`), sendEmail: (id, d) => api.post(`/purchase-orders/${id}/send-email`, d) }
export const adminSiteReports    = { getAll: () => api.get('/site-reports'),    create: d => api.post('/site-reports', d),    update: (id, d) => api.put(`/site-reports/${id}`, d),    delete: id => api.delete(`/site-reports/${id}`),    uploadPhoto: (id, fd) => api.post(`/site-reports/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),    deletePhoto: (id, idx) => api.delete(`/site-reports/${id}/photos/${idx}`) }
export const adminNotifications  = { get: () => api.get('/notifications') }
export const adminSearch         = { query: q => api.get(`/search?q=${encodeURIComponent(q)}`) }
export const adminReports        = { get: () => api.get('/reports') }

// ── Nouveaux modules ──────────────────────────────────────────────────────
export const adminCreditNotes   = { getAll: () => api.get('/credit-notes'), getOne: id => api.get(`/credit-notes/${id}`), create: d => api.post('/credit-notes', d), update: (id, d) => api.put(`/credit-notes/${id}`, d), updateStatus: (id, s) => api.patch(`/credit-notes/${id}/status`, { status: s }), delete: id => api.delete(`/credit-notes/${id}`), sendEmail: (id, d) => api.post(`/credit-notes/${id}/send-email`, d) }
export const adminAttendance    = { getAll: p => api.get('/attendance', { params: p }), getMissingToday: p => api.get('/attendance/missing-today', { params: p }), create: d => api.post('/attendance', d), update: (id, d) => api.put(`/attendance/${id}`, d), delete: id => api.delete(`/attendance/${id}`) }
export const adminKiosk         = { getLogs: p => api.get('/kiosk/logs', { params: p }), getTodaySummary: () => api.get('/kiosk/logs/today-summary') }
export const adminLeaves        = { getAll: p => api.get('/leaves', { params: p }), getBalance: (empId, year) => api.get(`/leaves/balance/${empId}`, { params: { year } }), create: d => api.post('/leaves', d), update: (id, d) => api.put(`/leaves/${id}`, d), updateStatus: (id, s, by) => api.patch(`/leaves/${id}/status`, { status: s, approvedBy: by }), delete: id => api.delete(`/leaves/${id}`) }
export const adminPayroll       = { getAll: p => api.get('/payroll', { params: p }), generate: month => api.post('/payroll/generate', { month }), create: d => api.post('/payroll', d), update: (id, d) => api.put(`/payroll/${id}`, d), updateStatus: (id, s) => api.patch(`/payroll/${id}/status`, { status: s }), delete: id => api.delete(`/payroll/${id}`), getSummary: month => api.get(`/payroll/summary/${month}`), sendEmail: (id, d) => api.post(`/payroll/${id}/send-email`, d) }
export const adminEquipment     = { getAll: () => api.get('/equipment'), create: d => api.post('/equipment', d), update: (id, d) => api.put(`/equipment/${id}`, d), updateStatus: (id, s) => api.patch(`/equipment/${id}/status`, { status: s }), delete: id => api.delete(`/equipment/${id}`), uploadImage: (id, fd) => api.post(`/equipment/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }), uploadPhoto: (id, fd) => api.post(`/equipment/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }), deletePhoto: (id, idx) => api.delete(`/equipment/${id}/photos/${idx}`), addMaintenance: (id, d) => api.post(`/equipment/${id}/maintenance`, d), deleteMaintenance: (id, mid) => api.delete(`/equipment/${id}/maintenance/${mid}`), updateCounters: (id, d) => api.patch(`/equipment/${id}/counters`, d) }
export const adminWorkOrders    = { getAll: () => api.get('/work-orders'),    create: d => api.post('/work-orders', d),    update: (id, d) => api.put(`/work-orders/${id}`, d),    updateStatus: (id, s) => api.patch(`/work-orders/${id}/status`, { status: s }), delete: id => api.delete(`/work-orders/${id}`) }
export const adminDocuments     = { getAll: p => api.get('/documents', { params: p }), getByEmployee: id => api.get('/documents', { params: { employeeRef: id } }), create: d => api.post('/documents', d, { headers: { 'Content-Type': 'multipart/form-data' } }), update: (id, d) => api.put(`/documents/${id}`, d), delete: id => api.delete(`/documents/${id}`) }
export const adminSubcontractors= { getAll: () => api.get('/subcontractors'), create: d => api.post('/subcontractors', d), update: (id, d) => api.put(`/subcontractors/${id}`, d), delete: id => api.delete(`/subcontractors/${id}`), addPayment: (id, d) => api.post(`/subcontractors/${id}/payments`, d), deletePayment: (id, pid) => api.delete(`/subcontractors/${id}/payments/${pid}`) }
export const adminHSE           = { getAll: () => api.get('/hse'),            create: d => api.post('/hse', d),            update: (id, d) => api.put(`/hse/${id}`, d),            close: id => api.patch(`/hse/${id}/close`), delete: id => api.delete(`/hse/${id}`), uploadPhoto: (id, fd) => api.post(`/hse/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }), deletePhoto: (id, idx) => api.delete(`/hse/${id}/photos/${idx}`) }
export const adminActivityLog   = { getAll: p => api.get('/activity-log', { params: p }), clear: () => api.delete('/activity-log/clear') }
export const adminReminders     = { getAll: p => api.get('/reminders', { params: p }), getAuto: () => api.get('/reminders/auto'), create: d => api.post('/reminders', d), update: (id, d) => api.put(`/reminders/${id}`, d), done: id => api.patch(`/reminders/${id}/done`), delete: id => api.delete(`/reminders/${id}`), snooze: (alertId, days) => api.post('/reminders/snooze', { alertId, days }), unsnooze: alertId => api.delete(`/reminders/snooze/${encodeURIComponent(alertId)}`) }
export const adminWorkSchedules = {
  getAll:    p  => api.get('/work-schedules', { params: p }),
  create:    d  => api.post('/work-schedules', d),
  update:   (id, d) => api.put(`/work-schedules/${id}`, d),
  delete:    id => api.delete(`/work-schedules/${id}`),
  copyWeek:  d  => api.post('/work-schedules/copy-week', d),
}
export const adminTVA    = { get: year => api.get('/tva', { params: { year } }) }
export const adminBackup = { export: () => api.get('/backup') }

export default api
