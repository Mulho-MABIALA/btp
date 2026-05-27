import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SEO from '../components/ui/SEO'
import { ArrowRight, CheckCircle,
  Building2, Layers, Hammer, PenTool, Zap, Droplets,
  GitBranch, ClipboardList, Construction, Home as HomeIcon } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import useFetch from '../hooks/useFetch'
import { servicesApi } from '../api'

const iconMap = { Building2, Layers, Hammer, PenTool, Construction, Zap, Droplets, GitBranch, Home: HomeIcon, ClipboardList }

const processSteps = [
  { num: '01', title: 'Consultation',     desc: 'Analyse de vos besoins, écoute active et compréhension de votre vision de projet.' },
  { num: '02', title: 'Étude & Conception', desc: 'Plans détaillés, études techniques, choix des matériaux et budgétisation précise.' },
  { num: '03', title: 'Réalisation',       desc: 'Exécution rigoureuse avec contrôle qualité permanent et reporting hebdomadaire.' },
  { num: '04', title: 'Livraison',         desc: 'Réception formelle, documentation complète et activation garantie décennale.' },
]

export default function Services() {
  const { data: services } = useFetch(() => servicesApi.getAll(), [])

  return (
    <div>
      <SEO
        title="Nos Services"
        description="10 domaines d'expertise BTP : construction, génie civil, rénovation, architecture, travaux publics, électricité, plomberie, voirie et plus."
        url="/services"
      />
      <PageHero
        title="Nos Services"
        subtitle="Une gamme complète de services BTP portés par des équipes d'experts certifiés."
        breadcrumb={[{ label: 'Services' }]}
        image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80"
      />

      {/* Services list */}
      <section className="section">
        <div className="wrap">
          <SectionTitle
            label="Nos expertises"
            title={<>10 domaines<br /><span className="gradient-text">d'excellence</span></>}
            subtitle="Chaque service est assuré par des équipes spécialisées avec des années d'expérience terrain."
            center
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-14">
            {(services || []).map((s, i) => {
              const Icon = iconMap[s.icon] || Building2
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 2) * 0.08 }}
                  className="card-hover p-7 flex gap-6 group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0
                                   group-hover:scale-105 transition-transform duration-300`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">{s.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">{s.description}</p>
                    <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                      {s.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
                          <CheckCircle size={12} className="text-blue-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section bg-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-25" />
        <div className="relative wrap">
          <SectionTitle label="Notre méthode" title="Comment nous travaillons" light center />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-dark p-6 text-center relative hover:border-blue-500/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white text-xl font-black flex items-center justify-center mx-auto mb-5 shadow-blue">
                  {step.num}
                </div>
                <h3 className="text-white font-bold mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-11 -right-2.5 text-blue-500/30">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="bg-navy-950 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-dot opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/80 to-navy-950" />
            <div className="relative">
              <p className="label-tag mb-2">Votre projet</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Notre expertise à votre service</h2>
              <p className="text-slate-400 mt-2">Obtenez une proposition personnalisée en 24h.</p>
            </div>
            <Link to="/quote" className="btn-primary relative shrink-0 py-4 px-8 text-base">
              Demander un devis <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
