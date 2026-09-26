/**
 * The page's stylesheet, one template string rendered by the page itself.
 *
 * Two reasons it is a sheet and not inline style objects: hover, focus and the
 * two small transition moments a static object cannot express, and one scoped
 * place where the page's own tokens are mapped onto the host theme's aliases —
 * every colour below resolves through a `--dsw-*` variable, so light and dark
 * come out of the dialog's own palette.
 */

export const CSS = `
.hh-root {
  --hh-line: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25));
  --hh-line-soft: var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.15));
  --hh-ink: var(--dsw-alias-label-primary, #1f2429);
  --hh-dim: var(--dsw-alias-label-secondary, #5b6570);
  --hh-faint: var(--dsw-alias-label-tertiary, #8b949e);
  --hh-hover: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.1));
  --hh-ok: var(--dsw-alias-state-success-primary, #22a06b);
  --hh-warn: var(--dsw-alias-state-warn-primary, #d9822b);
  --hh-warn-ink: var(--dsw-alias-state-warn-label, #96601a);
  --hh-bad: var(--dsw-alias-state-error-primary, #d64545);
  --hh-idle: var(--dsw-alias-state-idle-primary, #b3bac1);
  --hh-code: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  --hh-family: var(--dsw-font-family, inherit);
  --hh-fs: var(--dsw-font-xs-13-font-size, 13px);
  --hh-lh: var(--dsw-font-xs-13-line-height, 20px);
  --hh-fs-sm: var(--dsw-font-xxs-12-font-size, 12px);
  --hh-lh-sm: var(--dsw-font-xxs-12-line-height, 18px);
  --hh-radius: var(--dsw-radius-sm, 8px);
  --hh-tap: 150ms cubic-bezier(0.2, 0.7, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 22px;
  font-family: var(--hh-family);
  font-size: var(--hh-fs);
  line-height: var(--hh-lh);
  color: var(--hh-ink);
}

/* -- header ------------------------------------------------------------- */

.hh-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 26px;
}

.hh-title {
  margin: 0;
  font-size: var(--dsw-font-s-strong-14-font-size, 14px);
  font-weight: var(--dsw-font-s-strong-14-font-weight, 600);
  line-height: var(--dsw-font-s-strong-14-line-height, 22px);
}

.hh-head-spacer {
  flex: 1 1 auto;
}

/* -- sections ----------------------------------------------------------- */

.hh-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hh-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
}

.hh-section-icon {
  display: inline-flex;
  flex: none;
  color: var(--hh-faint);
}

.hh-section-title {
  margin: 0;
  font-size: var(--dsw-font-xs-strong-13-font-size, 13px);
  font-weight: var(--dsw-font-xs-strong-13-font-weight, 500);
  line-height: var(--dsw-font-xs-strong-13-line-height, 20px);
  white-space: nowrap;
}

/* The rule is the section's structure, not its decoration: it carries the eye
   from a title across the pane and stops there. */
.hh-section-rule {
  flex: 1 1 auto;
  height: 1px;
  background: var(--hh-line);
}

.hh-section-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.hh-section-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* -- signal readout ----------------------------------------------------- */

.hh-signals {
  display: flex;
  flex-direction: column;
  padding: 5px 0;
  border-top: 1px solid var(--hh-line);
  border-bottom: 1px solid var(--hh-line);
}

.hh-signal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  min-width: 0;
}

.hh-signal-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hh-idle);
}

.hh-signal[data-tone='ok'] .hh-signal-dot { background: var(--hh-ok); }
.hh-signal[data-tone='warn'] .hh-signal-dot { background: var(--hh-warn); }
.hh-signal[data-tone='bad'] .hh-signal-dot { background: var(--hh-bad); }

.hh-signal-name {
  flex: none;
  width: 84px;
  color: var(--hh-dim);
}

.hh-signal-state {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hh-signal[data-tone='bad'] .hh-signal-state { color: var(--hh-bad); }
.hh-signal[data-tone='warn'] .hh-signal-state { color: var(--hh-warn-ink); }

.hh-signal-meta {
  margin-left: auto;
  padding-left: 10px;
  flex: none;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hh-faint);
  font-family: var(--hh-code);
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
}

/* -- text --------------------------------------------------------------- */

.hh-hint {
  margin: 0;
  max-width: 68ch;
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
}

.hh-hint-tight { margin: 0; }

.hh-code {
  font-family: var(--hh-code);
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.hh-strong { font-weight: 500; }

/* -- links -------------------------------------------------------------- */

.hh-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--hh-line);
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
  transition: text-decoration-color var(--hh-tap), color var(--hh-tap);
}

.hh-link:hover { text-decoration-color: currentColor; }
.hh-link:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 2px;
}

.hh-link-icon {
  display: inline-flex;
  vertical-align: -2px;
  margin-left: 3px;
  color: var(--hh-faint);
}

/* -- spec rows ---------------------------------------------------------- */

.hh-spec {
  display: grid;
  grid-template-columns: minmax(88px, 34%) minmax(0, 1fr);
  gap: 2px 14px;
  align-items: baseline;
  font-size: var(--hh-fs);
}

.hh-spec-label { color: var(--hh-dim); }

.hh-spec-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* -- buttons ------------------------------------------------------------ */

.hh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  line-height: 1;
  cursor: pointer;
  transition: background var(--hh-tap), border-color var(--hh-tap), color var(--hh-tap), opacity var(--hh-tap);
}

.hh-btn:hover:not(:disabled) { background: var(--hh-hover); }
.hh-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.hh-btn:disabled { opacity: 0.45; cursor: default; }

.hh-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill, #1f2429);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}

.hh-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #3a4149); }

.hh-btn-ghost {
  border-color: transparent;
  color: var(--hh-dim);
  padding: 5px 8px;
}

.hh-btn-ghost:hover:not(:disabled) { color: var(--hh-ink); }

.hh-btn-danger {
  border-color: color-mix(in srgb, var(--hh-bad) 45%, transparent);
  color: var(--hh-bad);
}

.hh-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--hh-bad) 10%, transparent);
}

.hh-btn-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.hh-spinner {
  flex: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, currentColor 25%, transparent);
  border-top-color: currentColor;
  animation: hh-spin 0.7s linear infinite;
}

/* -- switch and checkbox ------------------------------------------------ */

.hh-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  text-align: left;
  cursor: pointer;
}

.hh-switch:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 4px;
}

.hh-switch-track {
  position: relative;
  flex: none;
  width: 32px;
  height: 19px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.35));
  transition: background var(--hh-tap);
}

.hh-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary-foreground, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  transition: transform var(--hh-tap);
}

.hh-switch[aria-checked='true'] .hh-switch-track { background: var(--dsw-alias-brand-primary, #1f2429); }
.hh-switch[aria-checked='true'] .hh-switch-knob { transform: translateX(13px); }
.hh-switch:disabled { opacity: 0.5; cursor: default; }

.hh-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--hh-fs);
  cursor: pointer;
}

.hh-check input {
  flex: none;
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary, #1f2429);
  cursor: inherit;
}

.hh-check:has(input:disabled) { opacity: 0.5; cursor: default; }

.hh-check-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hh-check-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -- choice list (which copy runs the panel) ---------------------------- */

.hh-choice {
  display: flex;
  flex-direction: column;
}

.hh-choice-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 2px 9px;
  align-items: baseline;
  padding: 7px 8px;
  border-radius: var(--hh-radius);
  cursor: pointer;
  transition: background var(--hh-tap);
}

.hh-choice-option:hover { background: var(--hh-hover); }
.hh-choice-option[data-disabled='true'] { opacity: 0.5; cursor: default; }
.hh-choice-option[data-disabled='true']:hover { background: transparent; }

.hh-choice-option input {
  grid-row: 1;
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary, #1f2429);
}

.hh-choice-label {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.hh-choice-meta {
  font-family: var(--hh-code);
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
  color: var(--hh-dim);
}

.hh-choice-path {
  grid-column: 2 / -1;
  font-family: var(--hh-code);
  font-size: 0.94em;
  color: var(--hh-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -- disclosure --------------------------------------------------------- */

.hh-details { border-top: 1px solid var(--hh-line-soft); }

.hh-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
  cursor: pointer;
  list-style: none;
  transition: color var(--hh-tap);
}

.hh-summary::-webkit-details-marker { display: none; }
.hh-summary:hover { color: var(--hh-ink); }
.hh-summary:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 2px;
}

.hh-chevron { transition: transform var(--hh-tap); }
.hh-details[open] .hh-chevron { transform: rotate(90deg); }

.hh-details-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 2px 0 8px;
}

.hh-details[open] .hh-details-body { animation: hh-reveal 160ms ease-out; }

/* -- chips -------------------------------------------------------------- */

.hh-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border: 1px solid var(--hh-line);
  border-radius: 999px;
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: 17px;
  white-space: nowrap;
}

.hh-chip[data-tone='ok'] { color: var(--hh-ok); border-color: color-mix(in srgb, var(--hh-ok) 40%, transparent); }
.hh-chip[data-tone='warn'] { color: var(--hh-warn-ink); border-color: color-mix(in srgb, var(--hh-warn) 45%, transparent); }
.hh-chip[data-tone='bad'] { color: var(--hh-bad); border-color: color-mix(in srgb, var(--hh-bad) 40%, transparent); }
.hh-chip[data-tone='accent'] {
  color: var(--hh-ink);
  border-color: color-mix(in srgb, var(--hh-ink) 25%, transparent);
  background: color-mix(in srgb, var(--hh-ink) 5%, transparent);
}

/* -- notes -------------------------------------------------------------- */

.hh-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--hh-radius);
  background: color-mix(in srgb, var(--hh-bad) 8%, transparent);
  color: var(--hh-bad);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
}

.hh-note[data-tone='warn'] {
  background: color-mix(in srgb, var(--hh-warn) 12%, transparent);
  color: var(--hh-warn-ink);
}

.hh-note-icon { display: inline-flex; flex: none; margin-top: 2px; }
.hh-note-actions { display: flex; gap: 8px; margin-top: 6px; }
.hh-note-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hh-note-title { font-weight: 500; }
.hh-note p { margin: 0; overflow-wrap: anywhere; }
.hh-note code {
  font-family: var(--hh-code);
  font-size: 0.94em;
}

/* -- command / output boxes --------------------------------------------- */

.hh-code-box { display: flex; flex-direction: column; gap: 6px; }

.hh-code-text {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font-family: var(--hh-code);
  font-size: 0.94em;
  line-height: 1.6;
  resize: vertical;
}

.hh-output {
  max-height: 170px;
  margin: 0;
  padding: 8px 10px;
  overflow: auto;
  border-radius: var(--hh-radius);
  background: color-mix(in srgb, var(--hh-ink) 5%, transparent);
  font-family: var(--hh-code);
  font-size: 0.94em;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* -- lists (entries, servers, agent tools) ------------------------------ */

.hh-list { display: flex; flex-direction: column; }

.hh-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-top: 1px solid var(--hh-line-soft);
  min-width: 0;
}

.hh-item:first-child { border-top: 0; }

.hh-item-main { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.hh-item-name { font-weight: 500; }
.hh-item-meta {
  color: var(--hh-faint);
  font-size: var(--hh-fs-sm);
  font-family: var(--hh-code);
  font-variant-numeric: tabular-nums;
}
.hh-item-spacer { flex: 1 1 auto; }

.hh-item-actions {
  display: flex;
  flex: none;
  gap: 6px;
  opacity: 0.8;
  transition: opacity var(--hh-tap);
}

.hh-item:hover .hh-item-actions,
.hh-item:focus-within .hh-item-actions { opacity: 1; }

.hh-tools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 7px 16px;
}

/* -- select ------------------------------------------------------------- */

.hh-select {
  padding: 4px 8px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  cursor: pointer;
  transition: background var(--hh-tap);
}

.hh-select:hover:not(:disabled) { background: var(--hh-hover); }
.hh-select:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.hh-select:disabled { opacity: 0.45; cursor: default; }

/* -- field -------------------------------------------------------------- */

.hh-field-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hh-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 120px;
}

.hh-field-label { color: var(--hh-dim); font-size: var(--hh-fs-sm); }

.hh-input {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  font-variant-numeric: tabular-nums;
}

.hh-input:hover:not(:disabled) { background: var(--hh-hover); }
.hh-input:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
.hh-input:disabled { opacity: 0.45; cursor: default; }

/* -- motion ------------------------------------------------------------- */

@keyframes hh-spin { to { transform: rotate(360deg); } }

@keyframes hh-reveal {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: none; }
}

@keyframes hh-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hh-signals[data-busy='true'] .hh-signal-dot { animation: hh-pulse 1.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .hh-root *, .hh-root *::before, .hh-root *::after {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 420px) {
  .hh-signal { flex-wrap: wrap; }
  .hh-signal-name { width: auto; min-width: 72px; }
  .hh-signal-meta { max-width: 100%; margin-left: 17px; padding-left: 0; }
  .hh-spec { grid-template-columns: minmax(0, 1fr); }
  .hh-tools { grid-template-columns: minmax(0, 1fr); }
}
`
