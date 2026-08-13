import { AnimatePresence, motion } from 'framer-motion'
import { Portal } from './components/Portal.tsx'
import { Shell } from './components/Shell.tsx'
import { LedgerProvider, useLedger } from './lib/store.tsx'

export default function App() {
  return (
    <LedgerProvider>
      <Gate />
    </LedgerProvider>
  )
}

function Gate() {
  const { ready, session } = useLedger()
  if (!ready) {
    return (
      <div className="aurora grid min-h-dvh place-items-center">
        <p className="font-display text-3xl text-gold">Orbit</p>
      </div>
    )
  }
  return (
    <>
      <div className="grain" />
      <AnimatePresence mode="wait">
        {session ? (
          <motion.div key="shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Shell />
          </motion.div>
        ) : (
          <motion.div key="portal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Portal />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
