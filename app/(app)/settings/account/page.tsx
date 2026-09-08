"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Account — perfil + troca de senha + logout.
 *
 * Mock: não persiste nada; só renderiza os controles e dá feedback
 * visual local (toast simples via setState). Em produção, esses
 * forms chamariam /api/account/*.
 */

const MOCK_NAME = "Arthur V.";
const MOCK_EMAIL = "user@sulfur.io";

export default function AccountPage() {
  const [displayName, setDisplayName] = useState(MOCK_NAME);
  const [email, setEmail] = useState(MOCK_EMAIL);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSavedMsg(msg);
    window.setTimeout(() => setSavedMsg(null), 2400);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Profile */}
      <section className="rounded-2xl fey-card p-5">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <p className="text-xs text-muted-foreground">
            Public name and email shown across Sulfur.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <FieldRow
            id="display-name"
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
          />
          <FieldRow
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            icon={<Mail size={14} className="text-muted-foreground" />}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            {savedMsg && (
              <span className="text-xs text-[color:var(--positive)]">
                {savedMsg}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                flash("Profile saved");
              }}
            >
              Save changes
            </Button>
          </div>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-2xl fey-card p-5">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Password</h2>
          <p className="text-xs text-muted-foreground">
            Update your password to keep your account secure.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <PasswordField
            id="current-pwd"
            label="Current password"
            value={currentPwd}
            onChange={setCurrentPwd}
            shown={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
          />
          <PasswordField
            id="new-pwd"
            label="New password"
            value={newPwd}
            onChange={setNewPwd}
            shown={showNew}
            onToggle={() => setShowNew((v) => !v)}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            {savedMsg && (
              <span className="text-xs text-[color:var(--positive)]">
                {savedMsg}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPwd("");
                setNewPwd("");
                flash("Password updated");
              }}
            >
              Update password
            </Button>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <section className="rounded-2xl fey-card p-5">
        <header className="mb-3">
          <h2 className="text-base font-semibold text-foreground">Sign out</h2>
          <p className="text-xs text-muted-foreground">
            End your session on this device.
          </p>
        </header>
        <Button
          variant="destructive"
          size="default"
          className="gap-1.5"
          onClick={() => {
            // mock: nada persistente
          }}
        >
          <LogOut size={14} />
          Sign out
        </Button>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function FieldRow({
  id,
  label,
  value,
  onChange,
  type = "text",
  icon,
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
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
  id,
  label,
  value,
  onChange,
  shown,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-9 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.06]">
        <Lock size={14} className="text-muted-foreground" />
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
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
