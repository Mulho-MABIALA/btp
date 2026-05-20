import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function PageHero({ title, subtitle, breadcrumb, image }) {
  return (
    <section className="relative min-h-[46vh] flex items-end pb-16 pt-36 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={image || 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80'}
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Multi-layer overlay for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/80 to-navy-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-dot opacity-20" />
      </div>

      {/* Blue accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center gap-1.5 text-xs text-white/50 mb-5 font-medium"
        >
          <Link to="/" className="hover:text-white/80 transition-colors">Accueil</Link>
          {breadcrumb?.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="opacity-50" />
              {b.path
                ? <Link to={b.path} className="hover:text-white/80 transition-colors">{b.label}</Link>
                : <span className="text-white/80">{b.label}</span>
              }
            </span>
          ))}
        </motion.nav>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="display-lg text-white"
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-4 text-base text-white/60 max-w-lg"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </section>
  )
}
