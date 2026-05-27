const router   = require('express').Router()
const jwt      = require('jsonwebtoken')
const Settings = require('../models/Settings')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// GET — lire les paramètres (crée si inexistant)
router.get('/', auth, async (req, res) => {
  try {
    let s = await Settings.findOne({})
    if (!s) s = await Settings.create({ companyName: 'CONSTRUCTPRO' })
    res.json(s)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT — mettre à jour (upsert)
router.put('/', auth, async (req, res) => {
  try {
    const s = await Settings.findOneAndUpdate({}, req.body, { upsert: true, new: true })
    res.json(s)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
