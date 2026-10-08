/**
 * Optional browser voice adapter (Web Speech API).
 *
 * Browser transcription is real when it happens, but it is a browser demo,
 * not a telephone call. Recognition may be processed remotely by the
 * browser vendor's speech service; the UI discloses this. Every operation
 * accepts an AbortSignal so a cancelled session can never deliver late
 * results, and recognition is never running while the bot is speaking
 * (the controller only listens after a prompt has finished).
 */
import { AbortedError } from '../lib/async'

export interface VoiceCapabilities {
  recognition: boolean
  synthesis: boolean
  microphoneApi: boolean
  secureContext: boolean
}

export type MicrophoneResult = 'granted' | 'denied' | 'no_device' | 'unavailable'

export type ListenOutcome =
  | { kind: 'result'; transcript: string; confidence: number | null }
  | { kind: 'no_speech' }
  | { kind: 'stopped' }

export type VoiceErrorCode = 'not_allowed' | 'audio_capture' | 'network' | 'unsupported' | 'service'

export class VoiceError extends Error {
  readonly code: VoiceErrorCode
  readonly detail: string
  constructor(code: VoiceErrorCode, detail: string) {
    super(`Speech recognition error: ${detail}`)
    this.name = 'VoiceError'
    this.code = code
    this.detail = detail
  }
}

export interface ListenOptions {
  signal: AbortSignal
  lang: string
  onInterim?: (text: string) => void
}

export interface VoiceAdapter {
  capabilities(): VoiceCapabilities
  requestMicrophone(signal: AbortSignal): Promise<MicrophoneResult>
  speak(text: string, options: { signal: AbortSignal; lang: string }): Promise<void>
  listen(options: ListenOptions): Promise<ListenOutcome>
  /** Ends the current recognition gracefully; a final result may still arrive. */
  stopListening(): void
  /** Stops any speech and recognition immediately. */
  cancelAll(): void
}

/** True when the browser microphone demo can run: recognition, a microphone API and a secure page. */
export function isBrowserVoiceSupported(capabilities: VoiceCapabilities): boolean {
  return capabilities.recognition && capabilities.microphoneApi && capabilities.secureContext
}

