import type { JSX } from "react";

import { AccountPanel } from "@/components/account/account-panel";

export const dynamic = "force-dynamic";

/** Page /account — wrapper mínimo pro AccountPanel Fey-style.
 *  Mesmo container das outras páginas do app: w-[90%] mx-auto
 *  py-8 pb-32 (pb-32 = espaço pro AnimatedFloatingDock). */
export default function AccountPage(): JSX.Element {
  return (
    <div className="mx-auto w-[90%] py-8 pb-32">
      <AccountPanel />
    </div>
  );
}
