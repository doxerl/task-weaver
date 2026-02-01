/**
 * Simulation Validation Schemas
 *
 * Zod schemas for validating simulation data structures.
 * Provides runtime type checking and data validation.
 */

import { z } from 'zod';

// =====================================================
// QUARTERLY SCHEMAS
// =====================================================

/**
 * Quarterly amounts schema
 */
export const QuarterlyAmountsSchema = z.object({
  q1: z.number(),
  q2: z.number(),
  q3: z.number(),
  q4: z.number(),
});

/**
 * Optional quarterly amounts (for projections)
 */
export const OptionalQuarterlySchema = z.object({
  q1: z.number().optional(),
  q2: z.number().optional(),
  q3: z.number().optional(),
  q4: z.number().optional(),
}).optional();

// =====================================================
// PROJECTION ITEM SCHEMAS
// =====================================================

/**
 * Base projection item schema
 */
export const ProjectionItemSchema = z.object({
  category: z.string().min(1, 'Kategori gerekli'),
  baseAmount: z.number().default(0),
  projectedAmount: z.number().default(0),
  projectedQuarterly: OptionalQuarterlySchema,
  notes: z.string().optional(),
});

/**
 * Revenue projection item with additional fields
 */
export const RevenueProjectionItemSchema = ProjectionItemSchema.extend({
  type: z.literal('revenue').optional(),
  growthRate: z.number().optional(),
});

/**
 * Expense projection item with additional fields
 */
export const ExpenseProjectionItemSchema = ProjectionItemSchema.extend({
  type: z.literal('expense').optional(),
  isFixed: z.boolean().optional(),
});

/**
 * Investment projection item
 */
export const InvestmentItemSchema = z.object({
  category: z.string().min(1, 'Yatırım kategorisi gerekli'),
  amount: z.number().min(0, 'Yatırım miktarı negatif olamaz'),
  timing: z.enum(['q1', 'q2', 'q3', 'q4', 'annual']).default('annual'),
  description: z.string().optional(),
});

// =====================================================
// SCENARIO SCHEMAS
// =====================================================

/**
 * Scenario type enum
 */
export const ScenarioTypeSchema = z.enum(['positive', 'negative', 'base']);

/**
 * Simulation scenario schema
 */
export const SimulationScenarioSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Senaryo adı gerekli').max(100, 'Senaryo adı çok uzun'),
  baseYear: z.number().int().min(2020).max(2100),
  targetYear: z.number().int().min(2020).max(2100),
  assumedExchangeRate: z.number().positive().optional(),
  revenues: z.array(RevenueProjectionItemSchema).default([]),
  expenses: z.array(ExpenseProjectionItemSchema).default([]),
  investments: z.array(InvestmentItemSchema).default([]),
  notes: z.string().optional(),
  scenarioType: ScenarioTypeSchema.default('positive'),
  version: z.number().int().min(1).default(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

/**
 * Scenario create input (without ID and timestamps)
 */
export const CreateScenarioInputSchema = SimulationScenarioSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

/**
 * Scenario update input (partial)
 */
export const UpdateScenarioInputSchema = SimulationScenarioSchema.partial().required({
  id: true,
});

// =====================================================
// DEAL CONFIGURATION SCHEMAS
// =====================================================

/**
 * Deal configuration schema
 */
export const DealConfigurationSchema = z.object({
  investmentAmount: z.number().min(0, 'Yatırım miktarı negatif olamaz'),
  equityPercentage: z.number().min(0).max(100, 'Equity %0-100 arası olmalı'),
  sectorMultiple: z.number().positive('Sektör çarpanı pozitif olmalı'),
  useOfFunds: z.object({
    product: z.number().min(0).max(100),
    marketing: z.number().min(0).max(100),
    hiring: z.number().min(0).max(100),
    operations: z.number().min(0).max(100),
  }).optional(),
});

// =====================================================
// SUMMARY SCHEMAS
// =====================================================

/**
 * Scenario summary schema
 */
export const ScenarioSummarySchema = z.object({
  totalRevenue: z.number(),
  totalExpense: z.number(),
  netProfit: z.number(),
  profitMargin: z.number(),
  revenueGrowth: z.number().optional(),
  expenseGrowth: z.number().optional(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Validate simulation scenario data
 * @throws ZodError if validation fails
 */
export function validateScenario(data: unknown): z.infer<typeof SimulationScenarioSchema> {
  return SimulationScenarioSchema.parse(data);
}

/**
 * Safe validation (returns result object instead of throwing)
 */
export function safeValidateScenario(data: unknown) {
  return SimulationScenarioSchema.safeParse(data);
}

/**
 * Validate deal configuration
 */
export function validateDealConfig(data: unknown): z.infer<typeof DealConfigurationSchema> {
  return DealConfigurationSchema.parse(data);
}

/**
 * Validate projection item
 */
export function validateProjectionItem(data: unknown): z.infer<typeof ProjectionItemSchema> {
  return ProjectionItemSchema.parse(data);
}

// =====================================================
// TYPE EXPORTS
// =====================================================

export type QuarterlyAmounts = z.infer<typeof QuarterlyAmountsSchema>;
export type ProjectionItem = z.infer<typeof ProjectionItemSchema>;
export type RevenueProjectionItem = z.infer<typeof RevenueProjectionItemSchema>;
export type ExpenseProjectionItem = z.infer<typeof ExpenseProjectionItemSchema>;
export type InvestmentItem = z.infer<typeof InvestmentItemSchema>;
export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;
export type CreateScenarioInput = z.infer<typeof CreateScenarioInputSchema>;
export type UpdateScenarioInput = z.infer<typeof UpdateScenarioInputSchema>;
export type DealConfiguration = z.infer<typeof DealConfigurationSchema>;
export type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;
export type ScenarioType = z.infer<typeof ScenarioTypeSchema>;
