"use client";

import { useEffect, useState } from "react";
import { LiquidGlassButton } from "./liquid-glass-button";
import { EncryptedText } from "./encrypted-text";

/**
 * WelcomeScreen — full-screen takeover shown right after signup.
 * Background is blurred landing-page content behind, text uses the
 * encrypted reveal effect.
 */
export function WelcomeScreen({
  username,
  onContinue,
}: {
  username: string;
  onContinue: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  const [stage, setStage] = useState<"encrypted" | "decrypted">(
    "encrypted",
  );

  useEffect(() => {
    const t1 = setTimeout(() => setReveal(true), 280);
    const t2 = setTimeout(() => setStage("decrypted"), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center px-4"
      style={{
        background: "rgba(10,10,12,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        animation: "fadeIn 300ms ease",
      }}
    >
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#65666e]">
        Autenticação confirmada
      </div>
      <h1 className="font-display text-[44px] md:text-[60px] tracking-[-0.04em] text-white text-center">
        {stage === "encrypted" ? (
          <EncryptedText text={`Bem vindo, ${username}`} reveal={reveal} />
        ) : (
          <>
            Bem vindo, <span className="text-[#a78bfa]">{username}</span>
          </>
        )}
      </h1>
      <p className="mt-4 text-[13.5px] text-[#9a9ba3] text-center max-w-md">
        Sua conta foi criada com sucesso. Você já tem acesso aos 1.184 ativos
        BR, 503 S&P 500, 4 índices B3 oficiais e tudo mais.
      </p>
      <div className="mt-8">
        <LiquidGlassButton onClick={onContinue}>
          Entrar no dashboard
        </LiquidGlassButton>
      </div>
    </div>
  );
}
