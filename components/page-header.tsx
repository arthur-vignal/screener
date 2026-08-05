import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl text-ink tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-body text-base max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
}: {
  title: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h2 className="flex items-center gap-2 text-sm font-medium text-ink uppercase tracking-wider">
        {Icon && <Icon className="w-4 h-4 text-brand-bright" />}
        {title}
      </h2>
      {action}
    </div>
  );
}
