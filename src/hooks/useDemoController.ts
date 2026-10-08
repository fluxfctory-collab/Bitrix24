import { useEffect, useState, useSyncExternalStore } from 'react'
import { useFeedback, usePresentation, useServices } from '../app/contexts'
import { createDemoController } from '../state/demoController'
import { createDemoTiming } from '../state/timing'

/** Creates one demo controller per Demo Studio mount and stops everything when the page unmounts. */
export function useDemoController() {
  const { service, voice } = useServices()
  const { getAgentConfig, getPreferences } = usePresentation()
  const { notify, announce } = useFeedback()
  const [controller] = useState(() =>
    createDemoController({
      service,
      voice,
      getConfig: getAgentConfig,
      getPreferences,
      getTiming: () => createDemoTiming(getPreferences().pacing),
      notify,
      announce,
      onError: (error) => console.error('[VoiceDesk demo]', error),
    }),
  )
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  useEffect(() => () => controller.dispose(), [controller])
  return { controller, state }
}
