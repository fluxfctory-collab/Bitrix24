import type { Page } from '@playwright/test'

/** Quick pacing and no speech synthesis, so tests are fast and silent. */
export async function applyPresenterDefaults(page: Page, overrides: Record<string, unknown> = {}) {
  await page.addInitScript((prefs) => {
    window.localStorage.setItem('voicedesk.preferences.v1', JSON.stringify(prefs))
  }, { voicePrompts: false, pacing: 'quick', motion: 'reduce', ...overrides })
}

/** Removes the Web Speech recognition API, as in Firefox. */
export async function withoutSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    delete w.SpeechRecognition
    delete w.webkitSpeechRecognition
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true })
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
  })
}

/**
 * Installs a fake SpeechRecognition that "hears" the queued phrases in order,
 * and a getUserMedia stub that grants or denies the microphone.
 */
export async function withFakeSpeech(page: Page, options: { phrases?: string[]; microphone?: 'granted' | 'denied' }) {
  await page.addInitScript(({ phrases, microphone }) => {
    const queue = [...phrases]
    class FakeRecognition {
      lang = 'en-US'
      continuous = false
      interimResults = false
      maxAlternatives = 1
      onresult: ((event: unknown) => void) | null = null
      onerror: ((event: unknown) => void) | null = null
      onend: (() => void) | null = null
      private timer: ReturnType<typeof setTimeout> | undefined
      start() {
        this.timer = setTimeout(() => {
          const phrase = queue.shift()
          if (phrase) {
            const result = Object.assign([{ transcript: phrase, confidence: 0.91 }], { isFinal: true })
            this.onresult?.({ resultIndex: 0, results: [result] })
          } else {
            this.onerror?.({ error: 'no-speech' })
          }
          this.onend?.()
        }, 150)
      }
      stop() {
        clearTimeout(this.timer)
        this.onend?.()
      }
      abort() {
        clearTimeout(this.timer)
        this.onerror?.({ error: 'aborted' })
        this.onend?.()
      }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: FakeRecognition, configurable: true })
    Object.defineProperty(window, 'SpeechRecognition', { value: FakeRecognition, configurable: true })
    const media = navigator.mediaDevices ?? ({} as MediaDevices)
    Object.defineProperty(media, 'getUserMedia', {
      configurable: true,
      value: async () => {
        if (microphone === 'denied') throw new DOMException('Permission denied', 'NotAllowedError')
        return { getTracks: () => [] }
      },
    })
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: media, configurable: true })
  }, { phrases: options.phrases ?? [], microphone: options.microphone ?? 'granted' })
}

/** Reads the captured-details panel into a label → value map. */
export async function readCapturedDetails(page: Page): Promise<Record<string, string>> {
  return page.getByTestId('captured-details').evaluate((root) => {
    const result: Record<string, string> = {}
    root.querySelectorAll('dt').forEach((dt) => {
      const dd = dt.nextElementSibling
      if (dd) result[dt.textContent?.trim() ?? ''] = (dd.textContent ?? '').trim()
    })
    return result
  })
}
