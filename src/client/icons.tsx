/**
 * The page's glyphs. Inline SVG on purpose: the client bundle carries no asset
 * pipeline, and a 14px stroke glyph beside a section title is what makes a long
 * settings pane scannable. All of them are decorative — every one sits next to
 * the word it stands for, so they stay `aria-hidden`.
 */
import type { ReactNode } from 'react'

interface IconProps {
  /** Rendered size in px; the default matches the 13px label scale. */
  size?: number
}

function Glyph({ size = 14, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** The panel: a screen that answers on a port. */
export function IconPanel(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="2.2" y="3" width="11.6" height="7.6" rx="1.6" />
      <path d="M6.6 13.4h2.8M8 10.6v2.8" />
    </Glyph>
  )
}

/** Autostart: the power glyph. */
export function IconPower(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 2.4v5.2" />
      <path d="M11.6 4.4a5 5 0 1 1-7.2 0" />
    </Glyph>
  )
}

/** A managed entry: a shell prompt. */
export function IconTerminal(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="2.2" y="2.8" width="11.6" height="10.4" rx="1.6" />
      <path d="M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2" />
    </Glyph>
  )
}

/** Agent tools: two sliders, the shape of a capability set. */
export function IconSliders(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.4 5.4h11.2M2.4 10.6h11.2" />
      <circle cx="6" cy="5.4" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="10.6" r="1.6" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

/** Servers: stacked layers. */
export function IconLayers(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 2.3l5.4 2.9L8 8.1 2.6 5.2z" />
      <path d="M2.6 8.6l5.4 2.9 5.4-2.9" />
      <path d="M2.6 11.4l5.4 2.9 5.4-2.9" />
    </Glyph>
  )
}

/** Refresh. */
export function IconRefresh(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4" />
      <path d="M12.8 1.7v2.9h-2.9" />
    </Glyph>
  )
}

/** Disclosure marker; rotated by CSS when its `details` is open. */
export function IconChevron(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.2 3.8L10.4 8l-4.2 4.2" />
    </Glyph>
  )
}

/** Opens away from the page. */
export function IconExternal(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.6 3.4H3.4v9.2h9.2V9.4" />
      <path d="M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2" />
    </Glyph>
  )
}

/** A warning that is rendered as text elsewhere; this only marks the row. */
export function IconWarning(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 2.6l5.7 10.2H2.3z" />
      <path d="M8 6.4v3.1M8 11.5h.01" />
    </Glyph>
  )
}

/** A confirmed state, for a chip. */
export function IconCheck(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 8.4l3.3 3.3L13 5" />
    </Glyph>
  )
}
