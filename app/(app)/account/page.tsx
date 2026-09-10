import type { JSX } from "react";

import { AccountPanel } from "@/components/account/account-panel";

export const dynamic = "force-dynamic";

export default function AccountPage(): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-2xl py-6">
      <AccountPanel />
    </div>
  );
}
