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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { FolderInput, FolderPlus, X } from 'lucide-react'

interface PetSelectionToolbarProps {
  selectedCount: number
  onExitSelection: () => void
  selectedPetIds: number[]
  adminGroups: GroupSummary[]
}

export function PetSelectionToolbar({
  selectedCount,
  onExitSelection,
  selectedPetIds,
  adminGroups,
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

  return (
    <>
      <div
        className="flex w-full items-center gap-2"
        data-testid="selection-toolbar"
        role="toolbar"
        aria-label={t('groups:select')}
      >
        <span className="shrink-0 text-sm text-muted-foreground">
          {t('groups:selectedCount', { count: selectedCount })}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={createGroup.isPending}
                onClick={() => {
                  setCreateOpen(true)
                }}
                aria-label={t('groups:createGroup')}
                data-testid="create-group-from-selection"
              >
                <FolderPlus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('groups:createGroup')}</TooltipContent>
          </Tooltip>
          {adminGroups.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={selectedCount === 0}
                  onClick={() => {
                    setAddOpen(true)
                  }}
                  aria-label={t('groups:addToGroup')}
                  data-testid="add-to-group-from-selection"
                >
                  <FolderInput className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('groups:addToGroup')}</TooltipContent>
            </Tooltip>
          )}
          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onExitSelection}
                  aria-label={t('groups:cancelSelection')}
                >
                  <X className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('groups:cancelSelection')}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
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
