"use client";

/**
 * AuroraBackground — full-page gradient mesh used as the landing page
 * background. Pure CSS (no library). Mimics the aceternity aurora demo.
 */

export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: "#0a0a0c",
      }}
    >
      {/* Aurora blobs — slow-moving radial gradients in chart-accent colors. */}
      <div
        className="absolute -top-[20%] left-[10%] h-[60vh] w-[60vw] rounded-full blur-[120px] opacity-50"
        style={{
          background:
            "radial-gradient(closest-side, rgba(232,147,91,0.45), transparent 70%)",
        }}
      />
      <div
        className="absolute top-[10%] right-[5%] h-[55vh] w-[55vw] rounded-full blur-[120px] opacity-50"
        style={{
          background:
            "radial-gradient(closest-side, rgba(167,139,250,0.40), transparent 70%)",
        }}
      />
      <div
        className="absolute top-[40%] left-[40%] h-[50vh] w-[50vw] rounded-full blur-[120px] opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(63,191,176,0.35), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[20%] h-[55vh] w-[55vw] rounded-full blur-[120px] opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(201,196,106,0.30), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[5%] right-[20%] h-[55vh] w-[55vw] rounded-full blur-[120px] opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(52,211,153,0.30), transparent 70%)",
        }}
      />

      {/* Faint noise overlay to soften the gradient. */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence baseFrequency='0.9' /></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Vignette to darken edges. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(10,10,12,0.7) 100%)",
        }}
      />
    </div>
  );
}
