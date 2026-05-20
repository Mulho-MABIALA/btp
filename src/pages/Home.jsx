import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useInView } from 'react-intersection-observer'
import CountUp from 'react-countup'
import SEO from '../components/ui/SEO'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import {
  ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, CheckCircle, Star, Quote,
  Building2, Layers, Hammer, PenTool, Zap, Droplets,
  GitBranch, ClipboardList, Award, Shield, Clock, Users,
  Construction, Home as HomeIcon, MapPin, Calendar, Play,
} from 'lucide-react'
import SectionTitle from '../components/ui/SectionTitle'
import { services } from '../data/services'
import { projects } from '../data/projects'
import { testimonials } from '../data/testimonials'
import { blogPosts } from '../data/blog'

const iconMap = {
  Building2, Layers, Hammer, PenTool, Construction,
  Zap, Droplets, GitBranch, Home: HomeIcon, ClipboardList,
}

/* ─── Hero slides data ─── */
const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=85',
    tag: 'Construction Résidentielle',
    title: ['Nous bâtissons', "l'avenir", 'avec précision'],
    sub: "De la conception à la livraison, CONSTRUCTPRO réalise vos projets avec une maîtrise inégalée.",
    stat: { n: '350+', l: 'Projets livrés' },
  },
  {
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920&q=85',
    tag: 'Génie Civil & Infrastructures',
    title: ['Des ouvrages', "d'exception", 'pour demain'],
    sub: "Ponts, tunnels, structures complexes — notre expertise technique déployée sans compromis sur la qualité.",
    stat: { n: '20 ans', l: "d'expertise" },
  },
  {
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=85',
    tag: 'Architecture & Design',
    title: ['Transformer', 'vos espaces', 'en chefs-d\'œuvre'],
    sub: "Réhabilitation et modernisation de bâtiments existants avec le plus grand soin du détail.",
    stat: { n: '280+', l: 'Experts certifiés' },
  },
  {
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1920&q=85',
    tag: 'Rénovation Premium',
    title: ['Excellence', 'et innovation', 'en construction'],
    sub: "20 ans d'expérience, des équipes certifiées et une passion pour la qualité qui se reflète partout.",
    stat: { n: '98%', l: 'Clients satisfaits' },
  },
]

/* ─── Stat counter ─── */
function Stat({ value, suffix, label, index }) {
  const { ref, inView } = useInView({ threshold: 0.4, triggerOnce: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1 }}
      className="flex flex-col items-center text-center"
    >
      <div className="text-5xl md:text-6xl font-black text-white leading-none tabular-nums">
        {inView ? <CountUp end={value} duration={2.2} separator=" " /> : 0}
        <span className="text-blue-400">{suffix}</span>
      </div>
      <div className="text-slate-400 text-sm mt-2 font-medium">{label}</div>
    </motion.div>
  )
}

/* ─── Service card ─── */
function ServiceCard({ s, index }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  const Icon = iconMap[s.icon] || Building2
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 5) * 0.08 }}
      className="group card-hover p-6 cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} className="text-white" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-2 leading-snug">{s.title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
      <Link to="/services" className="inline-flex items-center gap-1 text-blue-500 text-sm font-semibold group-hover:gap-2 transition-all duration-200">
        En savoir plus <ArrowRight size={13} />
      </Link>
    </motion.div>
  )
}

