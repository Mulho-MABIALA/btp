import { motion } from 'framer-motion'

export default function Loader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[9999] bg-navy-950 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated logo mark */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative"
        >
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 -m-3 rounded-2xl border border-blue-500/30"
          />
          {/* Inner box */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-glow">
            {/* Building icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="12" width="10" height="16" rx="1" fill="white" opacity="0.9"/>
              <rect x="18" y="6" width="10" height="22" rx="1" fill="white"/>
              <rect x="7" y="15" width="3" height="3" rx="0.5" fill="#1652f0" opacity="0.8"/>
              <rect x="7" y="20" width="3" height="3" rx="0.5" fill="#1652f0" opacity="0.8"/>
              <rect x="21" y="9" width="3" height="3" rx="0.5" fill="#1652f0" opacity="0.8"/>
              <rect x="21" y="14" width="3" height="3" rx="0.5" fill="#1652f0" opacity="0.8"/>
              <rect x="21" y="19" width="3" height="3" rx="0.5" fill="#1652f0" opacity="0.8"/>
            </svg>
          </div>
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="text-2xl font-black tracking-tight text-white">
            CONSTRUCT<span className="text-blue-400">PRO</span>
          </div>
          <div className="text-slate-500 text-[10px] tracking-[0.3em] uppercase mt-1.5">
            Excellence en construction
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="w-40 h-[2px] bg-navy-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%', x: '-100%' }}
            animate={{ width: '100%', x: '0%' }}
            transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  )
}
