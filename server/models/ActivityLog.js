const mongoose = require('mongoose')

const activityLogSchema = new mongoose.Schema({
  user:        { type: String, default: 'Système' },
  action:      { type: String, enum: ['create', 'update', 'delete', 'login', 'export', 'email', 'other'], default: 'other' },
  entity:      String,
  entityId:    String,
  entityLabel: String,
  details:     String,
  ip:          String,
}, { timestamps: true })

module.exports = mongoose.model('ActivityLog', activityLogSchema)
