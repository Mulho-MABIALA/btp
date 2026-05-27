const router  = require('express').Router()
const jwt     = require('jsonwebtoken')
const Quote   = require('../models/Quote')
const Invoice = require('../models/Invoice')
const Client  = require('../models/Client')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body
    if (!name || !email) return res.status(400).json({ error: 'name et email requis' })
    const doc = await Quote.create(req.body)
    res.status(201).json({ success: true, id: doc._id, message: 'Demande soumise avec succès.' })
  } catch (e) { res.status(400).json({ error: e.message }) }
})
router.get('/',    async (req, res) => { try { res.json(await Quote.find().sort({ createdAt: -1 })) } catch (e) { res.status(500).json({ error: e.message }) } })
router.put('/:id/status', async (req, res) => {
  try { await Quote.findByIdAndUpdate(req.params.id, { status: req.body.status }); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
router.delete('/:id', async (req, res) => { try { await Quote.findByIdAndDelete(req.params.id); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) } })

// ── Convertir un devis en facture ─────────────────────────────────────────
router.post('/:id/convert', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
    if (!quote) return res.status(404).json({ error: 'Devis introuvable' })
    if (quote.status === 'converted') return res.status(400).json({ error: 'Ce devis a déjà été converti en facture' })

    // Find or create a client
    let client = await Client.findOne({ email: quote.email })
    if (!client) {
      client = await Client.create({
        name:  quote.company || quote.name,
        email: quote.email,
        phone: quote.phone || '',
        city:  quote.location || '',
      })
    }

    // Auto-generate invoice number
    const count = await Invoice.countDocuments()
    const number = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    const budgetNum = parseFloat(String(quote.budget || '0').replace(/[^0-9.]/g, '')) || 0

    const inv = await Invoice.create({
      number,
      client:  client._id,
      amount:  budgetNum || 1,
      date:    new Date(),
      status:  'draft',
      notes:   quote.serviceType || quote.description || 'Devis converti',
    })

    await Quote.findByIdAndUpdate(quote._id, { status: 'converted' })

    res.status(201).json(await Invoice.findById(inv._id).populate('client', 'name email city'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
