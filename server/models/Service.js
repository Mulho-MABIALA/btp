const mongoose = require('mongoose')

const serviceSchema = new mongoose.Schema({
  icon:        String,
  title:       { type: String, required: true },
  description: String,
  color:       String,
  features:    [String],
}, { timestamps: true })

module.exports = mongoose.model('Service', serviceSchema)
