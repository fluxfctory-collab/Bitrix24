import { FlaskConical } from 'lucide-react'
import { useId, useSyncExternalStore } from 'react'
import { useServices } from '../../app/contexts'
import { copy } from '../../copy'
import type { DataScenario } from '../../domain/types'
import { cn } from '../../lib/cn'

const OPTIONS: DataScenario[] = ['sample', 'empty', 'slow', 'error']

/** Discreet presenter tool for inspecting empty, loading and error states. Always labelled as a simulator. */
export function SimulatorControl() {
  const { dataScenario } = useServices()
  const value = useSyncExternalStore(dataScenario.subscribe, dataScenario.get)
  const id = useId()
  const active = value !== 'sample'
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-1.5 rounded-lg border pr-1 pl-2.5 text-[13px]',
        active ? 'border-[#f3dfb5] bg-warn-soft text-warn' : 'border-line bg-surface text-muted',
      )}
      title={copy.simulator.hint}
    >
      <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
      <label htmlFor={id} className="font-medium">
        <span className="sr-only">{copy.simulator.title}</span>
        <span aria-hidden="true" className="hidden sm:inline">
          {copy.simulator.label}
        </span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => dataScenario.set(event.target.value as DataScenario)}
        aria-describedby={`${id}-hint`}
        className="h-8 max-w-[9.5rem] cursor-pointer rounded-md bg-transparent pr-1 pl-1 text-[13px] font-medium text-ink outline-offset-1 hover:bg-black/[0.04]"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {copy.simulator.options[option]}
          </option>
        ))}
      </select>
      <span id={`${id}-hint`} className="sr-only">
        {copy.simulator.hint}
      </span>
    </div>
  )
}
