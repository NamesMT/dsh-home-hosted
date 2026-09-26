/** Clipboard access that never throws: false means the browser blocked it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text)
      return true
    }
  }
  catch {
    // Blocked (insecure context, denied permission); the box stays selectable.
  }
  return false
}
