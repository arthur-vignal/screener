"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * PageFade — wraps every page in a fade+slide-up on mount and on route change.
 * Keyed by pathname so the animation re-runs on navigation.
 * Respects prefers-reduced-motion via globals.css.
 */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return (
    <div key={key} className="animate-fade-up">
      {children}
    </div>
  );
}
