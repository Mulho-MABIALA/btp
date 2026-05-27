const mongoose = require('mongoose')

const testimonialSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  role:    String,
  image:   String,
  rating:  { type: Number, default: 5 },
  text:    { type: String, required: true },
  project: String,
}, { timestamps: true })

module.exports = mongoose.model('Testimonial', testimonialSchema)
