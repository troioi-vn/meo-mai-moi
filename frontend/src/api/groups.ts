import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { api } from '@/api/axios'
import type { Pet } from '@/types/pet'
import {
  getGetMyPetsSectionsQueryKey,
  getMyPetsSections as getMyPetsSectionsGenerated,
} from '@/api/generated/pets/pets'
import {
  getGroupsGroupMemberSuggestions,
  postGroupsGroupMembers,
} from '@/api/generated/groups/groups'
import { invalidatePetCollectionQueries } from '@/lib/pet-cache'

export type GroupRole = 'admin' | 'member'

export interface GroupSummary {
  id: number
  name: string
  viewer_role: GroupRole | null
  member_count: number
  pet_count: number
}

export interface GroupMember {
  user_id: number
  role: GroupRole | null
  start_at: string
  user?: {
    id: number
    name: string
  } | null
}

export interface GroupPetSummary {
  id?: number | null
  name?: string | null
  photo_url?: string | null
  pet_type?: {
    id: number
    name: string
  } | null
}

export interface Group extends GroupSummary {
  created_by_user_id: number
  created_at?: string | null
  updated_at?: string | null
  pets: GroupPetSummary[]
  members: GroupMember[]
}

export interface ManagedGroupResourceInvitation {
  id: number
  type: 'group'
  token: string
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
  expires_at: string
  created_at: string
  updated_at: string
  invited_by_user_id: number
  invitation_url: string
  group_id: number
  role: GroupRole
  inviter?: {
    id: number
    name: string
  } | null
}

export interface CreateGroupResourceInvitationPayload {
  invitation: ManagedGroupResourceInvitation
  invitation_url: string
}

export interface SharingSuggestion {
  id: number
  name: string
}

export interface PetSectionsContext {
  type: 'all' | 'group'
  group_id?: number
  group_name?: string
}

export interface PetSectionsData {
  owned: Pet[]
  fostering_active: Pet[]
  shared: Pet[]
  fostering_past: Pet[]
  context?: PetSectionsContext
}

export const GROUPS_QUERY_KEY = ['/groups'] as const

export function getGroupsQueryKey() {
  return GROUPS_QUERY_KEY
}

export function getGroupQueryKey(groupId: number) {
  return ['/groups', groupId] as const
}

export function getGroupInvitationsQueryKey(groupId: number) {
  return ['/groups', groupId, 'invitations'] as const
}

export function getMyPetsSectionsQueryKey(groupId?: number | null) {
  if (groupId == null) {
    return getGetMyPetsSectionsQueryKey()
  }
  return getGetMyPetsSectionsQueryKey({ group_id: groupId })
}

export async function listGroups(): Promise<GroupSummary[]> {
  return api.get<GroupSummary[]>('/groups')
}

export async function getGroup(groupId: number): Promise<Group> {
  return api.get<Group>(`/groups/${String(groupId)}`)
}

export async function createGroup(body: { name: string; pet_ids?: number[] }): Promise<Group> {
  return api.post<Group>('/groups', body)
}

export async function updateGroup(groupId: number, body: { name: string }): Promise<Group> {
  return api.put<Group>(`/groups/${String(groupId)}`, body)
}

export async function deleteGroup(groupId: number): Promise<void> {
  await api.delete(`/groups/${String(groupId)}`)
}

export async function leaveGroup(groupId: number): Promise<void> {
  await api.post(`/groups/${String(groupId)}/leave`)
}

export async function listGroupMembers(groupId: number): Promise<GroupMember[]> {
  return api.get<GroupMember[]>(`/groups/${String(groupId)}/members`)
}

export async function listGroupMemberSuggestions(groupId: number): Promise<SharingSuggestion[]> {
  return getGroupsGroupMemberSuggestions(groupId)
}

export async function addGroupMember(
  groupId: number,
  body: { user_id: number; role: GroupRole }
): Promise<void> {
  await postGroupsGroupMembers(groupId, body)
}

export async function updateGroupMember(
  groupId: number,
  userId: number,
  body: { role: GroupRole }
): Promise<GroupMember> {
  return api.put<GroupMember>(`/groups/${String(groupId)}/members/${String(userId)}`, body)
}

export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
  await api.delete(`/groups/${String(groupId)}/members/${String(userId)}`)
}

export async function listGroupPets(groupId: number): Promise<GroupPetSummary[]> {
  return api.get<GroupPetSummary[]>(`/groups/${String(groupId)}/pets`)
}

export async function addGroupPet(groupId: number, petId: number): Promise<Group> {
  return api.post<Group>(`/groups/${String(groupId)}/pets/${String(petId)}`)
}

export async function removeGroupPet(groupId: number, petId: number): Promise<void> {
  await api.delete(`/groups/${String(groupId)}/pets/${String(petId)}`)
}

export async function addGroupPets(groupId: number, petIds: number[]): Promise<Group> {
  return api.post<Group>(`/groups/${String(groupId)}/pets`, { pet_ids: petIds })
}

export async function listGroupInvitations(
  groupId: number
): Promise<ManagedGroupResourceInvitation[]> {
  return api.get<ManagedGroupResourceInvitation[]>(`/groups/${String(groupId)}/invitations`)
}

