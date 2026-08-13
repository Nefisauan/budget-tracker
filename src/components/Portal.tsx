import { motion } from 'framer-motion'
import { Cloud, CloudOff } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useLedger } from '../lib/store.tsx'
import { Button, Field, fieldClass } from './ui.tsx'

const PortalCanvas = lazy(async () => {
  const m = await import('./Scene.tsx')
  return { default: m.PortalCanvas }
})

export function Portal() {
  const {
    enter,
    state,
    cloudProfile,
    cloudStatus,
    cloudError,
    connectCloud,
    disconnectCloud,
  } = useLedger()
  const { kaylie, nefi } = state.profiles
  const [profileName, setProfileName] = useState('')
  const [pin, setPin] = useState('')
  const [formError, setFormError] = useState('')

  return (
    <div className="aurora relative min-h-dvh overflow-hidden">
      <Suspense fallback={null}>
        <PortalCanvas />
      </Suspense>
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-10">
        <header className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-gold uppercase">Kaylie & Nefi</p>
            <h1 className="mt-3 font-display text-5xl font-light tracking-tight text-mist md:text-7xl">
              Orbit
            </h1>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-mute md:block">
            A shared observatory for money, time, and whatever you are walking toward next.
          </p>
        </header>

        <div className="hairline mt-10" />

        <div className="glass mt-8 rounded-3xl p-5">
          {cloudProfile ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-teal/10 text-teal">
                  <Cloud size={18} />
                </span>
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-mute uppercase">Cloud profile</p>
                  <p className="text-sm text-mist">
                    {cloudProfile} · {cloudStatus === 'saving' ? 'saving…' : cloudStatus === 'error' ? 'save error' : 'synced'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={disconnectCloud} className="text-xs text-mute hover:text-rose">
                Disconnect this device
              </button>
              {cloudError ? <p className="w-full text-xs text-rose">{cloudError}</p> : null}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold">
                  <CloudOff size={18} />
                </span>
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-mute uppercase">Save across devices</p>
                  <p className="text-sm text-mist">Use the same profile name and PIN on your phone and computer.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                <Field label="Shared profile name">
                  <input
                    className={fieldClass()}
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="kaylie-and-nefi"
                    autoComplete="username"
                  />
                </Field>
                <Field label="PIN">
                  <input
                    className={fieldClass()}
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="4+ digits"
                    autoComplete="current-password"
                  />
                </Field>
                <Button
                  onClick={() => {
                    setFormError('')
                    void connectCloud(profileName, pin).catch((error: unknown) => {
                      setFormError(error instanceof Error ? error.message : 'Could not open cloud profile.')
                    })
                  }}
                  className={cloudStatus === 'loading' ? 'pointer-events-none opacity-50' : ''}
                >
                  {cloudStatus === 'loading' ? 'Opening…' : 'Open or create'}
                </Button>
              </div>
              {formError || cloudError ? <p className="mt-3 text-xs text-rose">{formError || cloudError}</p> : null}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="my-auto grid gap-6 py-16 md:grid-cols-2"
        >
          <ProfileCard
            name={kaylie.name}
            age={kaylie.age}
            tagline={kaylie.tagline}
            tone="rose"
            onEnter={() => enter('kaylie')}
          />
          <ProfileCard
            name={nefi.name}
            age={nefi.age}
            tagline={nefi.tagline}
            tone="teal"
            onEnter={() => enter('nefi')}
          />
        </motion.div>

        <div className="flex flex-col items-center gap-4 pb-4">
          <button
            type="button"
            onClick={() => enter('together')}
            className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 text-sm tracking-[0.18em] text-gold uppercase transition hover:bg-gold/20"
          >
            Enter together
          </button>
          <p className="text-xs text-mute">
            {cloudProfile ? `Synced as ${cloudProfile}. Export a backup anytime.` : 'Progress saves on this device until you connect a cloud profile.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function ProfileCard({
  name,
  age,
  tagline,
  tone,
  onEnter,
}: {
  name: string
  age: number
  tagline: string
  tone: 'rose' | 'teal'
  onEnter: () => void
}) {
  const glow = tone === 'rose' ? 'hover:border-rose/40' : 'hover:border-teal/40'
  const nameColor = tone === 'rose' ? 'text-rose' : 'text-teal'
  return (
    <button
      type="button"
      onClick={onEnter}
      className={`glass group rounded-[2rem] p-8 text-left transition ${glow}`}
    >
      <p className="text-[11px] tracking-[0.28em] text-mute uppercase">{tagline}</p>
      <h2 className={`mt-6 font-display text-5xl font-light ${nameColor}`}>{name}</h2>
      <p className="mt-3 text-sm text-mute">{age} years old · choose this orbit</p>
      <span className="mt-10 inline-flex items-center gap-2 text-sm text-gold">
        Open ledger
        <span className="transition group-hover:translate-x-1">→</span>
      </span>
    </button>
  )
}
