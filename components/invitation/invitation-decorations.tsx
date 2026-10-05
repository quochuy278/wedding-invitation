import { cn } from "@/lib/utils";

export function PaperTexture() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.13] mix-blend-multiply"
      aria-hidden="true"
    >
      <filter id="invitation-paper">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#invitation-paper)" opacity="0.5" />
    </svg>
  );
}

export function Botanical({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none text-wedding-wine", className)}
      width="100"
      height="210"
      viewBox="0 0 100 210"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M55 207C40 162 64 111 41 39M50 183C33 168 22 157 14 136M48 158C64 143 70 126 77 107M48 136C33 116 23 103 21 86M48 108C59 92 65 77 64 62M45 82C28 63 24 44 25 28M42 54C52 39 53 23 52 11" />
      <path d="M15 140C4 135 5 124 8 120C17 125 19 133 15 140ZM22 155C10 154 9 145 11 140C20 142 25 149 22 155ZM35 172C23 174 19 166 20 160C30 159 35 164 35 172ZM62 142C61 130 69 126 74 127C74 136 70 142 62 142ZM70 125C68 113 75 109 81 108C83 117 78 124 70 125ZM31 116C20 114 16 106 19 100C28 103 33 109 31 116ZM23 95C13 90 14 79 18 75C26 81 27 88 23 95ZM58 90C57 79 64 75 71 75C71 85 65 91 58 90ZM29 55C17 52 15 44 18 37C28 40 32 46 29 55ZM25 31C17 23 20 15 25 11C31 19 31 25 25 31ZM51 28C45 19 46 12 52 7C58 15 57 23 51 28ZM43 44C34 39 33 30 37 25C44 31 47 38 43 44Z" />
      <path d="M74 100C65 91 70 83 75 82C82 83 84 94 74 100ZM74 100V110M36 20C29 12 32 5 36 5C42 6 44 14 36 20ZM36 20L41 40M10 112L5 104M83 67L89 59M87 157L92 150" />
    </svg>
  );
}
