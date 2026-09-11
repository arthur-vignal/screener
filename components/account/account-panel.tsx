"use client";

/**
 * AccountPanel — versão Fey 1:1 da tela de Preferences.
 *
 * Layout (replica do print Fey `05_screen_preferences.png`):
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Logo Fey (substituído por logo Sulfur)        [Sing out]    │
 *   │  Title bold gigante ("Conta")                                │
 *   │  subtitle email muted                                         │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │  "Sua conta" (h2 muted)                                      │
 *   │                                                              │
 *   │  ┌─ card 1 ──────────────────────────────────────┐ ┌── card  │
 *   │  │ [📧] Account info                  →           │ │ destaque│
 *   │  │      Pritam Sensei agrawal                     │ │  lateral
 *   │  │      pritam.sensei@gmail.com                  │ │         │
 *   │  └────────────────────────────────────────────────┘ └─────────
 *   │  ┌─ card 2 ──────────────────────────────────────┐
 *   │  │ [🔑] Senha                            →        │
 *   │  └────────────────────────────────────────────────┘
 *   │  ┌─ card 3 ──────────────────────────────────────┐
 *   │  │ [📱] Sessões ativas                   →        │
 *   │  └────────────────────────────────────────────────┘
 *   │  ┌─ card 4 ──────────────────────────────────────┐
 *   │  │ [💬] Feedback                         →        │
 *   │  └────────────────────────────────────────────────┘
 *   │                                                              │
 *   │  [Download banner: "Pressione K e digite 'feedback'..."]      │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * - Cards da esquerda abrem/expandem onClick (accordion)
 * - Card da direita mostra estatísticas de uso do user
 * - Tipografia Fey: títulos weight 700 bold, body 400, muted 0.7
 */

