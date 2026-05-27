const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  category:    String,
  date:        String,
  author:      String,
  authorRole:  String,
  authorImage: String,
  image:       String,
  excerpt:     String,
  content:     String,
  readTime:    String,
  tags:        [String],
}, { timestamps: true })

module.exports = mongoose.model('BlogPost', blogSchema)
