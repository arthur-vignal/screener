import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
  /** Number of stacked shimmer lines */
  lines?: number;
};

/**
 * Skeleton — shimmer placeholder for loading states.
 * Use as a block-level element with height/width via className.
 */
export function Skeleton({ className, lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn("shimmer rounded-md", className)}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  return <div className={cn("shimmer rounded-md", className)} />;
}
