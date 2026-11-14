import { useId } from "react";

/** A low Sun on the horizon above fading terrain lines. */
export function BrandMark({ size = 28 }: { size?: number }) {
  const id = `${useId()}-sun`;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="flex-none">
      <defs>
        <radialGradient id={id} cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor="#FFE3A8" />
          <stop offset=".55" stopColor="#F6B65A" />
          <stop offset="1" stopColor="#FF8A3D" />
        </radialGradient>
      </defs>
      <path d="M6 17a8 8 0 0 1 16 0z" fill={`url(#${id})`} />
      <path d="M2 17.5h24" stroke="#ECE8E1" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 21.5h18" stroke="#ECE8E1" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 25h10" stroke="#ECE8E1" strokeOpacity=".22" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
