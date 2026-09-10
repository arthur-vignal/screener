import type { JSX } from "react";

import { AccountPanel } from "@/components/account/account-panel";

export default function SettingsAccountPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[18px] font-semibold text-foreground tracking-tight">
        Conta
      </h1>
      <p className="text-[12px] text-muted-foreground/85 mb-2">
        Gerencie seu perfil, senha e sessões ativas.
      </p>
      <AccountPanel />
    </div>
  );
}
