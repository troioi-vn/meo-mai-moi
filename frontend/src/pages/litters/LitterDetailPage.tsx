import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  useGetLittersLitter,
  getGetLittersLitterQueryKey,
  useDeleteLittersLitterMembersPet,
  usePutLittersLitter,
  usePostLittersLitterSplitUp,
} from '@/api/generated/litters/litters'
import {
  getGetMyPetsSectionsQueryKey,
  useDeletePetsId,
  usePutPetsId,
  usePutPetsIdStatus,
} from '@/api/generated/pets/pets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PetAvatar } from '@/components/habits/PetAvatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/lib/i18n-toast'
import { ChevronDown, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RemoveMode = 'delete' | 'deceased' | 'lost'

function getLitterErrorMessage(error: unknown, t: (key: string) => string): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return t('pets:litter.detail.notFound')
  }
  return t('pets:litter.detail.loadError')
}

export default function LitterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const litterId = Number(id)
  const navigate = useNavigate()
  const { t } = useTranslation(['pets', 'common'])
  const queryClient = useQueryClient()

  const isValidId = Number.isFinite(litterId) && litterId > 0

  const {
    data: litter,
    isLoading,
    isError,
    error,
  } = useGetLittersLitter(litterId, {
    query: { enabled: isValidId },
  })

  const { mutateAsync: deleteMember, isPending: isSeparating } = useDeleteLittersLitterMembersPet()
  const { mutateAsync: splitUp, isPending: isSplittingUp } = usePostLittersLitterSplitUp()
  const { mutateAsync: renameLitter, isPending: isRenamingLitter } = usePutLittersLitter()
  const { mutateAsync: renamePet, isPending: isRenaming } = usePutPetsId()
  const { mutateAsync: deletePet, isPending: isDeletingPet } = useDeletePetsId()
  const { mutateAsync: updatePetStatus, isPending: isUpdatingPetStatus } = usePutPetsIdStatus()

  const [isEditingLitterName, setIsEditingLitterName] = useState(false)
  const [litterNameDraft, setLitterNameDraft] = useState('')
  const [editingPetId, setEditingPetId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [separatingPetId, setSeparatingPetId] = useState<number | null>(null)
  const [separateDialogPetId, setSeparateDialogPetId] = useState<number | null>(null)
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [removeDialogPetId, setRemoveDialogPetId] = useState<number | null>(null)
  const [removeMode, setRemoveMode] = useState<RemoveMode>('delete')

  if (!isValidId) {
    return (
      <ErrorState
        error={t('pets:litter.detail.notFound')}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (isLoading) {
    return <LoadingState message={t('pets:litter.detail.loading')} />
  }

  if (isError) {
    return (
      <ErrorState
        error={getLitterErrorMessage(error, t)}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (!litter) {
    return (
      <ErrorState
        error={t('pets:litter.detail.notFound')}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  const members = litter.pets ?? []
  const willDissolveOnSeparate = members.length === 2

  const handleStartLitterRename = () => {
    setIsEditingLitterName(true)
    setLitterNameDraft(litter.name)
  }

  const handleCancelLitterRename = () => {
    setIsEditingLitterName(false)
    setLitterNameDraft('')
  }

  const handleSaveLitterRename = async () => {
    const trimmed = litterNameDraft.trim()
    if (!trimmed) {
      toast.error(t('pets:validation.nameRequired'))
      return
    }
    if (trimmed === litter.name) {
      handleCancelLitterRename()
      return
    }

    try {
      await renameLitter({
        litter: litterId,
        data: {
          name: trimmed,
          ...(litter.updated_at ? { base_version: litter.updated_at } : {}),
        },
      })
      await queryClient.invalidateQueries({ queryKey: getGetLittersLitterQueryKey(litterId) })
      toast.success(t('pets:litter.messages.litterRenameSuccess', { name: trimmed }))
      handleCancelLitterRename()
    } catch {
      toast.error(t('pets:litter.messages.litterRenameError'))
    }
  }

  const handleStartRename = (petId: number, currentName: string) => {
    setEditingPetId(petId)
    setEditingName(currentName)
  }

  const handleCancelRename = () => {
    setEditingPetId(null)
    setEditingName('')
  }

  const handleSaveRename = async (pet: (typeof members)[number]) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      toast.error(t('pets:validation.nameRequired'))
      return
    }
    if (trimmed === pet.name) {
      setEditingPetId(null)
      setEditingName('')
      return
    }
    try {
      await renamePet({ id: pet.id, data: { name: trimmed } })
      await queryClient.invalidateQueries({ queryKey: getGetLittersLitterQueryKey(litterId) })
      toast.success(t('pets:litter.messages.renameSuccess', { name: trimmed }))
      setEditingPetId(null)
      setEditingName('')
    } catch {
      toast.error(t('pets:litter.messages.renameError'))
    }
  }

  const handleSeparate = async (petId: number) => {
    setSeparatingPetId(petId)
    const shouldDissolve = willDissolveOnSeparate
    try {
      await deleteMember({ litter: litterId, pet: petId })
      if (shouldDissolve) {
        // Both pets detached, litter deleted
        await queryClient.invalidateQueries({ queryKey: getGetLittersLitterQueryKey(litterId) })
        await queryClient.invalidateQueries({
          queryKey: getGetMyPetsSectionsQueryKey(),
        })
        setSeparateDialogPetId(null)
        toast.success(t('pets:litter.messages.separateDissolved'))
        void navigate('/', { replace: true })
        return
      }
      await queryClient.invalidateQueries({ queryKey: getGetLittersLitterQueryKey(litterId) })
      await queryClient.invalidateQueries({
        queryKey: getGetMyPetsSectionsQueryKey(),
      })
      toast.success(t('pets:litter.messages.separateSuccess'))
    } catch {
      toast.error(t('pets:litter.messages.separateError'))
    } finally {
      setSeparatingPetId(null)
    }
  }

  const handleSplitUp = async () => {
    try {
      await splitUp({ litter: litterId })
      await queryClient.invalidateQueries({ queryKey: getGetLittersLitterQueryKey(litterId) })
      await queryClient.invalidateQueries({
        queryKey: getGetMyPetsSectionsQueryKey(),
      })
      toast.success(t('pets:litter.messages.splitUpSuccess'))
      setSplitDialogOpen(false)
      void navigate('/', { replace: true })
    } catch {
      toast.error(t('pets:litter.messages.splitUpError'))
    }
  }

  const handleRemove = async () => {
    const pet = members.find((member) => member.id === removeDialogPetId)
    if (!pet) return

    const shouldDissolve = members.length === 2

    try {
      if (removeMode === 'delete') {
        await deletePet({ id: pet.id })
      } else {
        await updatePetStatus({
          id: pet.id,
          data: { status: removeMode },
        })
        await deleteMember({ litter: litterId, pet: pet.id })
      }

      await queryClient.invalidateQueries({ queryKey: getGetLittersLitterQueryKey(litterId) })
      await queryClient.invalidateQueries({ queryKey: getGetMyPetsSectionsQueryKey() })
      setRemoveDialogPetId(null)
      toast.success(t(`pets:litter.messages.removeSuccess.${removeMode}`, { name: pet.name }))

      if (shouldDissolve) {
        void navigate('/', { replace: true })
      }
    } catch {
      toast.error(t('pets:litter.messages.removeError'))
    }
  }

  const isRemoving = isDeletingPet || isUpdatingPetStatus || isSeparating

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t('common:nav.home')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{litter.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <CardHeader>
              {isEditingLitterName ? (
                <div className="flex items-center gap-2">
                  <Input
                    data-testid="litter-rename-input"
                    value={litterNameDraft}
                    onChange={(e) => {
                      setLitterNameDraft(e.target.value)
                    }}
                    placeholder={t('pets:litter.detail.litterRenamePlaceholder')}
                    maxLength={255}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleSaveLitterRename()
                      }
                      if (e.key === 'Escape') {
                        handleCancelLitterRename()
                      }
                    }}
                  />
                  <Button
                    data-testid="litter-rename-save"
                    size="sm"
                    onClick={() => {
                      void handleSaveLitterRename()
                    }}
                    disabled={isRenamingLitter || !litterNameDraft.trim()}
                  >
                    {isRenamingLitter
                      ? t('pets:litter.detail.saving')
                      : t('pets:litter.detail.save')}
                  </Button>
                  <Button
                    data-testid="litter-rename-cancel"
                    size="sm"
                    variant="outline"
                    onClick={handleCancelLitterRename}
                    disabled={isRenamingLitter}
                  >
                    {t('pets:litter.detail.cancel')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <CardTitle data-testid="litter-name">{litter.name}</CardTitle>
                  <Button
                    data-testid="litter-rename-btn"
                    size="icon"
                    variant="ghost"
                    onClick={handleStartLitterRename}
                    aria-label={t('pets:litter.detail.renameLitter')}
                    title={t('pets:litter.detail.renameLitter')}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground" data-testid="litter-meta">
                {litter.pet_type?.name ? `${litter.pet_type.name} · ` : ''}
                {t('pets:litter.detail.membersCount', { count: members.length })}
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{t('pets:litter.detail.members')}</CardTitle>
              <Badge variant="secondary" data-testid="litter-member-count">
                {members.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="litter-empty">
                  {t('pets:litter.detail.empty')}
                </p>
              ) : (
                members.map((pet) => {
                  const isEditing = editingPetId === pet.id
                  const isThisSeparating = separatingPetId === pet.id
                  const sexLabel =
                    pet.sex === 'male'
                      ? t('pets:sexLabels.male')
                      : pet.sex === 'female'
                        ? t('pets:sexLabels.female')
                        : t('pets:sexLabels.not_specified')

                  return (
                    <div
                      key={pet.id}
                      data-testid={`litter-member-${String(pet.id)}`}
                      className="flex items-center gap-3 rounded-md border p-3"
                    >
                      <Link
                        to={`/pets/${String(pet.id)}`}
                        data-testid={`member-avatar-link-${String(pet.id)}`}
                        aria-label={t('pets:litter.detail.viewPet', { name: pet.name })}
                        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <PetAvatar name={pet.name} photoUrl={pet.photo_url ?? null} />
                      </Link>
                      <div className="flex-1 min-w-0 space-y-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              data-testid={`rename-input-${String(pet.id)}`}
                              value={editingName}
                              onChange={(e) => {
                                setEditingName(e.target.value)
                              }}
                              placeholder={t('pets:litter.detail.renamePlaceholder')}
                              className="h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void handleSaveRename(pet)
                                }
                                if (e.key === 'Escape') {
                                  handleCancelRename()
                                }
                              }}
                            />
                            <Button
                              data-testid={`rename-save-${String(pet.id)}`}
                              size="sm"
                              onClick={() => {
                                void handleSaveRename(pet)
                              }}
                              disabled={isRenaming || !editingName.trim()}
                            >
                              {isRenaming
                                ? t('pets:litter.detail.saving')
                                : t('pets:litter.detail.save')}
                            </Button>
                            <Button
                              data-testid={`rename-cancel-${String(pet.id)}`}
                              size="sm"
                              variant="outline"
                              onClick={handleCancelRename}
                              disabled={isRenaming}
                            >
                              {t('pets:litter.detail.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Link
                              to={`/pets/${String(pet.id)}`}
                              data-testid={`member-link-${String(pet.id)}`}
                              className="font-medium text-foreground hover:underline truncate block"
                            >
                              {pet.name}
                            </Link>
                            <p
                              className="text-xs text-muted-foreground"
                              data-testid={`member-sex-${String(pet.id)}`}
                            >
                              {sexLabel}
                            </p>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              data-testid={`actions-btn-${String(pet.id)}`}
                              size="sm"
                              variant="outline"
                              disabled={isSeparating || isSplittingUp || isRemoving}
                            >
                              {isThisSeparating && isSeparating
                                ? t('pets:litter.detail.separating')
                                : t('pets:litter.detail.actions')}
                              <ChevronDown className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              data-testid={`rename-btn-${String(pet.id)}`}
                              onSelect={() => {
                                handleStartRename(pet.id, pet.name)
                              }}
                            >
                              {t('pets:litter.detail.rename')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              data-testid={`separate-btn-${String(pet.id)}`}
                              onSelect={() => {
                                if (willDissolveOnSeparate) {
                                  setSeparateDialogPetId(pet.id)
                                } else {
                                  void handleSeparate(pet.id)
                                }
                              }}
                            >
                              {t('pets:litter.detail.separate')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              data-testid={`remove-btn-${String(pet.id)}`}
                              variant="destructive"
                              onSelect={() => {
                                setRemoveMode('delete')
                                setRemoveDialogPetId(pet.id)
                              }}
                            >
                              {t('pets:litter.detail.remove')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h3 className="font-medium">{t('pets:litter.detail.splitUp')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pets:litter.detail.splitUpDescription')}
                </p>
                <Button
                  data-testid="split-up-btn"
                  variant="destructive"
                  onClick={() => {
                    setSplitDialogOpen(true)
                  }}
                  disabled={isSplittingUp || isSeparating}
                >
                  {isSplittingUp
                    ? t('pets:litter.detail.splittingUp')
                    : t('pets:litter.detail.splitUp')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog
        open={separateDialogPetId !== null}
        onOpenChange={(open) => {
          if (!open) setSeparateDialogPetId(null)
        }}
      >
        <AlertDialogContent data-testid="separate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pets:litter.detail.separateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pets:litter.detail.separateConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="separate-cancel">
              {t('pets:litter.detail.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="separate-confirm"
              onClick={(e) => {
                e.preventDefault()
                if (separateDialogPetId !== null) {
                  void handleSeparate(separateDialogPetId)
                }
              }}
              disabled={isSeparating}
            >
              {isSeparating
                ? t('pets:litter.detail.separating')
                : t('pets:litter.detail.separateConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <AlertDialogContent data-testid="split-up-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pets:litter.detail.splitUpConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pets:litter.detail.splitUpConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="split-up-cancel">
              {t('pets:litter.detail.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="split-up-confirm"
              onClick={(e) => {
                e.preventDefault()
                void handleSplitUp()
              }}
              disabled={isSplittingUp}
            >
              {isSplittingUp
                ? t('pets:litter.detail.splittingUp')
                : t('pets:litter.detail.splitUpConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeDialogPetId !== null}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setRemoveDialogPetId(null)
        }}
      >
        <AlertDialogContent data-testid="remove-pet-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pets:litter.detail.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pets:litter.detail.removeDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="remove-pet-mode" className="text-sm font-medium">
              {t('pets:litter.detail.removeModeLabel')}
            </label>
            <Select
              value={removeMode}
              onValueChange={(value) => {
                setRemoveMode(value as RemoveMode)
              }}
            >
              <SelectTrigger id="remove-pet-mode" data-testid="remove-pet-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">{t('pets:litter.detail.removeModes.delete')}</SelectItem>
                <SelectItem value="deceased">
                  {t('pets:litter.detail.removeModes.deceased')}
                </SelectItem>
                <SelectItem value="lost">{t('pets:litter.detail.removeModes.lost')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="remove-pet-cancel" disabled={isRemoving}>
              {t('pets:litter.detail.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="remove-pet-confirm"
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                void handleRemove()
              }}
              disabled={isRemoving}
            >
              {isRemoving ? t('pets:litter.detail.removing') : t('pets:litter.detail.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
