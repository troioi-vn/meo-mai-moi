import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  useGetLittersLitter,
  getGetLittersLitterQueryKey,
  useDeleteLittersLitterMembersPet,
  usePostLittersLitterSplitUp,
} from '@/api/generated/litters/litters'
import { usePutPetsId } from '@/api/generated/pets/pets'
import { getGetMyPetsSectionsQueryKey } from '@/api/generated/pets/pets'
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
  const { mutateAsync: renamePet, isPending: isRenaming } = usePutPetsId()

  const [editingPetId, setEditingPetId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [separatingPetId, setSeparatingPetId] = useState<number | null>(null)
  const [separateDialogPetId, setSeparateDialogPetId] = useState<number | null>(null)
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)

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
              <CardTitle data-testid="litter-name">{litter.name}</CardTitle>
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
                      <PetAvatar name={pet.name} photoUrl={pet.photo_url ?? null} />
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
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            data-testid={`rename-btn-${String(pet.id)}`}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleStartRename(pet.id, pet.name)
                            }}
                          >
                            {t('pets:litter.detail.rename')}
                          </Button>
                          <Button
                            data-testid={`separate-btn-${String(pet.id)}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (willDissolveOnSeparate) {
                                setSeparateDialogPetId(pet.id)
                              } else {
                                void handleSeparate(pet.id)
                              }
                            }}
                            disabled={isSeparating || isSplittingUp}
                          >
                            {isThisSeparating && isSeparating
                              ? t('pets:litter.detail.separating')
                              : t('pets:litter.detail.separate')}
                          </Button>
                        </div>
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
    </div>
  )
}
