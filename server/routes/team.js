const router     = require('express').Router()
const TeamMember = require('../models/TeamMember')

router.get('/',     async (req, res) => { try { res.json(await TeamMember.find()) } catch (e) { res.status(500).json({ error: e.message }) } })
router.get('/:id',  async (req, res) => { try { const d = await TeamMember.findById(req.params.id); d ? res.json(d) : res.status(404).json({ error: 'Introuvable' }) } catch (e) { res.status(500).json({ error: e.message }) } })
router.post('/',    async (req, res) => { try { res.status(201).json(await TeamMember.create(req.body)) } catch (e) { res.status(400).json({ error: e.message }) } })
router.put('/:id',  async (req, res) => { try { const d = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true }); d ? res.json(d) : res.status(404).json({ error: 'Introuvable' }) } catch (e) { res.status(400).json({ error: e.message }) } })
router.delete('/:id', async (req, res) => { try { await TeamMember.findByIdAndDelete(req.params.id); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) } })

module.exports = router
