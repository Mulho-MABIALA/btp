const router  = require('express').Router()
const Contact = require('../models/Contact')

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body
    if (!name || !email || !message) return res.status(400).json({ error: 'name, email et message requis' })
    const doc = await Contact.create(req.body)
    res.status(201).json({ success: true, id: doc._id, message: 'Message envoyé avec succès.' })
  } catch (e) { res.status(400).json({ error: e.message }) }
})
router.get('/',    async (req, res) => { try { res.json(await Contact.find().sort({ createdAt: -1 })) } catch (e) { res.status(500).json({ error: e.message }) } })
router.put('/:id/status', async (req, res) => {
  try { await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status }); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
router.delete('/:id', async (req, res) => { try { await Contact.findByIdAndDelete(req.params.id); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) } })

module.exports = router
