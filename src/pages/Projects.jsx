import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, DollarSign, Calendar, Tag, ArrowUpRight, Loader2 } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import SEO from '../components/ui/SEO'
import useFetch from '../hooks/useFetch'
import { projectsApi } from '../api'

function ProjectModal({ project, onClose }) {
  if (!project) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-navy-950/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-navy-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="relative">
            <img src={project.image} alt={project.title} className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full glass text-white hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-4 left-6">
              <span className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                {project.category}
              </span>
              <h2 className="text-white text-2xl font-bold mt-1.5">{project.title}</h2>
            </div>
          </div>
          <div className="p-8">
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">{project.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: MapPin, label: 'Lieu', value: project.location },
                { icon: DollarSign, label: 'Budget', value: project.budget },
                { icon: Clock, label: 'Durée', value: project.duration },
                { icon: Calendar, label: 'Année', value: project.year },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="bg-slate-50 dark:bg-navy-700 rounded-xl p-3.5 text-center">
                    <Icon size={16} className="text-blue-500 mx-auto mb-1.5" />
                    <div className="text-slate-400 text-[10px] mb-0.5">{item.label}</div>
                    <div className="text-slate-900 dark:text-white font-semibold text-xs">{item.value}</div>
                  </div>
                )
              })}
            </div>
            {project.tags?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {project.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Projects() {
  const [active, setActive] = useState('Tous')
  const [selected, setSelected] = useState(null)

  const { data: projects, loading } = useFetch(() => projectsApi.getAll(active), [active])
  const { data: categories } = useFetch(() => projectsApi.getCategories(), [])

  return (
    <div>
      <SEO
        title="Nos Réalisations"
        description="Découvrez 350+ projets emblématiques de CONSTRUCTPRO : résidences, tours de bureaux, hôtels, infrastructures routières dans 6 pays."
        url="/projects"
        image="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80"
      />
      <PageHero
        title="Nos Réalisations"
        subtitle="350+ projets emblématiques réalisés à travers l'Afrique et le monde."
        breadcrumb={[{ label: 'Projets' }]}
        image="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80"
      />

      <section className="section">
        <div className="wrap">
          <SectionTitle label="Portfolio" title={<>Des projets qui<br /><span className="gradient-text">font notre fierté</span></>} center />

          {/* Filter */}
          <div className="flex flex-wrap justify-center gap-2 mt-10 mb-12">
            {(categories || ['Tous']).map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active === cat
                    ? 'bg-blue-500 text-white shadow-blue'
                    : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {(projects || []).map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.28, delay: i * 0.04 }}
                  onClick={() => setSelected(p)}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer"
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-x-0 bottom-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full uppercase tracking-wider mb-2">
                      {p.category}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-snug">{p.title}</h3>
                    <div className="flex items-center gap-1.5 text-white/50 text-xs mt-1">
                      <MapPin size={10} />{p.location}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full glass text-white opacity-0
                                  group-hover:opacity-100 flex items-center justify-center transition-all duration-300
                                  group-hover:bg-blue-500">
                    <ArrowUpRight size={14} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
