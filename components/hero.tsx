"use client"

import { motion } from "motion/react"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { EncryptedText } from "@/components/ui/encrypted-text"

export function Hero() {
  return (
    <AuroraBackground>
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-28 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
          </span>
          Dados de mercado em tempo real
        </motion.div>

        <h1 className="max-w-4xl text-balance font-mono text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          <EncryptedText
            text="Uma nova forma de analisar"
            revealDelayMs={45}
            flipDelayMs={45}
            encryptedClassName="text-sky-400/70"
            revealedClassName="text-foreground"
          />
          <br />
          <EncryptedText
            text="o mercado financeiro"
            revealDelayMs={45}
            flipDelayMs={45}
            startDelayMs={1200}
            encryptedClassName="text-sky-400/70"
            revealedClassName="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent"
          />
        </h1>

        <p className="mt-6 max-w-md font-mono text-base text-muted-foreground md:text-xl">
          <EncryptedText
            text="feito por quem entende"
            revealDelayMs={40}
            flipDelayMs={45}
            startDelayMs={2400}
            encryptedClassName="text-muted-foreground/50"
            revealedClassName="text-muted-foreground"
          />
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.7, ease: "easeOut" }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a
            href="#planos"
            className="w-full rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:-translate-y-0.5 sm:w-auto"
          >
            Começar análise gratuita
          </a>
          <a
            href="#recursos"
            className="w-full rounded-full border border-border bg-card/50 px-7 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-card sm:w-auto"
          >
            Ver como funciona
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 0.8 }}
          className="mt-14 grid w-full max-w-2xl grid-cols-3 gap-4 border-t border-border pt-8"
        >
          {[
            { value: "R$ 12,4bi", label: "Volume analisado" },
            { value: "98,7%", label: "Precisão dos sinais" },
            { value: "24/7", label: "Cobertura de mercado" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="font-mono text-xl font-bold text-foreground md:text-2xl">{stat.value}</span>
              <span className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </AuroraBackground>
  )
}
