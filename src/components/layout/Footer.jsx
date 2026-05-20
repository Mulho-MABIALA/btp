import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Linkedin, Twitter, ArrowRight, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      {/* CTA strip */}
      <div className="border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-blue-400 label-tag mb-2">Prêt à construire ?</p>
            <h3 className="text-2xl font-bold text-white">Votre projet mérite les meilleurs.</h3>
          </div>
          <Link to="/quote" className="btn-primary shrink-0">
            Obtenir un devis gratuit
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-navy-800">

          {/* Brand col */}
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-3 mb-5 group w-fit">
              <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-blue">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="12" width="10" height="16" rx="1" fill="white" opacity="0.85"/>
                  <rect x="18" y="6" width="10" height="22" rx="1" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="font-black text-[17px] text-white leading-none">
                  CONSTRUCT<span className="text-blue-500">PRO</span>
                </div>
                <div className="text-[9px] text-slate-600 tracking-[0.22em] uppercase font-medium mt-0.5">
                  Excellence · Construction
                </div>
              </div>
            </Link>

            <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xs">
              Leader régional en BTP depuis 2004. Nous construisons l'avenir avec expertise, innovation et durabilité dans 6 pays.
            </p>

            <div className="flex items-center gap-2.5">
              {[
                { icon: Linkedin,  href: '#' },
                { icon: Twitter,   href: '#' },
                { icon: Facebook,  href: '#' },
                { icon: Instagram, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-xl bg-navy-800 hover:bg-blue-500 text-slate-500 hover:text-white
                             flex items-center justify-center transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav cols */}
          {[
            {
              title: "L'entreprise",
              links: [
                { label: 'À propos', path: '/about' },
                { label: 'Notre équipe', path: '/team' },
                { label: 'Nos projets', path: '/projects' },
                { label: 'Blog & Actualités', path: '/blog' },
                { label: 'Carrières', path: '/contact' },
              ],
            },
            {
              title: 'Services',
              links: [
                { label: 'Construction', path: '/services' },
                { label: 'Génie civil', path: '/services' },
                { label: 'Rénovation', path: '/services' },
                { label: 'Architecture', path: '/services' },
                { label: 'Travaux publics', path: '/services' },
              ],
            },
          ].map(col => (
            <div key={col.title} className="md:col-span-2">
              <h4 className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-5">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-slate-500 hover:text-blue-400 text-sm transition-colors duration-150 flex items-center gap-1.5 group"
                    >
                      <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact col */}
          <div className="md:col-span-4">
            <h4 className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-5">Contact</h4>
            <ul className="space-y-4">
              {[
                { icon: MapPin,  content: '123 Boulevard Mohammed V, Casablanca 20000, Maroc' },
                { icon: Phone,   content: '+212 5 22 00 00 00', href: 'tel:+212522000000' },
                { icon: Mail,    content: 'contact@constructpro.ma', href: 'mailto:contact@constructpro.ma' },
                { icon: Clock,   content: 'Lun–Ven : 08h00 – 18h00 · Sam : 09h–13h' },
              ].map(({ icon: Icon, content, href }) => (
                <li key={content}>
                  {href ? (
                    <a href={href} className="flex gap-3 text-slate-500 hover:text-blue-400 text-sm transition-colors">
                      <Icon size={14} className="text-blue-500/70 shrink-0 mt-0.5" />
                      <span>{content}</span>
                    </a>
                  ) : (
                    <div className="flex gap-3 text-slate-500 text-sm">
                      <Icon size={14} className="text-blue-500/70 shrink-0 mt-0.5" />
                      <span>{content}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-xs">
          <p>© {new Date().getFullYear()} CONSTRUCTPRO. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link to="/contact" className="hover:text-blue-400 transition-colors">Politique de confidentialité</Link>
            <Link to="/contact" className="hover:text-blue-400 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
