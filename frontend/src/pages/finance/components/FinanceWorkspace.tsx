import { useTranslation } from 'react-i18next'
import type { Ledger } from '@/api/finance'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountsPanel } from './AccountsPanel'
import { CategoriesPanel } from './CategoriesPanel'
import { MembersPanel } from './MembersPanel'
import { OverviewPanel } from './OverviewPanel'
import { PetsPanel } from './PetsPanel'
import { SettingsPanel } from './SettingsPanel'
import { TransactionsPanel } from './TransactionsPanel'
import { financeAreas, isFinanceArea, type FinanceArea } from '../finance-route'

export function FinanceWorkspace({
  ledger,
  area,
  onAreaChange,
}: {
  ledger: Ledger
  area: FinanceArea
  onAreaChange: (area: FinanceArea) => void
}) {
  const { t } = useTranslation('finance')

  return (
    <Tabs
      value={area}
      onValueChange={(value) => {
        if (isFinanceArea(value)) onAreaChange(value)
      }}
      className="min-w-0"
    >
      <div className="mb-4 max-w-full overflow-x-auto border-b scrollbar-none">
        <TabsList variant="line" className="h-10 min-w-max justify-start p-0">
          {financeAreas.map((item) => (
            <TabsTrigger className="flex-none px-3" value={item} key={item}>
              {t(`areas.${item}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="overview">
        <OverviewPanel ledger={ledger} />
      </TabsContent>
      <TabsContent value="transactions">
        <TransactionsPanel ledger={ledger} />
      </TabsContent>
      <TabsContent value="accounts">
        <AccountsPanel ledger={ledger} />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesPanel ledger={ledger} />
      </TabsContent>
      <TabsContent value="pets">
        <PetsPanel ledger={ledger} />
      </TabsContent>
      <TabsContent value="members">
        <MembersPanel ledger={ledger} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsPanel ledger={ledger} />
      </TabsContent>
    </Tabs>
  )
}
