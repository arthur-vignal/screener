"use client";

import { TopNav } from "@/components/top-nav";
import { PageFade } from "@/components/page-fade";
import { SelectionProvider } from "@/components/ui/selection-context";
import { MultiSelectToolbar } from "@/components/ui/multi-select-toolbar";

/**
 * Layout for the main app (everything except the public landing).
 * The root `app/layout.tsx` renders <html>/<body> + fonts only; this
 * group layout adds the platform chrome (TopNav + page fade +
 * selection provider + multi-select toolbar).
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SelectionProvider>
      <TopNav />
      <main className="pt-[102px]">
        <PageFade>{children}</PageFade>
      </main>
      <MultiSelectToolbar />
    </SelectionProvider>
  );
}