import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleHelp,
  CircleX,
  FileCheck2,
  LoaderCircle,
  MicOff,
  type LucideIcon,
} from 'lucide-react'
import { copy } from '../../copy'
import type { ConnectionState, ConversationState, CrmState, ExtractionStatus } from '../../domain/types'
import { Badge, type BadgeTone } from './Badge'

const CONVERSATION: Record<ConversationState, { tone: BadgeTone; icon: LucideIcon }> = {
  idle: { tone: 'neutral', icon: CircleDashed },
  greeting: { tone: 'info', icon: CircleDot },
  awaiting_answer: { tone: 'info', icon: CircleDot },
  processing_answer: { tone: 'info', icon: LoaderCircle },
  clarifying: { tone: 'warning', icon: CircleHelp },
  extracting: { tone: 'info', icon: LoaderCircle },
  completed: { tone: 'brand', icon: CircleCheck },
  cancelled: { tone: 'neutral', icon: Ban },
  unsupported: { tone: 'warning', icon: CircleAlert },
  permission_denied: { tone: 'error', icon: MicOff },
}

const CRM: Record<CrmState, { tone: BadgeTone; icon: LucideIcon }> = {
  not_connected: { tone: 'neutral', icon: CircleDashed },
  demo_ready: { tone: 'info', icon: FileCheck2 },
  demo_saving: { tone: 'info', icon: LoaderCircle },
  simulated_saved: { tone: 'brand', icon: CircleCheck },
  simulated_failed: { tone: 'error', icon: CircleX },
  uncertain: { tone: 'warning', icon: CircleHelp },
}

const EXTRACTION: Record<ExtractionStatus, BadgeTone> = {
  not_started: 'neutral',
  provisional: 'warning',
  final: 'brand',
}

const CONNECTION: Record<ConnectionState, BadgeTone> = {
  not_configured: 'neutral',
  not_connected: 'neutral',
  simulation: 'info',
  mock_adapter: 'info',
}

export function ConversationBadge({ state, withPrefix = false }: { state: ConversationState; withPrefix?: boolean }) {
  const { tone, icon } = CONVERSATION[state]
  return (
    <Badge tone={tone} icon={icon}>
      {withPrefix ? `${copy.detail.conversation}: ` : ''}
      {copy.conversationState[state]}
    </Badge>
  )
}

export function CrmBadge({ state, withPrefix = false }: { state: CrmState; withPrefix?: boolean }) {
  const { tone, icon } = CRM[state]
  return (
    <Badge tone={tone} icon={icon} title={copy.crmStateHint[state]}>
      {withPrefix ? `${copy.detail.crm}: ` : ''}
      {copy.crmState[state]}
    </Badge>
  )
}

export function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  return <Badge tone={EXTRACTION[status]}>{copy.extractionStatus[status]}</Badge>
}

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <Badge tone={CONNECTION[state]} icon={state === 'simulation' || state === 'mock_adapter' ? CircleDot : CircleDashed}>
      {copy.connectionState[state]}
    </Badge>
  )
}
