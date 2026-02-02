
## AI Bilingual Response Fix Plan

### Problem Analysis

The AI Edge Function receives the `language` parameter correctly from the frontend (line 1077-1092), but:

| Component | Status | Issue |
|-----------|--------|-------|
| `getUnifiedMasterPrompt()` | ❌ Hardcoded TR | ~350 lines of Turkish-only instructions |
| `userPrompt` section headers | ❌ Hardcoded TR | ~200 lines of Turkish section labels |
| Language instruction | ✅ Working | Appended at line 1466-1467 |
| `langConfig` object | ✅ Working | Properly set with EN/TR values |

The AI sees 550+ lines of Turkish context and only 1-2 lines saying "respond in English", so it follows the dominant language pattern.

### Solution: Bilingual Prompt Template

We need to make the prompt templates language-aware by:

1. **Create bilingual constants** for section headers and key phrases
2. **Pass `langConfig` into the prompt generators** 
3. **Update all hardcoded Turkish strings** to use the bilingual map

### Technical Implementation

**Step 1: Add bilingual prompt constants**

```typescript
const PROMPT_LABELS = {
  en: {
    scenarioRules: 'SCENARIO RULES',
    positiveScenario: 'POSITIVE SCENARIO',
    negativeScenario: 'NEGATIVE SCENARIO', 
    investmentScenario: 'WITH INVESTMENT',
    noInvestmentScenario: 'WITHOUT INVESTMENT',
    analysisSection: 'FINANCIAL ANALYSIS',
    dealEvaluation: 'DEAL EVALUATION',
    pitchDeck: 'PITCH DECK SLIDES',
    nextYearProjection: 'NEXT YEAR PROJECTION',
    historicalBalance: 'HISTORICAL BALANCE SHEET',
    scenarioData: 'SCENARIO DATA',
    quarterlyData: 'QUARTERLY DATA',
    focusProject: 'FOCUS PROJECT',
    deathValley: 'DEATH VALLEY ANALYSIS',
    exitPlan: 'EXIT PLAN',
    // ... 50+ more labels
  },
  tr: {
    scenarioRules: 'SENARYO KURALLARI',
    positiveScenario: 'POZİTİF SENARYO',
    negativeScenario: 'NEGATİF SENARYO',
    investmentScenario: 'YATIRIM ALIRSAK',
    noInvestmentScenario: 'YATIRIM ALAMAZSAK',
    analysisSection: 'FİNANSAL ANALİZ',
    dealEvaluation: 'DEAL DEĞERLENDİRME',
    pitchDeck: 'PITCH DECK SLAYTLARI',
    nextYearProjection: 'SONRAKI YIL PROJEKSİYON',
    historicalBalance: 'GEÇMİŞ YIL BİLANÇOSU',
    scenarioData: 'SENARYO VERİLERİ',
    quarterlyData: 'ÇEYREKLİK VERİLER',
    focusProject: 'ODAK PROJE',
    deathValley: 'DEATH VALLEY ANALİZİ',
    exitPlan: 'ÇIKIŞ PLANI',
    // ... matching labels
  }
};
```

**Step 2: Update function signatures**

```typescript
// Before
const getUnifiedMasterPrompt = (dynamicScenarioRules: string) => `...`;

// After
const getUnifiedMasterPrompt = (dynamicScenarioRules: string, labels: typeof PROMPT_LABELS['en']) => `...`;
```

**Step 3: Update prompt generation call**

```typescript
// At line ~1462-1468
const labels = PROMPT_LABELS[language] || PROMPT_LABELS.tr;

body: JSON.stringify({
  model: PRIMARY_MODEL_ID,
  messages: [
    { 
      role: "system", 
      content: getUnifiedMasterPrompt(dynamicScenarioRules, labels) + 
        `\n\n🌐 LANGUAGE: ALL RESPONSES MUST BE IN ${langConfig.aiLanguage}. ${langConfig.responseInstruction}`
    },
    { role: "user", content: getUserPrompt(data, labels) } // Pass labels to user prompt too
  ],
  // ...
})
```

**Step 4: Refactor major prompt sections**

The following sections need bilingual support:
- `ANTI_HALLUCINATION_RULES` (~80 lines)
- `generateDynamicScenarioRules()` (~150 lines) 
- `FOCUS_PROJECT_RULES` (~80 lines)
- `getUnifiedMasterPrompt()` (~200 lines)
- `userPrompt` section headers (~150 lines)

### Affected Files

| File | Changes |
|------|---------|
| `supabase/functions/unified-scenario-analysis/index.ts` | Add `PROMPT_LABELS` object, update all prompt generators to accept and use `labels` parameter |

### Estimated Changes

- Add ~100 lines for `PROMPT_LABELS` bilingual map
- Modify ~30 function signatures
- Replace ~200 hardcoded Turkish strings with `labels.xyz` references

### Rollout Plan

1. Add `PROMPT_LABELS` constant with all required translations
2. Update `getUnifiedMasterPrompt()` to use labels
3. Update `generateDynamicScenarioRules()` to use labels  
4. Update `userPrompt` builder to use labels
5. Deploy and test with `language: 'en'`

### Expected Outcome

After implementation:
- ✅ AI outputs (insights, recommendations, pitch deck) will be in the selected language
- ✅ Deal score explanations will be localized
- ✅ Strategy notes and investor pitch will match UI language
- ✅ Cached analyses will store the language used for regeneration awareness
