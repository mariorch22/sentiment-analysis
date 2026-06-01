/* Schlichte 1.6px-Stroke-Icons (currentColor) — kein Icon-Font, keine Emoji. */
import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...props,
});

export const IconOverview = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);

export const IconScatter = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 4v16h16" /><circle cx="8.5" cy="14" r="1.4" /><circle cx="12" cy="9" r="1.4" /><circle cx="16" cy="12" r="1.4" /><circle cx="18.5" cy="6.5" r="1.4" /></svg>
);

export const IconPulse = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12h4l2.5-6 4 13 2.5-7H21" /></svg>
);

export const IconScale = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v18M7 21h10M3 8l4-3 4 3-4 7-4-7zM13 8l4-3 4 3-4 7-4-7z" /></svg>
);

export const IconReviews = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></svg>
);

export const IconWarning = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17h.01" /></svg>
);

export const IconBox = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 3 7.5v9L12 21l9-4.5v-9z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>
);

export const IconThumb = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 3 1.8V9h4.5a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.2 19H7" /></svg>
);

export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export const IconSpark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} width={16} height={16}><path d="M12 3v18M3 12h18" opacity={0} /><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18" strokeWidth={2.2} /></svg>
);
