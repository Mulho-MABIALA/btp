import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sun, Moon, Phone, ArrowRight } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const navLinks = [
  { label: 'Accueil',        path: '/' },
  { label: 'À propos',       path: '/about' },
  { label: 'Services',       path: '/services' },
  { label: 'Projets',        path: '/projects' },
  { label: 'Témoignages',    path: '/testimonials' },
  { label: 'Blog',           path: '/blog' },
  { label: 'Contact',        path: '/contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { dark, toggleDark } = useTheme()
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const solid = scrolled || !isHome
  const textOnDark = !solid

  return (
    <>
      {/* Top announcement bar */}
      <div className="hidden lg:block bg-navy-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="tel:+212522000000" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone size={11} className="text-blue-500" />
              +212 5 22 00 00 00
            </a>
            <span className="text-slate-700">|</span>
            <a href="mailto:contact@constructpro.ma" className="hover:text-white transition-colors">
              contact@constructpro.ma
            </a>
          </div>
          <span>Lun–Ven 08h – 18h &nbsp;·&nbsp; Sam 09h – 13h</span>
        </div>
      </div>

      {/* Main nav */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          solid
            ? 'bg-white/96 dark:bg-navy-950/96 backdrop-blur-md border-b border-slate-100 dark:border-navy-800 shadow-sm'
            : 'bg-gradient-to-b from-navy-950/70 to-transparent backdrop-blur-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[70px]">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="relative w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-blue overflow-hidden">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="12" width="10" height="16" rx="1" fill="white" opacity="0.85"/>
                  <rect x="18" y="6" width="10" height="22" rx="1" fill="white"/>
                  <rect x="7" y="15" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                  <rect x="7" y="20" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                  <rect x="21" y="9" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                  <rect x="21" y="14" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                  <rect x="21" y="19" width="3" height="2.5" rx="0.4" fill="#1652f0"/>
                </svg>
              </div>
              <div>
                <div className={`font-black text-[17px] leading-none tracking-tight transition-colors ${
                  solid ? 'text-slate-900 dark:text-white' : 'text-white'
                }`}>
                  CONSTRUCT<span className="text-blue-500">PRO</span>
                </div>
                <div className={`text-[9px] tracking-[0.22em] uppercase font-medium mt-0.5 transition-colors ${
                  solid ? 'text-slate-400 dark:text-slate-500' : 'text-white/60'
                }`}>
                  Excellence · Construction
                </div>
              </div>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(link => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === '/'}
                  className={({ isActive }) =>
                    `relative px-3.5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isActive
                        ? solid
                          ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'text-white bg-white/15'
                        : solid
                          ? 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-navy-800'
                          : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggleDark}
                aria-label="Thème"
                className={`p-2 rounded-lg transition-all duration-200 ${
                  solid
                    ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* CTA (desktop) */}
              <Link
                to="/quote"
                className="hidden lg:flex btn-primary text-sm py-2.5 px-5"
              >
                Devis gratuit
                <ArrowRight size={14} />
              </Link>

              {/* Burger */}
              <button
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Menu"
                className={`lg:hidden p-2 rounded-lg transition-colors ${
                  solid
                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-[104px] z-40 lg:hidden bg-white dark:bg-navy-900
                       border-b border-slate-100 dark:border-navy-700 shadow-xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-5 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <NavLink
                    to={link.path}
                    end={link.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="pt-4 border-t border-slate-100 dark:border-navy-700 mt-3">
                <Link to="/quote" className="btn-primary w-full text-sm py-3">
                  Demander un devis gratuit
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
