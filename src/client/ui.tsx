/**
 * The page's block set. No primitive here knows the plugin: each is a shape
 * (a ruled section, a spec row, a disclosure, a control) styled by the sheet
 * the page renders once around its whole tree.
 */
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { RpcError } from '../shared/contracts.js'
import { copyText } from './clipboard.js'
import { shortenPath } from './format.js'
import { IconCheck, IconChevron, IconExternal, IconWarning } from './icons.js'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(part => typeof part === 'string' && part.length > 0).join(' ')
}

/** Visual weight of a state marker. Semantic only — never decorative. */
export type Tone = 'ok' | 'warn' | 'bad' | 'idle'

export function Section({ icon, title, action, children }: {
  icon?: ReactNode
  title: string
  /** A control that belongs to the whole group, parked on its title rule. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="hh-section">
      <header className="hh-section-head">
        {icon === undefined ? null : <span className="hh-section-icon">{icon}</span>}
        <h3 className="hh-section-title">{title}</h3>
        <span className="hh-section-rule" aria-hidden="true" />
        {action === undefined ? null : <span className="hh-section-action">{action}</span>}
      </header>
      <div className="hh-section-body">{children}</div>
    </section>
  )
}

/** Label/value pair. Values can be long, so they get the wrapping column. */
export function Spec({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div className="hh-spec">
      <span className="hh-spec-label">{label}</span>
      <span className="hh-spec-value">{children}</span>
    </div>
  )
}

/** Machine text: a path, a port, a pid, a version, a unit name. */
export function Code({ children }: { children: ReactNode }) {
  return <code className="hh-code">{children}</code>
}

export function Hint({ children }: { children: ReactNode }) {
  if (typeof children === 'string' && children.length === 0) return null
  return <p className="hh-hint">{children}</p>
}

export function Chip({ tone, children }: { tone?: Tone | 'accent', children: ReactNode }) {
  return <span className="hh-chip" data-tone={tone ?? 'idle'}>{children}</span>
}

/** Muted external link; the page's own origin is never a navigation target. */
export function Link({ href, children }: { href: string, children?: ReactNode }) {
  return (
    <a className="hh-link" href={href} target="_blank" rel="noreferrer noopener">
      {children ?? href}
      <span className="hh-link-icon" aria-hidden="true"><IconExternal size={11} /></span>
    </a>
  )
}

/**
 * Collapsed facts. Nothing is dropped from the page, only folded.
 *
 * `open` is a *default*, not a control: React only touches the attribute when
 * the prop changes between renders, so a person's manual toggle survives the
 * page's polling re-render, while switching the page style still folds and
 * unfolds every disclosure at once.
 */
export function Details({ label, open = false, children }: {
  label: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details className="hh-details" open={open || undefined}>
      <summary className="hh-summary">
        <span className="hh-chevron" aria-hidden="true"><IconChevron size={12} /></span>
        {label}
      </summary>
      <div className="hh-details-body">{children}</div>
    </details>
  )
}

export function Note({ tone = 'bad', icon = true, title, children }: {
  tone?: 'bad' | 'warn'
  icon?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <div className="hh-note" data-tone={tone} role={tone === 'bad' ? 'alert' : 'note'}>
      {icon ? <span className="hh-note-icon" aria-hidden="true"><IconWarning size={13} /></span> : null}
      <div className="hh-note-body">
        {title === undefined ? null : <span className="hh-note-title">{title}</span>}
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
    </div>
  )
}

/**
 * Inline refusal block: a title plus the host's own detail, never a silent
 * failure. The title and the optional body are the element's children, in that
 * order, and the body is omitted when the host gave no detail.
 */
export function FailureNote({ title, detail }: { title: string, detail: string }) {
  return (
    <div className="hh-note" role="alert">
      <span className="hh-note-icon" aria-hidden="true"><IconWarning size={13} /></span>
      <div className="hh-note-body">
        <strong>{title}</strong>
        {detail.length > 0 ? <p>{detail}</p> : null}
      </div>
    </div>
  )
}

export function ErrorNote({ error, title }: { error: RpcError | null, title: string }) {
  if (error === null) return null
  return (
    <div className="hh-note" role="alert">
      <span className="hh-note-icon" aria-hidden="true"><IconWarning size={13} /></span>
      <div className="hh-note-body">
        <strong>{title}</strong>
        <p>
          <code>{error.code}</code>
          {' — '}
          {error.message}
        </p>
      </div>
    </div>
  )
}

export function Spinner() {
  return <span className="hh-spinner" aria-hidden="true" />
}

export function Button({ children, onClick, disabled, busy, variant = 'default', icon, title }: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  icon?: ReactNode
  title?: string
}) {
  const inert = disabled === true || busy === true
  return (
    <button
      type="button"
      className={cx('hh-btn', variant !== 'default' && `hh-btn-${variant}`)}
      onClick={onClick}
      disabled={inert}
      title={title}
    >
      {busy === true ? <Spinner /> : icon}
      {children}
    </button>
  )
}

/** A single on/off setting. A switch, so its state reads at a glance. */
export function Switch({ label, checked, disabled, onChange }: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      className="hh-switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="hh-switch-track" aria-hidden="true"><span className="hh-switch-knob" /></span>
      <span className="hh-check-label">{label}</span>
    </button>
  )
}

/** Picking items out of a set, so a checkbox — not a switch. */
export function Check({ label, checked, disabled, onChange }: {
  label: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="hh-check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="hh-check-label">{label}</span>
    </label>
  )
}

export function Select({ value, options, disabled, label, onChange }: {
  value: string
  options: ReadonlyArray<{ value: string, label: string }>
  disabled?: boolean
  label?: string
  onChange: (value: string) => void
}) {
  return (
    <select
      className="hh-select"
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={event => onChange(event.target.value)}
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

/** One option in an exclusive choice list. */
export function Option({ label, meta, path, hint, checked, disabled, onChange }: {
  label: string
  /** Short machine value: a version. */
  meta?: string
  /** Full path, truncated here and available in full on hover. */
  path?: string
  /** Sits on the label line, e.g. a "recommended" tag. */
  hint?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <label className="hh-choice-option" data-disabled={disabled === true}>
      <input type="radio" checked={checked} disabled={disabled} onChange={() => onChange()} />
      <span className="hh-choice-label">
        <span>{label}</span>
        {hint}
      </span>
      {meta === undefined ? null : <span className="hh-choice-meta">{meta}</span>}
      {path === undefined
        ? null
        : <span className="hh-choice-path" title={path}>{shortenPath(path)}</span>}
    </label>
  )
}

/** A "recommended" tag on a choice. */
export function Tag({ children }: { children: ReactNode }) {
  return <Chip tone="accent"><IconCheck size={10} />{children}</Chip>
}

/** Read-only command block with its own copy button. */
export function CommandBox({ text, copyLabel, copiedLabel }: {
  text: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="hh-code-box">
      <textarea
        className="hh-code-text"
        readOnly
        value={text}
        rows={Math.min(text.split('\n').length, 4)}
      />
      <div className="hh-btn-row">
        <Button variant="ghost" onClick={() => { void copyText(text).then(setCopied) }}>
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  )
}
