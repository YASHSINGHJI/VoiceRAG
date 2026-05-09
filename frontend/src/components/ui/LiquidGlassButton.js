/**
 * LiquidGlassButton.js
 * Adapted from AI Component 4.txt (liquid-glass-button.tsx) for plain React JS.
 * Uses @radix-ui/react-slot + class-variance-authority.
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

/* ─── Utility: join class names ────────────────────────────────────────────── */
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* ─── Variant definitions (mirrors 4.txt liquidbuttonVariants) ─────────────── */
const liquidbuttonVariants = cva(
  'inline-flex items-center transition-colors justify-center cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-transparent hover:scale-105 duration-300 transition text-primary',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        ghost: 'hover:bg-gray-100',
        link: 'underline underline-offset-4 hover:opacity-80',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 text-xs px-4',
        lg: 'h-10 px-6',
        xl: 'h-12 px-8',
        xxl: 'h-14 px-10',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'xxl',
    },
  }
);

/* ─── GlassFilter SVG (turbulence + displacement) ──────────────────────────── */
function GlassFilter() {
  return (
    <svg className="hidden" style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/* ─── LiquidButton ─────────────────────────────────────────────────────────── */
/**
 * @param {{ variant?: string, size?: string, asChild?: boolean, className?: string, children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}) {
  const Comp = asChild ? Slot : 'button';

  return (
    <>
      <Comp
        data-slot="button"
        className={cn('relative', liquidbuttonVariants({ variant, size, className }))}
        {...props}
      >
        {/* Liquid glass shell — light/dark modes */}
        <div
          className="absolute top-0 left-0 z-0 h-full w-full rounded-full transition-all"
          style={{
            boxShadow: [
              '0 0 6px rgba(0,0,0,0.03)',
              '0 2px 6px rgba(0,0,0,0.08)',
              'inset 3px 3px 0.5px -3px rgba(0,0,0,0.9)',
              'inset -3px -3px 0.5px -3px rgba(0,0,0,0.85)',
              'inset 1px 1px 1px -0.5px rgba(0,0,0,0.6)',
              'inset -1px -1px 1px -0.5px rgba(0,0,0,0.6)',
              'inset 0 0 6px 6px rgba(0,0,0,0.12)',
              'inset 0 0 2px 2px rgba(0,0,0,0.06)',
              '0 0 12px rgba(255,255,255,0.15)',
            ].join(','),
          }}
        />

        {/* Backdrop blur layer with SVG glass distortion */}
        <div
          className="absolute top-0 left-0 isolate h-full w-full overflow-hidden rounded-full"
          style={{ backdropFilter: 'url(#container-glass) blur(2px)' }}
        />

        {/* Content */}
        <div className="pointer-events-none relative z-10">{children}</div>

        <GlassFilter />
      </Comp>
    </>
  );
}

export default LiquidButton;
