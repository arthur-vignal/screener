"use client";

/**
 * AccountPanel — conteúdo completo da página de perfil de conta.
 *
 * Reutilizado em /account (rota dedicada) e /settings/account (dentro
 * do menu de settings). Mostra 3 seções:
 *
 *   1. Profile: display name + email (editáveis, com feedback de erro)
 *   2. Password: troca com validação de senha atual (via Supabase Auth)
 *   3. Sessions ativas: lista de devices + botão logout em cada
 *   4. Sign out: botão de logout (limpa cookie de sessão)
 *
 * Todos os forms chamam APIs reais (não mockam). Dados vêm de
 * GET /api/account/profile no mount.
 */

import {
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Lock,
  Smartphone,
  Globe,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Profile = {
  username: string;
  email: string;
  createdAt: number | null;
};

type SessionInfo = {
  id: string;
  isCurrent: boolean;
  /** ISO date string. */
  createdAt: string;
  /** User-Agent header. */
  userAgent: string | null;
  /** IP address. */
  ip: string | null;
};

function parseUserAgent(ua: string | null): {
  type: "mobile" | "web" | "unknown";
  label: string;
} {
  if (!ua) return { type: "unknown", label: "Desconhecido" };
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    return { type: "mobile", label: "Mobile" };
  }
  if (/mozilla|chrome|safari|firefox|edge/i.test(ua)) {
    return { type: "web", label: "Web" };
  }
  return { type: "unknown", label: "Outro" };
}

