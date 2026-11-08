import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatBirthDate, formatPetAge } from '@/types/pet'
import type { Pet } from '@/types/pet'

/** The pet's age; tapping it reveals the birth date, when one is known. */
export function PetAge({ pet }: { pet: Pet }) {
  const { t, i18n } = useTranslation(['pets'])
  const age = formatPetAge(pet, t)
  const birthDate = formatBirthDate(pet, i18n.language)

  if (!birthDate) {
    return <p className="text-muted-foreground">{age}</p>
  }

  return (
    <Popover>
      {/* The ::after grows the tap target without pushing the neighbouring lines apart. */}
      <PopoverTrigger className="relative w-fit cursor-help rounded-sm text-left text-muted-foreground underline decoration-dotted underline-offset-4 after:absolute after:inset-x-0 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-ring">
        {age}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto px-3 py-2">
        {t('pets:age.born', { date: birthDate })}
      </PopoverContent>
    </Popover>
  )
}
