import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Search, Calendar, Clock } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import SEO from '../components/ui/SEO'
import { blogPosts } from '../data/blog'

const allCategories = ['Tous', ...new Set(blogPosts.map(p => p.category))]

export default function Blog() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tous')

  const filtered = blogPosts.filter(p => {
    const m = p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase())
    const c = category === 'Tous' || p.category === category
    return m && c
  })

  return (
    <div>
      <SEO
        title="Blog & Actualités BTP"
        description="Tendances, innovations et actualités du secteur BTP. Conseils d'experts CONSTRUCTPRO en construction, architecture et génie civil."
        url="/blog"
      />
      <PageHero
        title="Blog & Actualités"
        subtitle="Tendances, innovations et actualités du secteur BTP."
        breadcrumb={[{ label: 'Blog' }]}
        image="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80"
      />

      <section className="section">
        <div className="wrap">
          {/* Search & filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-12">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-11"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-blue-500 text-white shadow-blue'
                      : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Featured article */}
          {filtered.length > 0 && (
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group card-hover overflow-hidden mb-8 grid lg:grid-cols-2"
            >
              <div className="relative overflow-hidden aspect-video lg:aspect-auto">
                <img
                  src={filtered[0].image}
                  alt={filtered[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                  {filtered[0].category}
                </span>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <div className="flex gap-4 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1"><Calendar size={12}/>{filtered[0].date}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/>{filtered[0].readTime}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-blue-500 transition-colors">
                  {filtered[0].title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">{filtered[0].excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={filtered[0].authorImage} alt={filtered[0].author} className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20" />
                    <div>
                      <div className="text-slate-900 dark:text-white font-semibold text-sm">{filtered[0].author}</div>
                      <div className="text-slate-400 text-xs">{filtered[0].authorRole}</div>
                    </div>
                  </div>
                  <button className="btn-primary text-xs py-2 px-4">Lire <ArrowRight size={12} /></button>
                </div>
              </div>
            </motion.article>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.slice(1).map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group card-hover overflow-hidden"
              >
                <div className="relative overflow-hidden aspect-[16/9]">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 bg-blue-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    {post.category}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex gap-3 text-xs text-slate-400 mb-2.5">
                    <span className="flex items-center gap-1"><Calendar size={10}/>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 mb-3 group-hover:text-blue-500 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 dark:border-navy-700">
                    <div className="flex items-center gap-2">
                      <img src={post.authorImage} alt={post.author} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-slate-400 text-xs">{post.author}</span>
                    </div>
                    <button className="text-blue-500 text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                      Lire <ArrowRight size={11}/>
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Search size={36} className="mx-auto mb-4 opacity-30" />
              <p>Aucun article trouvé.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