export async function createGroupInvitation(
  groupId: number,
  body: { role: GroupRole }
): Promise<CreateGroupResourceInvitationPayload> {
  return api.post<CreateGroupResourceInvitationPayload>(
    `/groups/${String(groupId)}/invitations`,
    body
  )
}

export async function revokeGroupInvitation(groupId: number, invitationId: number): Promise<void> {
  await api.delete(`/groups/${String(groupId)}/invitations/${String(invitationId)}`)
}

export async function getMyPetsSections(groupId?: number | null): Promise<PetSectionsData> {
  const data = await getMyPetsSectionsGenerated(groupId == null ? undefined : { group_id: groupId })
  return data as unknown as PetSectionsData
}

export async function invalidateGroupQueries(queryClient: QueryClient, groupId?: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGroupsQueryKey() }),
    groupId != null
      ? queryClient.invalidateQueries({ queryKey: getGroupQueryKey(groupId) })
      : Promise.resolve(),
    invalidatePetCollectionQueries(queryClient),
  ])
}

/**
 * Cache cleanup after leave/delete. Cancels and drops detail queries without
 * refetching them (refetch would 403 and block navigation on the settings page).
 */
export async function forgetLeftGroup(queryClient: QueryClient, groupId: number) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: getGroupQueryKey(groupId) }),
    queryClient.cancelQueries({ queryKey: getGroupInvitationsQueryKey(groupId) }),
  ])
  queryClient.removeQueries({ queryKey: getGroupQueryKey(groupId) })
  queryClient.removeQueries({ queryKey: getGroupInvitationsQueryKey(groupId) })
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGroupsQueryKey() }),
    invalidatePetCollectionQueries(queryClient),
  ])
}

export function useGroups(
  options?: Omit<
    UseQueryOptions<GroupSummary[], Error, GroupSummary[], typeof GROUPS_QUERY_KEY>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: getGroupsQueryKey(),
    queryFn: listGroups,
    ...options,
  })
}

export function useGroup(
  groupId: number | undefined,
  options?: Omit<
    UseQueryOptions<Group, Error, Group, ReturnType<typeof getGroupQueryKey>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: getGroupQueryKey(groupId ?? 0),
    queryFn: () => {
      if (groupId == null) {
        return Promise.reject(new Error('Missing group id'))
      }
      return getGroup(groupId)
    },
    enabled: groupId != null && groupId > 0,
    ...options,
  })
}

export function useGroupInvitations(groupId: number | undefined) {
  return useQuery({
    queryKey: getGroupInvitationsQueryKey(groupId ?? 0),
    queryFn: () => {
      if (groupId == null) {
        return Promise.reject(new Error('Missing group id'))
      }
      return listGroupInvitations(groupId)
    },
    enabled: groupId != null && groupId > 0,
  })
}

export function useMyPetsSections(groupId?: number | null, enabled = true) {
  return useQuery({
    queryKey: getMyPetsSectionsQueryKey(groupId),
    queryFn: () => getMyPetsSections(groupId),
    enabled,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGroup,
    onSuccess: async (group) => {
      await invalidateGroupQueries(queryClient, group.id)
    },
  })
}

export function useUpdateGroup(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string }) => updateGroup(groupId, body),
    onSuccess: async () => {
      await invalidateGroupQueries(queryClient, groupId)
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGroup,
    // Do not await cache work — settings page navigates away immediately on success.
    onSuccess: (_data, groupId) => {
      void forgetLeftGroup(queryClient, groupId)
    },
  })
}

export function useLeaveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: leaveGroup,
    // Do not await cache work — settings page navigates away immediately on success.
    onSuccess: (_data, groupId) => {
      void forgetLeftGroup(queryClient, groupId)
    },
  })
}

export function useAddGroupPets(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (petIds: number[]) => addGroupPets(groupId, petIds),
    onSuccess: async () => {
      await invalidateGroupQueries(queryClient, groupId)
    },
  })
}

export function useRemoveGroupPet(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (petId: number) => removeGroupPet(groupId, petId),
    onSuccess: async () => {
      await invalidateGroupQueries(queryClient, groupId)
    },
  })
}

export function useUpdateGroupMember(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: GroupRole }) =>
      updateGroupMember(groupId, userId, { role }),
    onSuccess: async () => {
      await invalidateGroupQueries(queryClient, groupId)
    },
  })
}

export function useAddGroupMember(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: GroupRole }) =>
      addGroupMember(groupId, { user_id: userId, role }),
    onSuccess: async () => {
      await invalidateGroupQueries(queryClient, groupId)
    },
  })
}

export function useRemoveGroupMember(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => removeGroupMember(groupId, userId),
    onSuccess: async () => {
      await invalidateGroupQueries(queryClient, groupId)
    },
  })
}

export function useCreateGroupInvitation(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (role: GroupRole) => createGroupInvitation(groupId, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getGroupInvitationsQueryKey(groupId) })
    },
  })
}

export function useRevokeGroupInvitation(groupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: number) => revokeGroupInvitation(groupId, invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getGroupInvitationsQueryKey(groupId) })
    },
  })
}