import {
  ChevronRight,
  Mail,
  Lock,
  Smartphone,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Profile = {
  username: string;
  email: string;
  createdAt: number | null;
};

type SessionInfo = {
  id: string;
  isCurrent: boolean;
  createdAt: string;
  userAgent: string | null;
  ip: string | null;
};

type UsageStats = {
  portfolioCount: number;
  holdingCount: number;
  indicesCount: number;
  watchlistCount: number;
  accountAgeDays: number;
};

function parseUserAgent(ua: string | null): { label: string } {
  if (!ua) return { label: "Desconhecido" };
  if (/mobile|android|iphone|ipad/i.test(ua)) return { label: "Mobile" };
  if (/mozilla|chrome|safari|firefox|edge/i.test(ua)) return { label: "Web" };
  return { label: "Outro" };
}

function formatDate(unixSec: number | string): string {
  const ms = typeof unixSec === "string" ? Date.parse(unixSec) : unixSec * 1000;
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AccountPanel(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [openCard, setOpenCard] = useState<"account" | "password" | "sessions" | "feedback" | null>("account");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    try {
      const [profileRes, sessionsRes, statsRes] = await Promise.all([
        fetch("/api/account/profile", { cache: "no-store" }),
        fetch("/api/account/sessions", { cache: "no-store" }),
        fetch("/api/account/stats", { cache: "no-store" }).catch(() => null),
      ]);
      if (profileRes.ok) {
        const p = (await profileRes.json()) as Profile;
        setProfile(p);
      }
      if (sessionsRes.ok) {
        const s = (await sessionsRes.json()) as { sessions: SessionInfo[] };
        setSessions(s.sessions ?? []);
      }
      if (statsRes?.ok) {
        const u = (await statsRes.json()) as UsageStats;
        setStats(u);
      }
    } catch {
      // ignore — UI degrada gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return <AccountPanelSkeleton />;
  }
  if (!profile) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-muted-foreground">
          Não foi possível carregar seu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* ─── Header Fey: Title + subtitle + ações canto direito ──────── */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[40px] font-bold tracking-tight text-foreground leading-[1.05]">
            Conta
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground/85">
            {profile.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/login?oauth=google&action=gift")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <MessageSquare size={14} />
            Convidar um amigo
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      {/* Separador sutil (Fey: borda full-width transparente) */}
      <div className="h-px bg-white/[0.06]" />

      {/* ─── 2-coluna: cards esquerda + destaque direita ────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ESQUERDA: lista de cards */}
        <section className="flex flex-col gap-6">
          <h2 className="text-[16px] font-semibold text-muted-foreground/85">
            Sua conta
          </h2>

          <Card
            icon={<Mail size={16} className="text-orange-400" />}
            iconBg="bg-orange-400/15"
            title={profile.username}
            description="Email e nome de usuário exibidos no Sulfur."
            open={openCard === "account"}
            onToggle={() => setOpenCard(openCard === "account" ? null : "account")}
          >
            <AccountInfoCard
              profile={profile}
              onSaved={(p) => {
                setProfile(p);
                loadAll();
              }}
            />
          </Card>

          <Card
            icon={<Lock size={16} className="text-blue-400" />}
            iconBg="bg-blue-400/15"
            title="Senha"
            description="Atualize sua senha pra manter a conta segura."
            open={openCard === "password"}
            onToggle={() => setOpenCard(openCard === "password" ? null : "password")}
          >
            <PasswordCard />
          </Card>

          <Card
            icon={<Smartphone size={16} className="text-emerald-400" />}
            iconBg="bg-emerald-400/15"
            title={`Sessões ativas${sessions.length > 1 ? ` (${sessions.length})` : ""}`}
            description="Dispositivos logados na sua conta."
            open={openCard === "sessions"}
            onToggle={() => setOpenCard(openCard === "sessions" ? null : "sessions")}
          >
            <SessionsCard
              sessions={sessions}
              onChange={loadAll}
            />
          </Card>

          <Card
            icon={<MessageSquare size={16} className="text-fuchsia-400" />}
            iconBg="bg-fuchsia-400/15"
            title="Feedback"
            description="Bugs, sugestões ou um oi?"
            open={openCard === "feedback"}
            onToggle={() => setOpenCard(openCard === "feedback" ? null : "feedback")}
          >
            <FeedbackCard />
          </Card>

          {/* Banner Fey no rodapé */}
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <ChevronRight size={14} className="text-muted-foreground/70" />
            <p className="text-[12px] text-muted-foreground/85">
              <span className="font-semibold text-foreground">Precisa de ajuda?</span>
              {" "}ou pressione{" "}
              <kbd className="rounded border border-white/[0.1] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                K
              </kbd>
              {" "}e digite{" "}
              <code className="text-[11px] font-mono text-foreground">"feedback"</code>
              {" "}a qualquer momento.
            </p>
          </div>
        </section>

        {/* DIREITA: card destaque com stats */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6">
            <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Plano ativo
            </span>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                  Sulfur Pro
                </p>
                <p className="mt-1 font-display text-[40px] font-bold tracking-tight text-foreground leading-[1.05]">
                  Free
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Conta ativa desde{" "}
                  {profile.createdAt ? formatDate(profile.createdAt) : "—"}
                </p>
              </div>

              {stats && (
                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <StatRow label="Portfolios" value={stats.portfolioCount} />
                  <StatRow label="Holdings" value={stats.holdingCount} />
                  <StatRow label="Índices criados" value={stats.indicesCount} />
                  <StatRow label="Watchlist" value={stats.watchlistCount} />
                  <StatRow label="Dias de conta" value={stats.accountAgeDays} />
                </div>
              )}

              <div className="space-y-2 border-t border-white/[0.06] pt-4">
                <a
                  href="/settings"
                  className="block w-full rounded-md bg-white/[0.04] border border-white/[0.08] py-2 text-center text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors"
                >
                  Configurações
                </a>
                <a
                  href="mailto:support@sulfur.io"
                  className="block w-full text-center text-[11px] text-muted-foreground/85 hover:text-foreground transition-colors"
                >
                  Falar com o suporte
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Card genérico (Fey-style: ícone soft + título + descrição) ───────────

function Card({
  icon, iconBg, title, description, open, onToggle, children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors",
        open && "bg-white/[0.04]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            iconBg,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-foreground tracking-tight">
            {title}
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground/85">
            {description}
          </div>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground/60 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Conteúdo de cada card ──────────────────────────────────────────────

function AccountInfoCard({
  profile, onSaved,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
}): JSX.Element {
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
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
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldRow id="acc-username" label="Nome de usuário" value={username} onChange={setUsername} />
      <FieldRow id="acc-email" label="Email" type="email" value={email} onChange={setEmail} />
      <div className="flex items-center justify-end gap-3 pt-1">
        {error && <span className="text-[12px] text-[var(--negative)]">{error}</span>}
        {saved && <span className="text-[12px] text-[var(--positive)]">Salvo</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex h-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-medium text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

function PasswordCard(): JSX.Element {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const ready =
    currentPwd.length >= 8 &&
    newPwd.length >= 8 &&
    newPwd === confirmPwd &&
    currentPwd !== newPwd;

  async function change() {
    setSaving(true);
    setError(null);
    setSaved(false);
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
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao trocar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <PasswordField
        id="pw-current"
        label="Senha atual"
        value={currentPwd}
        onChange={setCurrentPwd}
        autocomplete="current-password"
      />
      <PasswordField
        id="pw-new"
        label="Nova senha"
        value={newPwd}
        onChange={setNewPwd}
        autocomplete="new-password"
      />
      <PasswordField
        id="pw-confirm"
        label="Confirmar"
        value={confirmPwd}
        onChange={setConfirmPwd}
        autocomplete="new-password"
      />
      {newPwd && confirmPwd && newPwd !== confirmPwd && (
        <p className="text-[11px] text-[var(--negative)]">As senhas não conferem.</p>
      )}
      <div className="flex items-center justify-end gap-3 pt-1">
        {error && <span className="text-[12px] text-[var(--negative)]">{error}</span>}
        {saved && <span className="text-[12px] text-[var(--positive)]">Senha atualizada</span>}
        <button
          type="button"
          onClick={change}
          disabled={saving || !ready}
          className="inline-flex h-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-medium text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? "Atualizando…" : "Atualizar senha"}
        </button>
      </div>
    </div>
  );
}

function SessionsCard({
  sessions, onChange,
}: {
  sessions: SessionInfo[];
  onChange: () => void;
}): JSX.Element {
  async function revoke(id: string) {
    try {
      await fetch(`/api/account/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      onChange();
    } catch {
      // ignore
    }
  }

  if (sessions.length === 0) {
    return <p className="text-[12px] text-muted-foreground/70">Nenhuma sessão ativa.</p>;
  }

  return (
    <ul className="space-y-2">
      {sessions.map((s) => {
        const ua = parseUserAgent(s.userAgent);
        return (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2"
          >
            <Smartphone size={14} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-foreground">
                  {ua.label}
                </span>
                {s.isCurrent && (
                  <span className="rounded-full bg-[var(--positive-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--positive)]">
                    Esta
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground/70 tabular-nums truncate">
                {s.ip ? `${s.ip} · ` : ""}{formatDate(s.createdAt)}
              </div>
            </div>
            {!s.isCurrent && (
              <button
                type="button"
                onClick={() => revoke(s.id)}
                className="shrink-0 inline-flex h-7 items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[11px] font-medium text-foreground hover:bg-[var(--negative-soft)] hover:text-[var(--negative)] hover:border-[var(--negative)]/30 transition-colors cursor-pointer"
              >
                Revogar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FeedbackCard(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground/85">
        Encontrou um bug? Tem uma ideia? Manda pra gente.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="mailto:feedback@sulfur.io"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors"
        >
          <MessageSquare size={14} />
          Mandar email
        </a>
        <a
          href="https://github.com/arthur-vignal/screener/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors"
        >
          Abrir issue no GitHub
        </a>
      </div>
    </div>
  );
}

function StatRow({
  label, value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground/85">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function FieldRow({
  id, label, value, onChange, type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-white/20 focus:bg-white/[0.06] focus:outline-none"
      />
    </label>
  );
}

function PasswordField({
  id, label, value, onChange, autocomplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autocomplete?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autocomplete ?? "off"}
        className="h-9 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-white/20 focus:bg-white/[0.06] focus:outline-none"
      />
    </label>
  );
}

function AccountPanelSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-10 w-32 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-3 w-48 rounded bg-white/[0.04] animate-pulse" />
      </div>
      <div className="h-px bg-white/[0.06]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white/[0.02] animate-pulse" />
      </div>
    </div>
  );
}
