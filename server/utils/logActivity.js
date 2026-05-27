const ActivityLog = require('../models/ActivityLog')
const jwt = require('jsonwebtoken')

module.exports = async function logActivity(req, action, entity, entityLabel, details = '') {
  try {
    let user = 'Système'
    const token = req.headers?.authorization?.split(' ')[1]
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026')
        user = decoded.email || 'Admin'
      } catch {}
    }
    await ActivityLog.create({
      user, action, entity, entityLabel, details,
      ip: req.ip || req.connection?.remoteAddress,
    })
  } catch {}
}
