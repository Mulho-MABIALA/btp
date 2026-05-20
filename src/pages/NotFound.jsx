import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft, Search, Phone } from 'lucide-react'

const quickLinks = [
  { label: 'Accueil', path: '/' },
  { label: 'Nos Services', path: '/services' },
  { label: 'Nos Projets', path: '/projects' },
  { label: 'Devis Gratuit', path: '/quote' },
  { label: 'Contact', path: '/contact' },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 bg-dot opacity-30 dark:opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[40rem] bg-blue-500/5 dark:bg-blue-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative text-center max-w-2xl mx-auto">

        {/* 404 giant number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
          className="relative mb-6"
        >
          <div
            className="text-[10rem] sm:text-[14rem] font-black leading-none select-none"
            style={{
              background: 'linear-gradient(135deg, #1652f0 0%, #4a7df8 50%, #1040cc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              opacity: 0.15,
            }}
          >
            404
          </div>
          {/* Building icon centered over the 404 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center shadow-blue"
            >
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="12" width="10" height="16" rx="1" fill="white" opacity="0.85"/>
                <rect x="18" y="6" width="10" height="22" rx="1" fill="white"/>
                <rect x="7" y="15" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                <rect x="7" y="20" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                <rect x="21" y="9" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                <rect x="21" y="14" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                <rect x="21" y="19" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            Page introuvable
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-10 max-w-md mx-auto">
            Cette page n'existe pas ou a été déplacée. Retournez à l'accueil ou consultez nos liens rapides ci-dessous.
          </p>
        </motion.div>

        {/* Primary actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="flex flex-wrap gap-3 justify-center mb-12"
        >
          <Link to="/" className="btn-primary py-3.5 px-7">
            <Home size={16} />
            Retour à l'accueil
          </Link>
          <Link
            to="/"
            onClick={() => window.history.back()}
            className="btn px-7 py-3.5 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-navy-800 rounded-xl font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            Page précédente
          </Link>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
        >
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-4">Liens rapides</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="px-4 py-2 rounded-full border border-slate-200 dark:border-navy-700 text-sm font-medium
                           text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500
                           dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Support line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 flex items-center justify-center gap-2 text-slate-400 text-sm"
        >
          <Phone size={14} className="text-blue-500" />
          <span>Besoin d'aide ? </span>
          <a href="tel:+212522000000" className="text-blue-500 hover:underline font-medium">+212 5 22 00 00 00</a>
        </motion.div>
      </div>
    </div>
  )
}
