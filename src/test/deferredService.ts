import type { VoiceDeskService } from '../services/types'
import { createTestService } from './fakes'

/** Wraps the zero-delay mock service and lets a test override individual methods (e.g. with a deferred promise). */
export function createDeferredService(overrides: Partial<VoiceDeskService>) {
  const base = createTestService()
  const service: VoiceDeskService = { ...base.service, ...overrides }
  return { ...base, service }
}
