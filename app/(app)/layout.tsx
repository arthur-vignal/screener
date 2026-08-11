"use client";

import { PageFade } from "@/components/page-fade";
import { SelectionProvider } from "@/components/ui/selection-context";
import { MultiSelectToolbar } from "@/components/ui/multi-select-toolbar";
import { SubHeader } from "@/components/ui/sub-header";

/**
 * Layout for the main app (everything except the public landing +
 * the /login route). The root `app/layout.tsx` renders <html>/<body>
 * + fonts only; this group layout adds the SubHeader (minimal
 * greeting + market status bar in the position of the old TopNav),
 * page fade, selection provider, and multi-select toolbar.
 *
 * Navigation is handled by the floating dock at the bottom of each
 * page; there is no horizontal top menu anymore.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SelectionProvider>
      <SubHeader />
      <main>
        <PageFade>{children}</PageFade>
      </main>
      <MultiSelectToolbar />
    </SelectionProvider>
  );
}