/* ─── Project card ─── */
function ProjectCard({ p, index }) {
  const { ref, inView } = useInView({ threshold: 0.08, triggerOnce: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className="group relative overflow-hidden rounded-2xl aspect-[4/3]"
    >
      <img
        src={p.image}
        alt={p.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
      <div className="absolute inset-0 p-5 flex flex-col justify-end">
        <span className="inline-block w-fit px-2.5 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full mb-2.5 tracking-wide uppercase">
          {p.category}
        </span>
        <h3 className="text-white font-bold text-lg leading-snug">{p.title}</h3>
        <div className="flex items-center gap-1.5 text-white/50 text-xs mt-1">
          <MapPin size={11} />{p.location}
        </div>
        <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex gap-3 mt-3">
          <span className="text-xs text-white/60 flex items-center gap-1"><Clock size={10}/>{p.duration}</span>
          <span className="text-xs text-white/60">·</span>
          <span className="text-xs text-white/60">{p.budget}</span>
        </div>
      </div>
      <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-blue-500">
        <ArrowUpRight size={15} />
      </div>
    </motion.div>
  )
}

/* ─── Blog card ─── */
function BlogCard({ post, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group card-hover overflow-hidden"
    >
      <div className="relative overflow-hidden aspect-[16/9]">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <span className="absolute top-3 left-3 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          {post.category}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
          <span className="flex items-center gap-1"><Calendar size={11}/>{post.date}</span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 mb-3 group-hover:text-blue-500 transition-colors">
          {post.title}
        </h3>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-navy-700">
          <div className="flex items-center gap-2">
            <img src={post.authorImage} alt={post.author} className="w-6 h-6 rounded-full object-cover" />
            <span className="text-slate-400 text-xs">{post.author}</span>
          </div>
          <Link to="/blog" className="text-blue-500 text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
            Lire <ArrowRight size={12}/>
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE HOME
═══════════════════════════════════════════════════ */
export default function Home() {
  const swiperRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const AUTOPLAY_DELAY = 6000

  /* progress bar tick */
  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 0
        return p + (100 / (AUTOPLAY_DELAY / 50))
      })
    }, 50)
    return () => clearInterval(interval)
  }, [activeIdx])

  return (
    <div className="overflow-x-hidden">
      <SEO
        title="Leader BTP depuis 2004"
        description="CONSTRUCTPRO — Construction, génie civil, rénovation et architecture. 350+ projets livrés dans 6 pays. Devis gratuit sous 24h."
        url="/"
      />

      {/* ════════════════════════════════════════
          HERO CAROUSEL
      ════════════════════════════════════════ */}
      <section className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-navy-950">

        <Swiper
          modules={[EffectFade, Autoplay, Pagination]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          autoplay={{ delay: AUTOPLAY_DELAY, disableOnInteraction: false }}
          loop
          speed={900}
          onBeforeInit={swiper => { swiperRef.current = swiper }}
          onSlideChange={swiper => setActiveIdx(swiper.realIndex)}
          className="w-full h-full"
        >
          {heroSlides.map((slide, i) => (
            <SwiperSlide key={i} className="relative w-full h-full">
              {/* Background image */}
              <div className="absolute inset-0">
                <img
                  src={slide.image}
                  alt={slide.tag}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Single strong gradient — left-heavy, transparent right */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, rgba(6,14,28,0.96) 0%, rgba(6,14,28,0.80) 45%, rgba(6,14,28,0.35) 75%, transparent 100%)'
                }}
              />
              {/* Bottom gradient for readability */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-950 to-transparent" />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* ── Slide content overlay ── */}
        <div className="absolute inset-0 z-10 flex items-center pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-[620px]">

              {/* Tag badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`tag-${activeIdx}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 mb-6"
                >
                  <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 rounded-full px-4 py-1.5 pointer-events-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-300 text-xs font-semibold tracking-widest uppercase">
                      {heroSlides[activeIdx].tag}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Headline */}
              <AnimatePresence mode="wait">
                <motion.h1
                  key={`h1-${activeIdx}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.55, delay: 0.06 }}
                  className="text-5xl sm:text-6xl lg:text-[5.5rem] font-black leading-[1.02] tracking-tight text-white mb-6"
                >
                  {heroSlides[activeIdx].title.map((line, i) => (
                    <span key={i} className="block">
                      {i === 1 ? <span className="gradient-text">{line}</span> : line}
                    </span>
                  ))}
                </motion.h1>
              </AnimatePresence>

              {/* Subtitle */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={`sub-${activeIdx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 }}
                  className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-[500px] mb-9"
                >
                  {heroSlides[activeIdx].sub}
                </motion.p>
              </AnimatePresence>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="flex flex-wrap gap-3 mb-12 pointer-events-auto"
              >
                <Link to="/quote" className="btn-primary py-4 px-8 text-base">
                  Demander un devis
                  <ArrowRight size={17} />
                </Link>
                <Link to="/projects" className="btn-ghost-white py-4 px-8 text-base">
                  Voir nos projets
                </Link>
              </motion.div>

              {/* Certifications */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-2 pointer-events-auto"
              >
                {['ISO 9001', 'HQE Certifié', 'LEED Gold', 'OHSAS 18001'].map(cert => (
                  <span
                    key={cert}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 bg-white/6 text-white/55 text-xs font-medium backdrop-blur-sm"
                  >
                    <CheckCircle size={10} className="text-blue-400" />{cert}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Floating stat card (right side, desktop) ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`stat-${activeIdx}`}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="absolute right-10 top-1/2 -translate-y-1/2 z-10 hidden xl:block"
          >
            <div className="glass-dark px-8 py-7 text-center min-w-[160px] rounded-2xl">
              <div className="text-4xl font-black text-white mb-1">{heroSlides[activeIdx].stat.n}</div>
              <div className="text-slate-400 text-sm">{heroSlides[activeIdx].stat.l}</div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Bottom controls bar ── */}
        <div className="absolute bottom-0 inset-x-0 z-10 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-end justify-between gap-6">

            {/* Slide counter + progress */}
            <div className="flex items-center gap-5">
              {/* Numbered dots */}
              <div className="flex items-center gap-2.5">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => swiperRef.current?.slideToLoop(i)}
                    className={`transition-all duration-300 rounded-full ${
                      i === activeIdx
                        ? 'w-8 h-2 bg-blue-500'
                        : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>

              {/* Counter */}
              <span className="text-white/40 text-xs font-mono tabular-nums hidden sm:block">
                <span className="text-white font-semibold">0{activeIdx + 1}</span> / 0{heroSlides.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex-1 max-w-[200px] hidden md:block">
              <div className="h-px bg-white/15 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Prev / Next arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => swiperRef.current?.slidePrev()}
                className="w-11 h-11 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm
                           flex items-center justify-center text-white hover:bg-blue-500 hover:border-blue-500
                           transition-all duration-200"
                aria-label="Précédent"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => swiperRef.current?.slideNext()}
                className="w-11 h-11 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm
                           flex items-center justify-center text-white hover:bg-blue-500 hover:border-blue-500
                           transition-all duration-200"
                aria-label="Suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-1.5">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 bg-blue-500 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          STATS DARK STRIP
      ════════════════════════════════════════ */}
      <section className="bg-navy-900 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 divide-y-2 lg:divide-y-0 lg:divide-x divide-navy-800">
            {[
              { value: 350, suffix: '+',    label: 'Projets réalisés'   },
              { value: 20,  suffix: ' ans', label: "D'expérience"       },
              { value: 98,  suffix: '%',    label: 'Clients satisfaits' },
              { value: 280, suffix: '+',    label: 'Experts certifiés'  },
            ].map((s, i) => (
              <div key={s.label} className={`${i > 0 ? 'lg:pl-10 pt-10 lg:pt-0' : ''}`}>
                <Stat {...s} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SERVICES
      ════════════════════════════════════════ */}
      <section className="section bg-slate-50 dark:bg-navy-900/40">
        <div className="wrap">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <SectionTitle
              label="Nos expertises"
              title={<>Ce que nous<br />faisons le mieux</>}
              subtitle="10 domaines d'excellence couverts par des équipes certifiées et passionnées."
            />
            <Link to="/services" className="btn-outline self-start shrink-0">
              Tous nos services <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {services.map((s, i) => <ServiceCard key={s.id} s={s} index={i} />)}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          WHY US — dark editorial
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-navy-950 section">
        <div className="absolute inset-0 bg-dot opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950/80" />

        {/* Side image */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&q=80"
            alt="Équipe"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 to-transparent" />
        </div>

        <div className="relative wrap">
          <div className="max-w-2xl">
            <SectionTitle
              label="Pourquoi CONSTRUCTPRO"
              title={<>L'excellence à chaque<br /><span className="gradient-text">étape du projet</span></>}
              subtitle="20 ans d'expérience, des équipes certifiées et une passion pour la qualité qui se reflète dans chaque ouvrage."
              light
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
              {[
                { icon: Shield, title: 'Garantie décennale', desc: 'Couverture complète de vos ouvrages pendant 10 ans.' },
                { icon: Clock, title: 'Respect des délais', desc: '97% de nos projets livrés dans les délais contractuels.' },
                { icon: Award, title: 'ISO 9001:2015', desc: 'Système de management qualité internationalement reconnu.' },
                { icon: Users, title: '280+ experts', desc: 'Ingénieurs, architectes et techniciens de haut niveau.' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-4 p-5 rounded-xl border border-white/8 bg-white/4
                               hover:bg-white/8 hover:border-blue-500/30 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors duration-200">
                      <Icon size={17} className="text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{item.title}</h4>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8"
            >
              <Link to="/about" className="btn-primary">
                Notre histoire <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PROJECTS
      ════════════════════════════════════════ */}
      <section className="section">
        <div className="wrap">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <SectionTitle
              label="Réalisations"
              title={<>Projets qui parlent<br />d'eux-mêmes</>}
              subtitle="Découvrez une sélection de nos projets emblématiques à travers le monde."
            />
            <Link to="/projects" className="btn-dark self-start shrink-0">
              Tous les projets <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 5).map((p, i) => (
              <div key={p.id} className={i === 0 ? 'md:col-span-2 lg:col-span-1' : ''}>
                <ProjectCard p={p} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="section bg-slate-50 dark:bg-navy-900/40">
        <div className="wrap">
          <SectionTitle
            label="Témoignages"
            title="Ce que disent nos clients"
            subtitle="La satisfaction de nos clients est notre meilleure référence."
            center
          />
          <div className="mt-12">
            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={20}
              slidesPerView={1}
              breakpoints={{ 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
              pagination={{ clickable: true }}
              autoplay={{ delay: 5500, disableOnInteraction: false }}
              className="pb-12"
            >
              {testimonials.map(t => (
                <SwiperSlide key={t.id} className="h-auto">
                  <div className="card p-6 h-full flex flex-col border border-slate-100 dark:border-navy-700">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={13} className="text-blue-500 fill-blue-500" />
                      ))}
                    </div>
                    <Quote size={24} className="text-blue-500/20 mb-2" />
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 italic">"{t.text}"</p>
                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-navy-700">
                      <img src={t.image} alt={t.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20" />
                      <div>
                        <div className="text-slate-900 dark:text-white font-semibold text-sm">{t.name}</div>
                        <div className="text-slate-400 text-xs">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BLOG
      ════════════════════════════════════════ */}
      <section className="section">
        <div className="wrap">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <SectionTitle
              label="Blog & Actualités"
              title={<>Dernières nouvelles<br />du secteur BTP</>}
            />
            <Link to="/blog" className="btn-dark self-start shrink-0">
              Tous les articles <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.slice(0, 3).map((post, i) => <BlogCard key={post.id} post={post} index={i} />)}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA FINAL
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-navy-950 section">
        <div className="absolute inset-0 bg-gradient-blue-dark opacity-60" />
        <div className="absolute inset-0 bg-dot opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[20rem] bg-blue-500/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative wrap text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <span className="label-tag justify-center mb-4">Démarrons ensemble</span>
            <h2 className="display-lg text-white mb-5 text-balance">
              Votre projet commence<br />
              <span className="gradient-text">ici et maintenant</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
              Contactez nos experts et obtenez un devis détaillé et gratuit sous 24 heures.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/quote" className="btn-primary py-4 px-10 text-base">
                Devis gratuit en 2 min
                <ArrowRight size={17} />
              </Link>
              <Link to="/contact" className="btn-ghost-white py-4 px-10 text-base">
                Nous contacter
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
