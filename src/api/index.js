import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Projets ──────────────────────────────────────────────────────────────
export const projectsApi = {
  getAll: (category) => api.get('/projects', { params: category && category !== 'Tous' ? { category } : {} }),
  getCategories: () => api.get('/projects/categories'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
}

// ─── Services ─────────────────────────────────────────────────────────────
export const servicesApi = {
  getAll: () => api.get('/services'),
  getOne: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
}

// ─── Équipe ───────────────────────────────────────────────────────────────
export const teamApi = {
  getAll: () => api.get('/team'),
  getOne: (id) => api.get(`/team/${id}`),
  create: (data) => api.post('/team', data),
  update: (id, data) => api.put(`/team/${id}`, data),
  delete: (id) => api.delete(`/team/${id}`),
}

// ─── Blog ─────────────────────────────────────────────────────────────────
export const blogApi = {
  getAll: (category) => api.get('/blog', { params: category ? { category } : {} }),
  getCategories: () => api.get('/blog/categories'),
  getOne: (id) => api.get(`/blog/${id}`),
  create: (data) => api.post('/blog', data),
  update: (id, data) => api.put(`/blog/${id}`, data),
  delete: (id) => api.delete(`/blog/${id}`),
}

// ─── Témoignages ──────────────────────────────────────────────────────────
export const testimonialsApi = {
  getAll: () => api.get('/testimonials'),
  getOne: (id) => api.get(`/testimonials/${id}`),
  create: (data) => api.post('/testimonials', data),
  update: (id, data) => api.put(`/testimonials/${id}`, data),
  delete: (id) => api.delete(`/testimonials/${id}`),
}

// ─── Contact ──────────────────────────────────────────────────────────────
export const contactApi = {
  send: (data) => api.post('/contact', data),
}

// ─── Devis ────────────────────────────────────────────────────────────────
export const quotesApi = {
  send: (data) => api.post('/quotes', data),
}

export default api
