import { cn } from '@/lib/utils';

interface AicoLogoProps {
  className?: string;
  compact?: boolean;
  title?: string;
}

function AicoMarkSvg({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label={title} className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <linearGradient id="aico-mark-bg" x1="10" y1="8" x2="84" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0DBB6C" />
          <stop offset="1" stopColor="#067E60" />
        </linearGradient>
        <linearGradient id="aico-mark-leaf" x1="48" y1="44" x2="86" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9F54A" />
          <stop offset="1" stopColor="#88D93C" />
        </linearGradient>
        <linearGradient id="aico-mark-circuit" x1="24" y1="18" x2="72" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9F54A" />
          <stop offset="1" stopColor="#54D6B7" />
        </linearGradient>
      </defs>

      <rect x="6" y="6" width="84" height="84" rx="24" fill="url(#aico-mark-bg)" />
      <path
        d="M30 30C36 24 44 20 53 20C68 20 80 32 80 47C80 58 74 67 65 72C68 64 67 56 60 50C55 46 50 43 47 37C45 33 45 28 47 24C40 25 34 28 30 33V30Z"
        fill="url(#aico-mark-leaf)"
      />
      <path
        d="M26 62C32 52 41 47 53 47C64 47 72 52 77 62C71 70 62 76 49 76C38 76 30 71 26 62Z"
        fill="#F4FFF5"
        fillOpacity="0.92"
      />
      <path d="M24 28H44L56 40H70" stroke="url(#aico-mark-circuit)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 42H52" stroke="url(#aico-mark-circuit)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="28" r="5" fill="#D9F54A" />
      <circle cx="70" cy="28" r="5" fill="#D9F54A" />
      <circle cx="34" cy="42" r="5" fill="#54D6B7" />
      <circle cx="52" cy="42" r="5" fill="#54D6B7" />
    </svg>
  );
}

function AicoWordmarkSvg({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 280 176" role="img" aria-label={title} className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <linearGradient id="aico-word-emerald" x1="18" y1="20" x2="188" y2="166" gradientUnits="userSpaceOnUse">
          <stop stopColor="#11C06F" />
          <stop offset="1" stopColor="#07825F" />
        </linearGradient>
        <linearGradient id="aico-word-lime" x1="150" y1="56" x2="254" y2="154" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9F54A" />
          <stop offset="1" stopColor="#8CD83B" />
        </linearGradient>
        <linearGradient id="aico-word-circuit" x1="64" y1="32" x2="184" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9F54A" />
          <stop offset="1" stopColor="#3AC7B3" />
        </linearGradient>
      </defs>

      <text
        x="10"
        y="78"
        fill="url(#aico-word-emerald)"
        fontFamily="'Space Grotesk', 'Manrope', sans-serif"
        fontSize="86"
        fontWeight="700"
        letterSpacing="-5"
      >
        AI
      </text>
      <text
        x="6"
        y="160"
        fill="url(#aico-word-emerald)"
        fontFamily="'Space Grotesk', 'Manrope', sans-serif"
        fontSize="96"
        fontWeight="700"
        letterSpacing="-6"
      >
        CO
      </text>

      <path d="M105 52L128 106H151L174 82H188" stroke="url(#aico-word-circuit)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 106H128" stroke="url(#aico-word-circuit)" strokeWidth="5" strokeLinecap="round" />
      <path d="M136 92L166 58H187" stroke="url(#aico-word-circuit)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="84" cy="106" r="6.5" fill="#B8F23E" />
      <circle cx="105" cy="52" r="6.5" fill="#B8F23E" />
      <circle cx="188" cy="82" r="6.5" fill="#8CE23D" />
      <circle cx="187" cy="58" r="6.5" fill="#8CE23D" />

      <path
        d="M151 141C160 120 180 109 207 109C233 109 253 121 266 143C256 150 243 154 229 154C210 154 196 147 184 137C176 130 169 126 160 127C157 132 154 137 151 141Z"
        fill="url(#aico-word-lime)"
      />
      <path
        d="M182 123C194 109 216 100 246 101C235 112 228 124 225 137C218 148 208 154 195 154C185 154 176 150 168 142C172 133 177 127 182 123Z"
        fill="url(#aico-word-emerald)"
      />
    </svg>
  );
}

export function AicoLogo({ className, compact = false, title = 'AICO logo' }: AicoLogoProps) {
  if (compact) {
    return (
      <div className={cn('aspect-square w-11 rounded-[1.35rem] shadow-[0_20px_50px_-22px_rgba(7,130,95,0.8)]', className)}>
        <AicoMarkSvg title={title} />
      </div>
    );
  }

  return (
    <div className={cn('w-[11rem]', className)}>
      <AicoWordmarkSvg title={title} />
    </div>
  );
}
