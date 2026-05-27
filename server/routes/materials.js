const router   = require('express').Router()
const jwt      = require('jsonwebtoken')
const Material = require('../models/Material')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try { res.json(await Material.find().sort({ name: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Material.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Material.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Mouvement de stock ────────────────────────────────────────────────────────
router.post('/:id/movement', auth, async (req, res) => {
  try {
    const mat = await Material.findById(req.params.id)
    if (!mat) return res.status(404).json({ error: 'Matériau introuvable' })

    const { type, qty, date, project, notes, user } = req.body
    const amount = Number(qty) || 0
    if (amount <= 0) return res.status(400).json({ error: 'Quantité invalide' })

    // Adjust stock
    if (type === 'Entrée') {
      mat.quantity += amount
    } else if (['Sortie', 'Consommation', 'Transfert'].includes(type)) {
      if (mat.quantity < amount) return res.status(400).json({ error: 'Stock insuffisant' })
      mat.quantity -= amount
    }

    mat.movements.push({ type, qty: amount, date: date || new Date(), project, notes, user })
    await mat.save()
    res.json(mat)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Material.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
