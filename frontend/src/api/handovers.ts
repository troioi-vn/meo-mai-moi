import { api } from '@/api/axios'

export interface TransferHandoverDto {
  id: number
  transfer_request_id: number
  owner_user_id: number
  helper_user_id: number
  scheduled_at?: string | null
  location?: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'disputed'
  condition_confirmed?: boolean
  condition_notes?: string | null
  created_at?: string
  updated_at?: string
}

export async function getTransferHandover(transferRequestId: number): Promise<TransferHandoverDto | null> {
  const res = await api.get<{ data: TransferHandoverDto | null }>(`transfer-requests/${String(transferRequestId)}/handover`)
  return res.data.data ?? null
}

export async function helperConfirmHandover(handoverId: number, conditionConfirmed: boolean, conditionNotes?: string): Promise<TransferHandoverDto> {
  const res = await api.post<{ data: TransferHandoverDto }>(`transfer-handovers/${String(handoverId)}/confirm`, {
    condition_confirmed: conditionConfirmed,
    condition_notes: conditionNotes,
  })
  return res.data.data
}

export async function cancelHandover(handoverId: number): Promise<TransferHandoverDto> {
  const res = await api.post<{ data: TransferHandoverDto }>(`transfer-handovers/${String(handoverId)}/cancel`)
  return res.data.data
}

export async function completeHandover(handoverId: number): Promise<TransferHandoverDto> {
  const res = await api.post<{ data: TransferHandoverDto }>(`transfer-handovers/${String(handoverId)}/complete`)
  return res.data.data
}
