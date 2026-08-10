"use client";

import { motion } from "framer-motion";

/**
 * AuroraBackground — full-bleed aurora gradient mesh inspired by the
 * @aceternity/aurora-background-demo. Five colored radial-gradient
 * blobs float across a dark canvas, each animated independently with
 * framer-motion. A noise overlay softens the gradient.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "#0a0a0c" }}
    >
      <div className="absolute inset-0">
        {/* Purple — top left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: "-10%",
            left: "-10%",
            width: "55vw",
            height: "55vw",
            background:
              "radial-gradient(closest-side, rgba(167,139,250,0.55), transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{
            x: [0, 80, -40, 0],
            y: [0, 40, -20, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orange — top right */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: "-15%",
            right: "-10%",
            width: "50vw",
            height: "50vw",
            background:
              "radial-gradient(closest-side, rgba(232,147,91,0.50), transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{
            x: [0, -100, 50, 0],
            y: [0, 60, -30, 0],
            scale: [1, 1.1, 0.92, 1],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Teal — center left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: "30%",
            left: "20%",
            width: "45vw",
            height: "45vw",
            background:
              "radial-gradient(closest-side, rgba(63,191,176,0.45), transparent 70%)",
            filter: "blur(90px)",
          }}
          animate={{
            x: [0, 60, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 0.95, 1.08, 1],
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Olive — bottom left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            bottom: "-20%",
            left: "10%",
            width: "50vw",
            height: "50vw",
            background:
              "radial-gradient(closest-side, rgba(201,196,106,0.40), transparent 70%)",
            filter: "blur(100px)",
          }}
          animate={{
            x: [0, 70, -50, 0],
            y: [0, -50, 20, 0],
            scale: [1, 1.05, 0.97, 1],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Mint — bottom right */}
        <motion.div
          className="absolute rounded-full"
          style={{
            bottom: "-10%",
            right: "-5%",
            width: "55vw",
            height: "55vw",
            background:
              "radial-gradient(closest-side, rgba(52,211,153,0.45), transparent 70%)",
            filter: "blur(90px)",
          }}
          animate={{
            x: [0, -60, 40, 0],
            y: [0, -30, 50, 0],
            scale: [1, 0.97, 1.05, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Noise overlay (CSS, no animation) */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
            backgroundSize: "180px 180px",
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(10,10,12,0.75) 100%)",
          }}
        />
      </div>
    </div>
  );
}
