/** Plain harness-language primitives: no bespoke design system, just the page's block set. */
import type { CSSProperties, ReactNode } from 'react'
import type { RpcError } from '../shared/contracts.js'

const muted = 'var(--dsw-alias-label-secondary, #8b8b8b)'
const border = 'var(--dsw-alias-border-secondary, rgba(128, 128, 128, 0.25))'
const errorColor = 'var(--dsw-alias-state-error-primary, #e53e3e)'

const mono: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  wordBreak: 'break-all',
  textAlign: 'right',
}

export function Section({ title, description, children }: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '14px 0',
      borderTop: `1px solid ${border}`,
    }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
        {description !== undefined && description.length > 0
          ? <p style={{ margin: 0, fontSize: 12, color: muted }}>{description}</p>
          : null}
      </header>
      {children}
    </section>
  )
}

export function Row({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: muted }}>{label}</span>
      <span style={mono}>{children}</span>
    </div>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  const text = typeof children === 'string' ? children : ''
  if (typeof children === 'string' && text.length === 0) return null
  return <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.5 }}>{children}</p>
}

/** Muted external link; the page's own origin is never a navigation target. */
export function Link({ href, children }: { href: string, children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      style={{ color: muted, textDecoration: 'underline', overflowWrap: 'anywhere' }}
    >
      {children ?? href}
    </a>
  )
}

/** Inline refusal block: a title plus the host's own detail, never a silent failure. */
export function FailureNote({ title, detail }: { title: string, detail: string }) {
  return (
    <div
      role="alert"
      style={{
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1.5,
        border: `1px solid ${errorColor}`,
        color: errorColor,
      }}
    >
      <strong>{title}</strong>
      {detail.length > 0 ? <p style={{ margin: '4px 0 0' }}>{detail}</p> : null}
    </div>
  )
}

export function Button({ children, onClick, disabled, busy }: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled === true || busy === true}
      style={{
        padding: '4px 10px',
        fontSize: 12,
        borderRadius: 6,
        border: `1px solid ${border}`,
        background: 'transparent',
        color: 'inherit',
        cursor: disabled === true || busy === true ? 'default' : 'pointer',
        opacity: disabled === true || busy === true ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function Toggle({ label, checked, disabled, onChange }: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      opacity: disabled === true ? 0.6 : 1,
      cursor: disabled === true ? 'default' : 'pointer',
    }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export function Select({ value, options, disabled, onChange }: {
  value: string
  options: ReadonlyArray<{ value: string, label: string }>
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      style={{
        padding: '3px 6px',
        fontSize: 12,
        borderRadius: 6,
        border: `1px solid ${border}`,
        background: 'transparent',
        color: 'inherit',
      }}
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

export function Radio({ label, description, checked, disabled, onChange }: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      fontSize: 13,
      opacity: disabled === true ? 0.6 : 1,
      cursor: disabled === true ? 'default' : 'pointer',
    }}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={() => onChange()}
        style={{ marginTop: 2 }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>{label}</span>
        {description !== undefined && description.length > 0
          ? <span style={{ fontSize: 12, color: muted }}>{description}</span>
          : null}
      </span>
    </label>
  )
}

export function ErrorNote({ error, title }: { error: RpcError | null, title: string }) {
  if (error === null) return null
  return (
    <div
      role="alert"
      style={{
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1.5,
        border: `1px solid ${errorColor}`,
        color: errorColor,
      }}
    >
      <strong>{title}</strong>
      {': '}
      <code>{error.code}</code>
      {' — '}
      {error.message}
    </div>
  )
}
