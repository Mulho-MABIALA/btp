const router   = require('express').Router()
const BlogPost = require('../models/BlogPost')

router.get('/', async (req, res) => {
  try {
    const q = req.query.category ? { category: req.query.category } : {}
    res.json(await BlogPost.find(q).sort({ createdAt: -1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.get('/categories', async (req, res) => {
  try { res.json((await BlogPost.distinct('category')).sort()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.get('/:id',  async (req, res) => { try { const d = await BlogPost.findById(req.params.id); d ? res.json(d) : res.status(404).json({ error: 'Introuvable' }) } catch (e) { res.status(500).json({ error: e.message }) } })
router.post('/',    async (req, res) => { try { res.status(201).json(await BlogPost.create(req.body)) } catch (e) { res.status(400).json({ error: e.message }) } })
router.put('/:id',  async (req, res) => { try { const d = await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true }); d ? res.json(d) : res.status(404).json({ error: 'Introuvable' }) } catch (e) { res.status(400).json({ error: e.message }) } })
router.delete('/:id', async (req, res) => { try { await BlogPost.findByIdAndDelete(req.params.id); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) } })

module.exports = router
