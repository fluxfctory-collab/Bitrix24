import { RotateCcw, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useFeedback, usePresentation, useServices } from '../../app/contexts'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Switch } from '../../components/ui/Switch'
import { copy } from '../../copy'
import type { MotionPreference, Pacing } from '../../domain/types'

type Confirm = 'workspace' | 'agent' | null

function SettingRow({ title, hint, children, id }: { title: string; hint: string; children: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-5 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="min-w-0 md:max-w-md">
        <p id={id} className="text-[14.5px] font-medium text-ink">
          {title}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
      </div>
      <div className="w-full md:w-auto md:min-w-[360px]">{children}</div>
    </div>
  )
}

export function Settings() {
  const { preferences, setPreferences, resetAgentConfig } = usePresentation()
  const { voiceCapabilities, resetWorkspace } = useServices()
  const { notify } = useFeedback()
  const [confirm, setConfirm] = useState<Confirm>(null)
  const presentationId = useId()
  const workspaceId = useId()

  const save = (patch: Parameters<typeof setPreferences>[0]) => {
    setPreferences(patch)
    notify({ tone: 'success', message: copy.settings.savedToast })
  }

  const confirmAction = () => {
    if (confirm === 'workspace') {
      resetWorkspace()
      notify({ tone: 'info', message: copy.settings.resetWorkspaceDone })
    } else if (confirm === 'agent') {
      resetAgentConfig()
      notify({ tone: 'info', message: copy.settings.restoreAgentDone })
    }
    setConfirm(null)
  }

  return (
    <>
      <PageHeader documentTitle={copy.settings.title} title={copy.settings.title} lead={copy.settings.lead} />

      <div className="flex max-w-4xl flex-col gap-4 lg:gap-5">
        <Card labelledBy={presentationId}>
          <CardHeader title={copy.settings.presentation} titleId={presentationId} />
          <div className="divide-y divide-line">
            <div className="px-4 py-5 sm:px-5">
              <Switch
                label={copy.settings.voicePrompts}
                description={voiceCapabilities.synthesis ? copy.settings.voicePromptsHint : copy.settings.voicePromptsUnsupported}
                checked={preferences.voicePrompts && voiceCapabilities.synthesis}
                disabled={!voiceCapabilities.synthesis}
                onChange={(voicePrompts) => save({ voicePrompts })}
              />
            </div>
            <SettingRow title={copy.settings.pacing} hint={copy.settings.pacingHint}>
              <SegmentedControl<Pacing>
                label={copy.settings.pacing}
                value={preferences.pacing}
                onChange={(pacing) => save({ pacing })}
                options={(['relaxed', 'standard', 'quick'] as const).map((value) => ({ value, label: copy.settings.pacingOptions[value] }))}
                size="sm"
              />
            </SettingRow>
            <SettingRow title={copy.settings.motion} hint={copy.settings.motionHint}>
              <SegmentedControl<MotionPreference>
                label={copy.settings.motion}
                value={preferences.motion}
                onChange={(motion) => save({ motion })}
                options={(['system', 'reduce', 'allow'] as const).map((value) => ({ value, label: copy.settings.motionOptions[value] }))}
                size="sm"
              />
            </SettingRow>
          </div>
        </Card>

        <Card labelledBy={workspaceId}>
          <CardHeader title={copy.settings.workspace} titleId={workspaceId} />
          <div className="divide-y divide-line">
            <SettingRow title={copy.settings.resetWorkspace} hint={copy.settings.resetWorkspaceHint}>
              <Button variant="danger" icon={Trash2} onClick={() => setConfirm('workspace')} className="md:float-right">
                {copy.settings.resetWorkspace}
              </Button>
            </SettingRow>
            <SettingRow title={copy.settings.restoreAgent} hint={copy.settings.restoreAgentHint}>
              <Button variant="secondary" icon={RotateCcw} onClick={() => setConfirm('agent')} className="md:float-right">
                {copy.settings.restoreAgent}
              </Button>
            </SettingRow>
          </div>
        </Card>
      </div>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'agent' ? copy.settings.restoreAgent : copy.settings.resetWorkspace}
        description={confirm === 'agent' ? copy.settings.restoreAgentConfirm : copy.settings.resetWorkspaceConfirm}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {copy.common.cancel}
            </Button>
            <Button variant={confirm === 'workspace' ? 'danger' : 'primary'} onClick={confirmAction}>
              {copy.common.confirm}
            </Button>
          </>
        }
      />
    </>
  )
}
