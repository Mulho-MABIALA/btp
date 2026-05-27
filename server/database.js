const Datastore = require('@seald-io/nedb')
const path = require('path')

const dbDir = path.join(__dirname, 'data')
require('fs').mkdirSync(dbDir, { recursive: true })

const db = {
  projects:     new Datastore({ filename: path.join(dbDir, 'projects.db'),     autoload: true }),
  services:     new Datastore({ filename: path.join(dbDir, 'services.db'),     autoload: true }),
  team:         new Datastore({ filename: path.join(dbDir, 'team.db'),         autoload: true }),
  blog:         new Datastore({ filename: path.join(dbDir, 'blog.db'),         autoload: true }),
  testimonials: new Datastore({ filename: path.join(dbDir, 'testimonials.db'), autoload: true }),
  contacts:     new Datastore({ filename: path.join(dbDir, 'contacts.db'),     autoload: true }),
  quotes:       new Datastore({ filename: path.join(dbDir, 'quotes.db'),       autoload: true }),
}

module.exports = db
