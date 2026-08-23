import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlusCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AddLitterDialog } from '@/components/pets/AddLitterDialog'

interface Props {
  isOnline: boolean
  variant?: 'default' | 'empty'
}

export function AddPetSplitButton({ isOnline }: Props) {
  const { t } = useTranslation('pets')
  const navigate = useNavigate()
  const [litterOpen, setLitterOpen] = React.useState(false)

  const handleAddPet = () => {
    void navigate('/pets/create')
  }

  const handleAddLitter = () => {
    if (!isOnline) return
    setLitterOpen(true)
  }

  return (
    <>
      <div className="flex items-center" data-testid="add-pet-split-button">
        <Button onClick={handleAddPet} className="rounded-r-none" data-testid="add-pet-button">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('pets:addPet')}
        </Button>
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="rounded-l-none border-l border-primary-foreground/20 px-2"
                      aria-label={t('pets:litter.addLitter')}
                      data-testid="add-pet-chevron"
                      disabled={!isOnline ? false : undefined}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </span>
              </TooltipTrigger>
              {!isOnline && (
                <TooltipContent>
                  <p>{t('pets:litter.offlineTooltip')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleAddPet} data-testid="dropdown-add-pet">
              {t('pets:addPet')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleAddLitter}
              disabled={!isOnline}
              data-testid="dropdown-add-litter"
            >
              <span className="flex flex-col">
                <span>{t('pets:litter.addLitter')}</span>
                {!isOnline && (
                  <span className="text-xs text-muted-foreground">
                    {t('pets:litter.offlineDisabled')}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AddLitterDialog open={litterOpen} onOpenChange={setLitterOpen} />
    </>
  )
}

export function AddFirstPetSplitButton({ isOnline }: Props) {
  const { t } = useTranslation('pets')
  const navigate = useNavigate()
  const [litterOpen, setLitterOpen] = React.useState(false)

  const handleAddPet = () => {
    void navigate('/pets/create')
  }

  const handleAddLitter = () => {
    if (!isOnline) return
    setLitterOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-center gap-0" data-testid="add-first-pet-split">
        <Button
          onClick={handleAddPet}
          data-testid="add-first-pet-button"
          className="rounded-r-none"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('pets:addFirstPet')}
        </Button>
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="rounded-l-none border-l border-primary-foreground/20 px-2"
                      aria-label={t('pets:litter.addLitter')}
                      data-testid="add-first-pet-chevron"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </span>
              </TooltipTrigger>
              {!isOnline && (
                <TooltipContent>
                  <p>{t('pets:litter.offlineTooltip')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleAddPet} data-testid="dropdown-add-first-pet">
              {t('pets:addFirstPet')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleAddLitter}
              disabled={!isOnline}
              data-testid="dropdown-add-first-litter"
            >
              <span className="flex flex-col">
                <span>{t('pets:litter.addLitter')}</span>
                {!isOnline && (
                  <span className="text-xs text-muted-foreground">
                    {t('pets:litter.offlineDisabled')}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AddLitterDialog open={litterOpen} onOpenChange={setLitterOpen} />
    </>
  )
}
