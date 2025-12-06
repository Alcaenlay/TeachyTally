import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      {...props}
    >
      {/* T mark - black */}
      <line x1="18" y1="26" x2="102" y2="26" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <line x1="60" y1="26" x2="60" y2="90" stroke="#000" strokeWidth="12" strokeLinecap="round" />

      {/* Brand check - yellow */}
      <path d="M52 78 L68 94 L106 56" fill="none" stroke="#FFD400" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFD400"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 14l2.5 2.5L19 9" />
    </svg>
  );
}
