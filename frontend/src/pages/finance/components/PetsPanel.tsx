import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAddLedgerPet, useLedgerPets, useRemoveLedgerPet, type Ledger } from '@/api/finance'
import { useMyPetsSections } from '@/api/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatLedgerMoney } from '../finance-format'

export function PetsPanel({ ledger }: { ledger: Ledger }) {
  const { t, i18n } = useTranslation('finance')
  const { data: ledgerPets } = useLedgerPets(ledger.id)
  const { data: sections } = useMyPetsSections()
  const add = useAddLedgerPet(ledger.id)
  const remove = useRemoveLedgerPet(ledger.id)
  const candidates = useMemo(() => {
    const seen = new Set<number>()
    return [
      ...(sections?.owned ?? []),
      ...(sections?.fostering_active ?? []),
      ...(sections?.shared ?? []),
    ].filter((pet) => {
      if (seen.has(pet.id) || ledgerPets?.some((current) => current.id === pet.id)) return false
      seen.add(pet.id)
      return true
    })
  }, [ledgerPets, sections])
  const [candidateId, setCandidateId] = useState<number | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.pets')}</CardTitle>
        <CardDescription>{t('pets.privacy')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.length > 0 && (
          <div className="flex gap-2">
            <select
              className="h-10 flex-1 rounded-md border bg-background px-3"
              value={candidateId ?? ''}
              onChange={(event) => {
                setCandidateId(Number(event.target.value))
              }}
            >
              <option value="">{t('pets.choose')}</option>
              {candidates.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
            <Button
              disabled={candidateId == null}
              onClick={() =>
                candidateId != null &&
                void add.mutateAsync(candidateId).then(() => {
                  setCandidateId(null)
                })
              }
            >
              {t('actions.add')}
            </Button>
          </div>
        )}
        {ledgerPets?.map((pet) => (
          <div
            key={pet.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
          >
            {pet.can_view_profile ? (
              <Link className="font-medium text-primary underline" to={`/pets/${String(pet.id)}`}>
                {pet.name}
              </Link>
            ) : (
              <span className="font-medium">{pet.name}</span>
            )}
            <span className="text-sm text-muted-foreground">
              {t('summary.incomeShort')}{' '}
              {formatLedgerMoney(pet.income_minor ?? 0, ledger, i18n.language)} ·{' '}
              {t('summary.expenseShort')}{' '}
              {formatLedgerMoney(pet.expense_minor ?? 0, ledger, i18n.language)}
            </span>
            <Button size="sm" variant="outline" onClick={() => void remove.mutateAsync(pet.id)}>
              {t('actions.remove')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
