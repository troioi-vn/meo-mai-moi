import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  addGroupPets,
  getGroup,
  invalidateGroupQueries,
  useCreateGroup,
  type GroupSummary,
} from '@/api/groups'
import { toast } from '@/lib/i18n-toast'
import { writeGroupContextSelection } from '@/lib/group-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface PetSelectionToolbarProps {
  selectedCount: number
  selectionMode: boolean
  onExitSelection: () => void
  selectedPetIds: number[]
  adminGroups: GroupSummary[]
  online: boolean
  showCreateEmptyHint?: boolean
}

export function PetSelectionToolbar({
  selectedCount,
  selectionMode,
  onExitSelection,
  selectedPetIds,
  adminGroups,
  online,
}: PetSelectionToolbarProps) {
  const { t } = useTranslation(['groups', 'common'])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createGroup = useCreateGroup()
  const [createOpen, setCreateOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [targetGroupId, setTargetGroupId] = useState<string>('')
  const [alreadyAssignedPetIds, setAlreadyAssignedPetIds] = useState<number[]>([])

  const addPets = useMutation({
    mutationFn: ({ groupId, petIds }: { groupId: number; petIds: number[] }) =>
      addGroupPets(groupId, petIds),
    onSuccess: async (_group, variables) => {
      await invalidateGroupQueries(queryClient, variables.groupId)
    },
  })

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('groups:form.nameRequired')
      return
    }
    try {
      const group = await createGroup.mutateAsync({
        name: trimmed,
        pet_ids: selectedPetIds,
      })
      toast.success('groups:messages.created')
      writeGroupContextSelection(group.id)
      setCreateOpen(false)
      setName('')
      onExitSelection()
      void navigate(`/groups/${String(group.id)}`)
    } catch {
      toast.error('groups:messages.error')
    }
  }

  const handleAdd = async () => {
    const groupId = Number(targetGroupId)
    if (!groupId) return
    try {
      const petIds = selectedPetIds.filter((petId) => !alreadyAssignedPetIds.includes(petId))
      if (petIds.length === 0) return
      await addPets.mutateAsync({ groupId, petIds })
      toast.success('groups:messages.petsAdded')
      writeGroupContextSelection(groupId)
      setAddOpen(false)
      setTargetGroupId('')
      onExitSelection()
    } catch {
      toast.error('groups:messages.error')
    }
  }

  if (!online) {
    return null
  }

  if (!selectionMode) {
    return null
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="selection-toolbar"
        role="toolbar"
        aria-label={t('groups:select')}
      >
        <span className="text-sm text-muted-foreground">
          {t('groups:selectedCount', { count: selectedCount })}
        </span>
        <Button
          size="sm"
          disabled={createGroup.isPending}
          onClick={() => {
            setCreateOpen(true)
          }}
          data-testid="create-group-from-selection"
        >
          {selectedCount === 0 ? t('groups:createGroup') : t('groups:createGroupWithPets')}
        </Button>
        {adminGroups.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            disabled={selectedCount === 0}
            onClick={() => {
              setAddOpen(true)
            }}
            data-testid="add-to-group-from-selection"
          >
            {t('groups:addToGroup')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onExitSelection}>
          {t('groups:cancelSelection')}
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groups:form.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('groups:selectedCount', { count: selectedCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="group-name">
              {t('groups:form.name')}
            </label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder={t('groups:form.namePlaceholder')}
              data-testid="create-group-name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={createGroup.isPending}>
              {createGroup.isPending ? t('groups:form.creating') : t('groups:form.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groups:addToGroup')}</DialogTitle>
          </DialogHeader>
          {adminGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('groups:form.noAdminGroups')}</p>
          ) : (
            <Select
              value={targetGroupId}
              onValueChange={(value) => {
                setTargetGroupId(value)
                setAlreadyAssignedPetIds([])
                void getGroup(Number(value))
                  .then((group) => {
                    const assigned = new Set(
                      group.pets.flatMap((pet) => (pet.id == null ? [] : [pet.id]))
                    )
                    setAlreadyAssignedPetIds(selectedPetIds.filter((petId) => assigned.has(petId)))
                  })
                  .catch(() => {
                    toast.error('groups:messages.error')
                  })
              }}
            >
              <SelectTrigger data-testid="add-to-group-select">
                <SelectValue placeholder={t('groups:form.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                {adminGroups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {alreadyAssignedPetIds.length > 0 && (
            <p className="text-sm text-muted-foreground" role="status">
              {t('groups:form.alreadyAssigned', { count: alreadyAssignedPetIds.length })}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleAdd()}
              disabled={
                !targetGroupId ||
                addPets.isPending ||
                selectedPetIds.length === alreadyAssignedPetIds.length
              }
            >
              {addPets.isPending ? t('groups:form.adding') : t('groups:form.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
