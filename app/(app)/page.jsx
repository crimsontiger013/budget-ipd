import { buildBudgetData } from '@/lib/queries/budget'
import { getBUStructure } from '@/lib/queries/business-units'
import { getScenariosWithOverrides } from '@/lib/queries/scenarios'
import BudgetApp from '@/components/budget/budget-app'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [budgetData, buData, scenarios] = await Promise.all([
    buildBudgetData(),
    getBUStructure(),
    getScenariosWithOverrides(),
  ])

  return (
    <BudgetApp
      consolidated={budgetData.consolidated}
      unitBudgets={budgetData.unitBudgets}
      unitMonthly={budgetData.unitMonthly}
      historical={budgetData.historical}
      budgetLines={budgetData.budgetLines}
      buStructure={buData.structure}
      buColors={buData.buColors}
      buList={buData.buList}
      allUnits={buData.allUnits}
      scenarios={scenarios}
    />
  )
}
