"use client";

/**
 * AnimatedFloatingDock — extends FloatingDock with a "boot" animation:
 *   - On mount, the dock renders as a single 56px-wide pill (only the
 *     first item visible).
 *   - Over ~900ms the dock fans out: items fade + scale in one by one,
 *     while the container width grows from 56px to the natural width.
 *   - After the boot animation, mouse-tracking behaves normally (hover
 *     any icon to scale it up like macOS dock).
 *
 * Source: pattern based on aceternity-ui.com/components/floating-dock
 * (mouse-tracking scale). The boot expand is a custom animation
 * since none of the public variants expose this.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "motion/react";
import { cn } from "@/lib/utils";

export type AnimatedFloatingDockItem = {
  title: string;
  icon: ReactNode;
  href: string;
  onClick?: () => void;
};

export function AnimatedFloatingDock({
  items,
  className,
}: {
  items: AnimatedFloatingDockItem[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue<number>(Infinity);

  // Boot animation: number of items currently visible
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    function tick() {
      if (cancelled) return;
      setVisibleCount(i + 1);
      i += 1;
      if (i < items.length) {
        setTimeout(tick, 110);
      }
    }
    // Trigger first item immediately, then stagger
    tick();
    return () => {
      cancelled = true;
    };
  }, [items.length]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-end gap-2 rounded-2xl px-3 py-3",
        "bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/10",
        className,
      )}
      initial={{ width: 56, opacity: 0 }}
      animate={{
        width: visibleCount > 0 ? "auto" : 56,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 26,
        mass: 0.7,
      }}
      style={{ minWidth: 56 }}
    >
      {items.map((item, idx) => (
        <AnimatedDockIcon
          key={item.title}
          mouseX={mouseX}
          item={item}
          visible={idx < visibleCount}
          index={idx}
        />
      ))}
    </motion.div>
  );
}

function AnimatedDockIcon({
  mouseX,
  item,
  visible,
  index,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>;
  item: AnimatedFloatingDockItem;
  visible: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  const widthIcon = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, scale: 0.4, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 22,
            delay: 0,
          }}
        >
          <motion.div
            ref={ref}
            style={{ width: widthIcon, height: heightIcon }}
            className="relative flex aspect-square items-center justify-center"
          >
            <Link
              href={item.href}
              onClick={item.onClick}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-800"
            >
              <AnimatePresence>
                {hovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 2, x: "-50%" }}
                    className="absolute -top-8 left-1/2 w-fit rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white"
                  >
                    {item.title}
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                {item.icon}
              </span>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}