function formatDate(unixSec: number | string): string {
  const ms = typeof unixSec === "string" ? Date.parse(unixSec) : unixSec * 1000;
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountPanel(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const r = await fetch("/api/account/profile", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as Profile;
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions() {
    try {
      const r = await fetch("/api/account/sessions", { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as { sessions: SessionInfo[] };
      setSessions(data.sessions ?? []);
    } catch {
      // ignore — lista de sessões é nice-to-have
    }
  }

  useEffect(() => {
    loadProfile();
    loadSessions();
  }, []);

  if (loading) {
    return <AccountPanelSkeleton />;
  }
  if (!profile) {
    return (
      <div className="rounded-2xl fey-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar seu perfil.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={loadProfile}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileSection
        profile={profile}
        onSaved={(p) => {
          setProfile(p);
          loadSessions();
        }}
      />
      <PasswordSection />
      <SessionsSection
        sessions={sessions}
        onChange={() => {
          loadSessions();
          loadProfile();
        }}
      />
      <SignOutSection
        onSignedOut={() => {
          router.push("/login");
        }}
      />
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────

function ProfileSection({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
}): JSX.Element {
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Re-sync local state se profile mudar externamente.
  useEffect(() => {
    setUsername(profile.username);
    setEmail(profile.email);
  }, [profile.username, profile.email]);

  const dirty =
    username.trim().toLowerCase() !== profile.username ||
    email.trim().toLowerCase() !== profile.email;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, email }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${r.status}`);
      }
      const data = (await r.json()) as Profile;
      onSaved(data);
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl fey-card p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground tracking-tight">
            Perfil
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground/85">
            Nome e email exibidos no Sulfur.
          </p>
        </div>
        {profile.createdAt && (
          <span className="text-[11px] text-muted-foreground/70 tabular-nums">
            desde {formatDate(profile.createdAt)}
          </span>
        )}
      </header>

      <div className="flex flex-col gap-3">
        <FieldRow
          id="account-username"
          label="Nome de usuário"
          value={username}
          onChange={setUsername}
        />
        <FieldRow
          id="account-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          icon={<Mail size={14} className="text-muted-foreground" />}
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          {error && (
            <span className="text-[12px] text-[var(--negative)]">{error}</span>
          )}
          {savedAt && (
            <span className="text-[12px] text-[var(--positive)]">
              Salvo
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !dirty}
            onClick={save}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Password ─────────────────────────────────────────────────────────────

function PasswordSection(): JSX.Element {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const ready =
    currentPwd.length >= 8 &&
    newPwd.length >= 8 &&
    newPwd === confirmPwd &&
    currentPwd !== newPwd;

  async function change() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${r.status}`);
      }
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao trocar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl fey-card p-5">
      <header className="mb-4">
        <h2 className="font-display text-[15px] font-semibold text-foreground tracking-tight">
          Senha
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground/85">
          Troque sua senha pra manter a conta segura.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <PasswordField
          id="account-current-pwd"
          label="Senha atual"
          value={currentPwd}
          onChange={setCurrentPwd}
          shown={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          autocomplete="current-password"
        />
        <PasswordField
          id="account-new-pwd"
          label="Nova senha"
          value={newPwd}
          onChange={setNewPwd}
          shown={showNew}
          onToggle={() => setShowNew((v) => !v)}
          autocomplete="new-password"
        />
        <PasswordField
          id="account-confirm-pwd"
          label="Confirmar nova senha"
          value={confirmPwd}
          onChange={setConfirmPwd}
          shown={showNew}
          onToggle={() => setShowNew((v) => !v)}
          autocomplete="new-password"
        />

        {newPwd && confirmPwd && newPwd !== confirmPwd && (
          <p className="text-[11px] text-[var(--negative)]">
            As senhas não conferem.
          </p>
        )}
        {newPwd && currentPwd === newPwd && (
          <p className="text-[11px] text-[var(--negative)]">
            Nova senha deve ser diferente da atual.
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {error && (
            <span className="text-[12px] text-[var(--negative)]">{error}</span>
          )}
          {savedAt && (
            <span className="text-[12px] text-[var(--positive)]">
              Senha atualizada
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !ready}
            onClick={change}
          >
            {saving ? "Atualizando…" : "Atualizar senha"}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Sessions ─────────────────────────────────────────────────────────────

function SessionsSection({
  sessions,
  onChange,
}: {
  sessions: SessionInfo[];
  onChange: () => void;
}): JSX.Element {
  async function revoke(id: string) {
    try {
      const r = await fetch(
        `/api/account/sessions/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        alert(err.error ?? `HTTP ${r.status}`);
        return;
      }
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao revogar sessão");
    }
  }

  return (
    <section className="rounded-2xl fey-card p-5">
      <header className="mb-4">
        <h2 className="font-display text-[15px] font-semibold text-foreground tracking-tight">
          Sessões ativas
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground/85">
          Dispositivos logados na sua conta. Você pode revogar acesso de
          qualquer um que não reconheça.
        </p>
      </header>

      {sessions.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/70">Nenhuma sessão ativa.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const ua = parseUserAgent(s.userAgent);
            const Icon =
              ua.type === "mobile" ? Smartphone : ua.type === "web" ? Globe : Monitor;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <Icon
                  size={14}
                  className="shrink-0 text-muted-foreground"
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-foreground">
                      {ua.label}
                    </span>
                    {s.isCurrent && (
                      <span className="text-[10px] uppercase tracking-wide rounded-full bg-[var(--positive-soft)] px-1.5 py-0.5 font-semibold text-[var(--positive)]">
                        Esta sessão
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 tabular-nums truncate">
                    {s.ip ? `${s.ip} · ` : ""}iniciada em {formatDate(s.createdAt)}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => revoke(s.id)}
                    className={cn(
                      "shrink-0 inline-flex h-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 text-[11px] font-medium text-foreground hover:bg-[var(--negative-soft)] hover:text-[var(--negative)] hover:border-[var(--negative)]/30 transition-colors cursor-pointer",
                    )}
                  >
                    Revogar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Sign out ─────────────────────────────────────────────────────────────

function SignOutSection({
  onSignedOut,
}: {
  onSignedOut: () => void;
}): JSX.Element {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onSignedOut();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <section className="rounded-2xl fey-card p-5">
      <header className="mb-3">
        <h2 className="font-display text-[15px] font-semibold text-foreground tracking-tight">
          Sair
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground/85">
          Encerra sua sessão neste dispositivo.
        </p>
      </header>
      <Button
        variant="destructive"
        size="default"
        className="gap-1.5"
        disabled={signingOut}
        onClick={signOut}
      >
        <LogOut size={14} />
        {signingOut ? "Saindo…" : "Sair da conta"}
      </Button>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function FieldRow({
  id, label, value, onChange, type = "text", icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex h-9 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.06]">
        {icon}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </label>
  );
}

function PasswordField({
  id, label, value, onChange, shown, onToggle, autocomplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  shown: boolean;
  onToggle: () => void;
  autocomplete?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex h-9 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.06]">
        <Lock size={14} className="text-muted-foreground" />
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autocomplete ?? "off"}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? "Hide password" : "Show password"}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        >
          {shown ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </label>
  );
}

function AccountPanelSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl fey-card p-5">
          <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
          <div className="mt-3 space-y-3">
            <div className="h-9 w-full rounded-md bg-white/[0.04] animate-pulse" />
            <div className="h-9 w-full rounded-md bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
