
# Investment Input Consolidation Plan

## Current State Analysis

### `/finance/simulation/compare` Page (ScenarioComparisonPage)
Currently contains the following user inputs:
1. **FocusProjectSelector** - Investment Focus Projects (max 2), Growth Plan textarea, Investment Allocation Distribution (Product/Marketing/Personnel/Operational %)
2. **DealConfiguration** via `InvestmentTab` - Investment Amount, Equity Percentage, Sector Multiple (from `useInvestorAnalysis`)
3. **EditableProjectionTable** - AI tarafından üretilen projeksiyon tabloları

### `/finance/simulation` Page (GrowthSimulation)
Currently contains:
1. **DealSimulatorCard** - Investment Amount, Equity Percentage, Sector Multiple, Valuation Type
2. **Projection Tables** - Revenue/Expense projections
3. Cap Table, Sensitivity, Cash Flow tabs

## Proposed Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     /finance/simulation                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Investment Configuration Panel (NEW)                         │  │
│  │ ┌─────────────────┐ ┌──────────────────────────────────────┐ │  │
│  │ │ DealSimulator   │ │ FocusProjectSelector                 │ │  │
│  │ │ - Investment $  │ │ - Focus Projects (max 2 checkboxes)  │ │  │
│  │ │ - Equity %      │ │ - Growth Plan (textarea)             │ │  │
│  │ │ - Sector x      │ │ - Investment Allocation              │ │  │
│  │ │ - Valuation     │ │   (Product/Marketing/Personnel/Ops)  │ │  │
│  │ └─────────────────┘ └──────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────── Tabs ─────────────────────────────────────────┐  │
│  │ Projections | Cap Table | Sensitivity | Cash Flow            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Save] → Saves scenario + investment config to DB                 │
│  [Risk Analysis] → Navigate to /finance/simulation/compare         │
└─────────────────────────────────────────────────────────────────────┘

                              ↓
                              
┌─────────────────────────────────────────────────────────────────────┐
│                /finance/simulation/compare                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Scenario A/B Selection (read-only display of config)         │  │
│  │                                                               │  │
│  │ ⚠️ NO USER INPUTS - Read-only comparison view                │  │
│  │                                                               │  │
│  │ Displays:                                                     │  │
│  │ - Focus Projects selected                                     │  │
│  │ - Investment Allocation                                       │  │
│  │ - Deal Configuration                                          │  │
│  │ - Growth Plan                                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────── AI Analysis ──────────────────────────────────┐  │
│  │ Uses saved configuration from GrowthSimulation                │  │
│  │ [Run AI Analysis] → Uses focusProjects, allocation, dealConfig│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────── Read-Only Displays ───────────────────────────┐  │
│  │ - Investment Tab (read-only deal terms)                       │  │
│  │ - Editable Projections (AI output - can still edit)          │  │
│  │ - Charts, Analysis Results                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Extend Scenario Type for Investment Config
**File:** `src/types/simulation.ts`

Add to `SimulationScenario`:
```typescript
focusProjects?: string[];
focusProjectPlan?: string;
investmentAllocation?: InvestmentAllocation;
dealConfig?: {
  investmentAmount: number;
  equityPercentage: number;
  sectorMultiple: number;
  valuationType: 'pre-money' | 'post-money';
};
```

### 2. Update Database Schema
Add columns to `growth_scenarios` table:
- `focus_projects` (text[])
- `focus_project_plan` (text)
- `investment_allocation` (jsonb)
- `deal_config` (jsonb)

### 3. Integrate FocusProjectSelector into GrowthSimulation.tsx
**File:** `src/pages/finance/GrowthSimulation.tsx`

- Add state for focus projects, growth plan, investment allocation
- Import and render `FocusProjectSelector` component next to `DealSimulatorCard`
- Update `handleSave()` to include new fields
- Update `handleSelectScenario()` to load saved config

### 4. Update useScenarios Hook
**File:** `src/hooks/finance/useScenarios.ts`

- Extend `saveScenario()` to persist new fields
- Extend scenario loading to include new fields

### 5. Create InvestmentConfigPanel Component (NEW)
**File:** `src/components/simulation/InvestmentConfigPanel.tsx`

Consolidates:
- DealSimulatorCard
- FocusProjectSelector

Into a single, collapsible panel for the simulation page.

### 6. Make ScenarioComparisonPage Read-Only
**File:** `src/pages/finance/ScenarioComparisonPage.tsx`

- Remove `FocusProjectSelector` interactive component
- Replace with read-only summary cards showing:
  - Selected focus projects
  - Investment allocation percentages
  - Deal terms
- Load config from selected scenarios
- Pass saved config to AI analysis

### 7. Update AI Analysis Flow
**File:** `src/pages/finance/ScenarioComparisonPage.tsx`

- Read `focusProjects`, `investmentAllocation`, `dealConfig` from `scenarioA`
- Display warning if scenarios have different configs
- Use scenario's saved config for AI analysis

### 8. Add i18n Keys
**Files:** `src/i18n/locales/*/simulation.json`

Add translations for:
- "investmentConfig.title" - "Investment Configuration"
- "investmentConfig.description" - "Configure investment parameters..."
- "comparison.savedConfig" - "Using saved configuration"
- "comparison.configMismatch" - "Warning: Scenario configs differ"

## Technical Considerations

1. **Backward Compatibility:** Scenarios without new fields will use defaults
2. **Config Sync:** When navigating from simulation to compare, scenarios must be saved first
3. **Memory:** Config from `memory/features/focus-project-selection` confirms multi-select is already supported
4. **Memory:** `memory/ai-analysis/deal-simulator-data-injection` confirms deal terms are already passed to AI

## Files to Modify

| File | Change Type |
|------|-------------|
| `src/types/simulation.ts` | Add new fields to SimulationScenario |
| `src/hooks/finance/useScenarios.ts` | Extend save/load logic |
| `src/hooks/finance/useGrowthSimulation.ts` | Add state for new inputs |
| `src/pages/finance/GrowthSimulation.tsx` | Add FocusProjectSelector, save config |
| `src/pages/finance/ScenarioComparisonPage.tsx` | Make read-only, load from scenario |
| `src/components/simulation/InvestmentConfigPanel.tsx` | NEW - consolidated panel |
| `src/components/simulation/FocusProjectSelector.tsx` | Minor props adjustment |
| `src/i18n/locales/tr/simulation.json` | Add new keys |
| `src/i18n/locales/en/simulation.json` | Add new keys |
| Database migration | Add new columns |

## Migration Order

1. Database migration (add columns)
2. Update types
3. Update useScenarios hook
4. Create InvestmentConfigPanel
5. Update GrowthSimulation page
6. Update ScenarioComparisonPage (remove inputs, make read-only)
7. Add translations
8. Test end-to-end