// Minimal structural types for the Web Speech API (not in every TypeScript DOM lib).
interface RecognitionAlternative {
  transcript: string
  confidence: number
}
interface RecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: RecognitionAlternative
}
interface RecognitionResultEvent {
  resultIndex: number
  results: { readonly length: number; [index: number]: RecognitionResult }
}
interface RecognitionErrorEvent {
  error: string
  message?: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => SpeechRecognitionLike

type SpeechWindow = Window & { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }

function getUtteranceConstructor(win: Window): typeof SpeechSynthesisUtterance | null {
  return (win as SpeechWindow).SpeechSynthesisUtterance ?? null
}

function getRecognitionConstructor(win: Window): RecognitionConstructor | null {
  const w = win as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function detectVoiceCapabilities(win: Window | undefined = typeof window === 'undefined' ? undefined : window): VoiceCapabilities {
  if (!win) return { recognition: false, synthesis: false, microphoneApi: false, secureContext: false }
  return {
    recognition: getRecognitionConstructor(win) !== null,
    synthesis: 'speechSynthesis' in win && typeof getUtteranceConstructor(win) === 'function',
    microphoneApi: typeof win.navigator?.mediaDevices?.getUserMedia === 'function',
    secureContext: win.isSecureContext !== false,
  }
}

function mapRecognitionError(error: string): VoiceError {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return new VoiceError('not_allowed', error)
    case 'audio-capture':
      return new VoiceError('audio_capture', error)
    case 'network':
      return new VoiceError('network', error)
    case 'language-not-supported':
      return new VoiceError('unsupported', error)
    default:
      return new VoiceError('service', error)
  }
}

/** Upper bound for one listening turn; recognition is stopped if the engine never ends on its own. */
const MAX_LISTEN_MS = 15000

export function createBrowserVoiceAdapter(win: Window = window): VoiceAdapter {
  let activeRecognition: { stop: () => void; abort: () => void } | null = null

  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    const voices = win.speechSynthesis.getVoices()
    return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith('en')) ?? null
  }

  return {
    capabilities: () => detectVoiceCapabilities(win),

    async requestMicrophone(signal) {
      const media = win.navigator.mediaDevices
      if (!media?.getUserMedia || win.isSecureContext === false) return 'unavailable'
      try {
        const stream = await media.getUserMedia({ audio: true })
        // Only the permission is needed here; recognition opens its own capture.
        stream.getTracks().forEach((track) => track.stop())
        if (signal.aborted) throw new AbortedError()
        return 'granted'
      } catch (error) {
        if (error instanceof AbortedError) throw error
        const name = error instanceof Error ? error.name : ''
        if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
        if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') return 'no_device'
        return 'unavailable'
      }
    },

    speak(text, { signal, lang }) {
      const Utterance = getUtteranceConstructor(win)
      if (!('speechSynthesis' in win) || !Utterance || signal.aborted) return Promise.resolve()
      const synth = win.speechSynthesis
      return new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          clearTimeout(fallback)
          signal.removeEventListener('abort', onAbort)
          resolve()
        }
        const onAbort = () => {
          synth.cancel()
          finish()
        }
        synth.cancel()
        const utterance = new Utterance(text)
        utterance.lang = lang
        const voice = pickVoice(lang)
        if (voice) utterance.voice = voice
        utterance.onend = finish
        utterance.onerror = finish
        // Some engines never fire `end`; never let a prompt block the flow.
        const fallback = setTimeout(finish, Math.min(20000, 2000 + text.length * 90))
        signal.addEventListener('abort', onAbort, { once: true })
        synth.speak(utterance)
      })
    },

    listen({ signal, lang, onInterim }) {
      const Recognition = getRecognitionConstructor(win)
      if (!Recognition) return Promise.reject(new VoiceError('unsupported', 'SpeechRecognition unavailable'))
      if (signal.aborted) return Promise.reject(new AbortedError())

      return new Promise<ListenOutcome>((resolve, reject) => {
        const recognition = new Recognition()
        recognition.lang = lang
        recognition.continuous = false
        recognition.interimResults = true
        recognition.maxAlternatives = 1

        let settled = false
        let finalText = ''
        let confidence: number | null = null
        let failure: VoiceError | null = null
        let stopRequested = false
        let hardStop: ReturnType<typeof setTimeout> | undefined

        const cleanup = () => {
          clearTimeout(timeout)
          clearTimeout(hardStop)
          signal.removeEventListener('abort', onAbort)
          recognition.onresult = null
          recognition.onerror = null
          recognition.onend = null
          if (activeRecognition === handle) activeRecognition = null
        }
        const settle = (fn: () => void) => {
          if (settled) return
          settled = true
          cleanup()
          fn()
        }
        const onAbort = () => {
          try {
            recognition.abort()
          } catch {
            // already stopped
          }
          settle(() => reject(new AbortedError()))
        }
        const handle = {
          stop: () => {
            stopRequested = true
            try {
              recognition.stop()
            } catch {
              settle(() => resolve({ kind: 'stopped' }))
            }
          },
          abort: onAbort,
        }

        recognition.onresult = (event) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i]
            const best = result[0]
            if (!best) continue
            if (result.isFinal) {
              finalText += best.transcript
              confidence = typeof best.confidence === 'number' && best.confidence > 0 ? best.confidence : null
            } else {
              interim += best.transcript
            }
          }
          if (interim && !settled) onInterim?.(interim)
        }
        recognition.onerror = (event) => {
          if (event.error === 'no-speech' || event.error === 'aborted') return
          failure = mapRecognitionError(event.error)
        }
        recognition.onend = () => {
          settle(() => {
            if (failure) reject(failure)
            else if (finalText.trim()) resolve({ kind: 'result', transcript: finalText.trim(), confidence })
            else resolve(stopRequested ? { kind: 'stopped' } : { kind: 'no_speech' })
          })
        }
        const timeout = setTimeout(() => {
          try {
            recognition.stop()
          } catch {
            // ignore
          }
          // If the engine still does not end, resolve with what we have.
          hardStop = setTimeout(() => {
            settle(() => resolve(finalText.trim() ? { kind: 'result', transcript: finalText.trim(), confidence } : { kind: 'no_speech' }))
          }, 1500)
        }, MAX_LISTEN_MS)
        signal.addEventListener('abort', onAbort, { once: true })
        activeRecognition = handle
        try {
          recognition.start()
        } catch (error) {
          settle(() => reject(new VoiceError('service', error instanceof Error ? error.message : 'start-failed')))
        }
      })
    },

    stopListening() {
      activeRecognition?.stop()
    },

    cancelAll() {
      activeRecognition?.abort()
      activeRecognition = null
      if ('speechSynthesis' in win) win.speechSynthesis.cancel()
    },
  }
}
