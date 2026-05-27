import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, Lock, Eye, EyeOff, Loader2,
  ShieldCheck, HardHat, Ruler, Mail
} from 'lucide-react'
import { adminAuth } from '../adminApi'

const floatingIcons = [
  { icon: HardHat,    x: '8%',  y: '18%', size: 22, delay: 0 },
  { icon: Ruler,      x: '88%', y: '14%', size: 18, delay: 0.4 },
  { icon: Building2,  x: '5%',  y: '72%', size: 20, delay: 0.8 },
  { icon: ShieldCheck,x: '90%', y: '70%', size: 19, delay: 0.2 },
  { icon: HardHat,    x: '78%', y: '42%', size: 15, delay: 1.0 },
  { icon: Ruler,      x: '15%', y: '45%', size: 16, delay: 0.6 },
]

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await adminAuth.login(email, password)
      localStorage.setItem('admin_token', data.token)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#050d1a]">

      {/* ── Gradient blobs ─────────────────────────────────────────────── */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-blue-700/10 blur-[80px] rounded-full pointer-events-none" />

      {/* ── Dot grid ───────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* ── Floating icons ─────────────────────────────────────────────── */}
      {floatingIcons.map(({ icon: Icon, x, y, size, delay }, i) => (
        <motion.div
          key={i}
          className="absolute text-blue-500/20 pointer-events-none"
          style={{ left: x, top: y }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      ))}

      {/* ── Main card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[440px] mx-4"
      >
        {/* Card */}
        <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">

          {/* Top accent line */}
          <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent rounded-full" />

          {/* ── Logo ── */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
              className="relative mb-4"
            >
              <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl scale-150" />
              <div className="relative w-[72px] h-[72px] bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 size={32} className="text-white" strokeWidth={1.8} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-center"
            >
              <h1 className="text-2xl font-black tracking-tight text-white">CONSTRUCTPRO</h1>
              <p className="text-blue-400/80 text-sm mt-1 font-medium">Espace administrateur</p>
            </motion.div>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/20 text-xs font-semibold uppercase tracking-widest">Connexion</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* ── Form ── */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">
                Adresse e-mail
              </label>
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-xl bg-blue-500/0 group-focus-within:bg-blue-500/20 blur transition-all duration-300" />
                <div className="relative flex items-center bg-white/6 border border-white/10 group-focus-within:border-blue-500/60 rounded-xl transition-all duration-200">
                  <Mail size={15} className="absolute left-4 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@constructpro.com"
                    required
                    autoComplete="email"
                    className="flex-1 bg-transparent pl-11 pr-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">
                Mot de passe
              </label>
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-xl bg-blue-500/0 group-focus-within:bg-blue-500/20 blur transition-all duration-300" />
                <div className="relative flex items-center bg-white/6 border border-white/10 group-focus-within:border-blue-500/60 rounded-xl transition-all duration-200">
                  <Lock size={15} className="absolute left-4 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    className="flex-1 bg-transparent pl-11 pr-11 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3.5 p-1.5 text-white/30 hover:text-white/60 transition-colors rounded-lg"
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3"
              >
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="relative w-full overflow-hidden group mt-2"
            >
              <div className="absolute inset-0 bg-blue-400/20 blur-xl group-hover:bg-blue-400/30 transition-all duration-300 rounded-xl" />
              <div className={`relative flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all duration-200
                ${loading || !email || !password
                  ? 'bg-blue-600/40 text-white/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
                }`}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Connexion en cours...</>
                  : <><ShieldCheck size={16} /> Se connecter</>
                }
              </div>
            </button>
          </motion.form>

          {/* Bottom link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-center mt-6"
          >
            <a
              href="/"
              className="text-white/25 text-xs hover:text-white/50 transition-colors inline-flex items-center gap-1.5"
            >
              ← Retour au site public
            </a>
          </motion.div>
        </div>

        {/* Bottom badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-center text-white/15 text-[11px] mt-5"
        >
          Accès réservé aux administrateurs autorisés
        </motion.p>
      </motion.div>
    </div>
  )
}
