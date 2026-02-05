import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// BILINGUAL PROMPT LABELS
// =====================================================
type Language = 'en' | 'tr';
type PromptLabels = typeof PROMPT_LABELS['en'];

const PROMPT_LABELS = {
  en: {
    // Section headers
    antiHallucinationTitle: '🚫 ANTI-HALLUCINATION RULES - CRITICAL:',
    scenarioRulesTitle: '📊 SCENARIO RULES',
    focusProjectTitle: '🎯 FOCUS PROJECT ANALYSIS - SCIENTIFIC FINANCIAL MODEL:',
    masterPromptRole: 'You are an "Omni-Scient Financial Intelligence" with Fortune 500 CFO and Silicon Valley VC Partner capabilities.',
    
    // Anti-hallucination rules
    onlyUseProvidedData: 'USE ONLY PROVIDED DATA:',
    noGeographicGuess: 'NEVER guess geographic regions (North America, Europe, Asia, etc.)',
    noMarketSize: 'DO NOT fabricate market size figures',
    noIndustryStats: 'DO NOT fabricate industry statistics',
    noCompetitorNames: 'DO NOT fabricate competitor company names',
    noTechIntegrations: 'DO NOT fabricate technology integrations (SAP, Oracle, etc.)',
    noLegalStructures: 'DO NOT fabricate legal structures (Delaware C-Corp, etc.)',
    admitUnknown: 'ADMIT WHAT YOU DON\'T KNOW:',
    noDataAvailable: 'If no data available, say "This information is not available in the provided data"',
    assumptionPrefix: 'If you need to make an assumption, start with "Assumption: ..."',
    userInputRequired: 'Mark missing information with "[User Input Required]"',
    sourceRequired: 'SOURCE CITATION REQUIRED:',
    sourceExample1: '"According to balance sheet data: Current Ratio = X"',
    sourceExample2: '"According to Scenario A projection: Revenue = $X"',
    sourceExample3: '"According to deal config: Investment = $X"',
    sourceExample4: '"Calculated: MOIC = X" (show formula)',
    forbiddenPhrases: 'ABSOLUTELY FORBIDDEN PHRASES (AUTO-REJECT):',
    consultingModel: '"consulting model" (use actual project names)',
    digitalTransformation: '"digital transformation" (specify what is transforming)',
    scalable: '"scalable" (show with numbers)',
    traditionalBusiness: '"traditional business model" (list revenue items)',
    marketLeader: '"market leader" (no data)',
    industryAverage: '"industry average" (no comparative data)',
    marketBillion: '"Market is $X billion in size" (no external data)',
    competitorDoing: '"Competitor Y is doing this" (no data)',
    industryTrend: '"Industry trend is Z direction" (no data)',
    geographicMarket: '"North America/Europe/Asia market..." (no geography data)',
    investorsGenerally: '"Investors generally..." (general assumption)',
    integrationMention: '"SAP/Oracle integration..." (no technical data)',
    legalSetup: '"Delaware C-Corp setup..." (no legal data)',
    tamSamSom: '"$X billion TAM/SAM/SOM" (no market data)',
    externalReport: '"According to McKinsey/Gartner report..." (no external source)',
    noBulletWithoutNumber: 'Bullet point without numbers (EVERY BULLET MUST CONTAIN $ or %)',
    allowedInferences: 'ALLOWED INFERENCES:',
    financialRatioCalc: 'Calculations from provided financial ratios',
    scenarioComparison: 'Scenario A vs B comparison (from provided data)',
    quarterlyTrend: 'Quarterly trend analysis (Q1→Q4 from provided data)',
    dealMetricsCalc: 'Deal metrics (MOIC, IRR) calculation (from formula)',
    breakEvenAnalysis: 'Break-even analysis (from provided data)',
    userProjectGrowth: 'Growth based on user\'s project descriptions',
    crossAnalysis: 'Cross-analysis from Balance Sheet + Scenario data',
    confidenceRule: 'CONFIDENCE SCORE RULE (REQUIRED):',
    confidence90: '90-100%: ONLY direct data calculation (e.g.: Current Ratio = 2.1)',
    confidence75: '75-89%: Data-based inference, NO assumptions (e.g.: Burn rate → runway calculation)',
    confidence60: '60-74%: Logical estimate - "⚠️ ESTIMATE:" label REQUIRED',
    confidence50: '50-59%: Low confidence estimate - "❓ LOW CONFIDENCE:" label REQUIRED',
    confidenceBelow50: '<50%: DO NOT USE - uncertainty too high, do NOT generate this insight',
    confidenceDistribution: '⚠️ CONFIDENCE DISTRIBUTION RULE:',
    notAll85Plus: 'Not all insights can be 85%+ - this is not realistic',
    atLeastOne60to74: 'At least 1 insight should be in 60-74% range (accept uncertainty)',
    realAnalysis: 'Real analyses don\'t always have "certain" results',
    only90PlusForMath: '90%+ only for mathematical calculations (ratios, percentages, totals)',
    assumptionTransparency: 'ASSUMPTION TRANSPARENCY (NEW):',
    forEachInsight: 'For each insight in "assumptions" field:',
    specifyDataSource: 'Specify which data it\'s based on',
    listAssumptions: 'List what assumptions were made',
    validUnderCondition: 'Use format "This estimate is valid under condition: ..."',
    
    // Scenario rules
    positiveVsNegative: 'POSITIVE VS NEGATIVE COMPARISON',
    successorProjection: 'SUCCESSIVE YEAR PROJECTION (SUCCESS STORY)',
    yearOverYear: 'Year-over-year comparison',
    scenarioAPositive: 'SCENARIO A = POSITIVE SCENARIO',
    scenarioBNegative: 'SCENARIO B = NEGATIVE SCENARIO',
    higherNetProfit: 'Scenario with higher net profit',
    growthTargetsMet: 'Scenario where growth targets are met',
    targetScenario: 'Reference as "Target Scenario"',
    mainScenarioForInvestor: 'Main scenario to show investors',
    withInvestmentScenario: 'Scenario that occurs WITH INVESTMENT',
    lowerNetProfit: 'Scenario with lower net profit',
    pessimisticAssumptions: 'Pessimistic assumptions, lower revenue',
    riskScenario: 'Reference as "Risk Scenario"',
    forDownsideRisk: 'For downside risk assessment',
    withoutInvestmentScenario: 'Scenario that occurs WITHOUT INVESTMENT',
    analysisFocus: 'ANALYSIS FOCUS:',
    ifPositiveHappens: 'What happens if Positive Scenario (A) occurs? → Main story (With investment)',
    ifNegativeHappens: 'What happens if Negative Scenario (B) occurs? → Risk analysis (Without investment)',
    whatsDifference: 'What\'s the difference? How big is the risk? → Gap analysis = OPPORTUNITY COST / LOSS',
    investmentComparison: 'INVESTMENT SCENARIO COMPARISON:',
    withInvestmentA: 'WITH INVESTMENT (A): Target growth is achieved, exit plan works',
    withoutInvestmentB: 'WITHOUT INVESTMENT (B): Organic (low) growth, OPPORTUNITY COST = LOSS',
    makeComparisonClear: 'Make this comparison CLEAR in every analysis!',
    nextYearProjectionRule: 'NEXT YEAR PROJECTION RULE:',
    projectionBasedOnA: 'Simulation Year +1 projection is based on Positive Scenario (A)',
    projection40to100: 'Projection = 40-100% growth of Scenario A',
    
    // Successor projection specific
    notPositiveVsNegative: '⚠️ CRITICAL: This is NOT a "positive vs negative" comparison!',
    bothScenariosPositive: '🎯 BOTH SCENARIOS ARE POSITIVE! Do NOT make risk comparisons!',
    baseScenario: 'BASE SCENARIO (INVESTMENT YEAR):',
    thisYearInvestmentTarget: 'This year\'s investment target',
    growthWithInvestment: 'Growth to be achieved with investment',
    allExitPlanBased: 'ALL exit plan and MOIC calculations BASED ON THIS',
    pitchDeckTraction: 'Pitch deck\'s "traction" section uses this year\'s data',
    futureProjection: 'FUTURE PROJECTION (GROWTH YEAR):',
    ifBaseSucceeds: 'Next year if base scenario succeeds',
    growthContinuation: 'Continuation and acceleration of growth',
    notNegativePositive: '⚠️ NOT A NEGATIVE SCENARIO - POSITIVE DEVELOPMENT!',
    globalExpansionYear: 'Global expansion and scaling year',
    successorAnalysisFocus: 'ANALYSIS FOCUS:',
    ifWeReachTargets: 'If we reach our targets this year...',
    whereCanWeGo: 'Where can we go next year?',
    growthMomentumAnalysis: 'Growth momentum analysis',
    bothPositiveOpportunity: 'BOTH SCENARIOS POSITIVE - Do opportunity analysis, NOT risk comparison!',
    noOpportunityCost: 'Do NOT do "Opportunity cost" analysis - this is already a success story',
    pitchDeckFocus: 'PITCH DECK FOCUS:',
    investmentYearData: 'Investment year data = "Traction" and "Business Model" slides',
    growthYearData: 'Growth year data = "Growth Plan" and "Financial Projection" slides',
    storyFormat: 'Story: "If we do $X this year, we become $Y next year"',
    exitPlanAndMoic: 'EXIT PLAN AND MOIC:',
    baseYearFor: 'Base year =',
    moicCalculationsFrom: 'MOIC calculations from',
    onlyShowAsUpside: 'only show as "upside potential"',
    doNotUseSuccessor: 'DO NOT USE (FOR THIS SCENARIO TYPE):',
    negativeScenarioPhrase: '"Negative scenario" phrase',
    riskScenarioPhrase: '"Risk scenario" phrase',
    withoutInvestmentPhrase: '"Without investment" phrase',
    opportunityCostCalc: '"Opportunity cost" calculation',
    lossComparison: 'A vs B "loss" comparison',
    
    // Focus project rules
    investmentRevenuePipeline: '📊 1. INVESTMENT → REVENUE PIPELINE (Investment to Revenue Conversion):',
    formula: 'FORMULA:',
    productInvestmentFormula: 'Product_Investment = Total_Investment × Product_Ratio',
    revenueUpliftFormula: 'Revenue_Uplift = Product_Investment × Revenue_Multiplier',
    growthRateFormula: 'Growth_Rate = Revenue_Uplift / Current_Revenue',
    revenueMultiplier: 'REVENUE MULTIPLIER (By Sector):',
    saasMultiplier: 'SaaS/Software (scalable): 2.0x - 2.5x',
    consultingMultiplier: 'Consulting (human-dependent): 1.2x - 1.5x',
    productMultiplier: 'Product/License: 1.8x - 2.2x',
    exampleCalculation: 'EXAMPLE CALCULATION:',
    nonFocusRule: '📉 2. NON-FOCUS ORGANIC GROWTH RULE:',
    sinceInvestmentFocused: '⚠️ Since investment is directed to focus projects:',
    focusProjects: 'FOCUS PROJECTS: Growth calculated with formula above',
    otherProjects: 'OTHER PROJECTS: ORGANIC GROWTH rate applies',
    organicGrowthOptions: 'ORGANIC GROWTH OPTIONS:',
    zeroDefault: '0% (Default): Full isolation - investment impact clearly visible',
    fivePercent: '5%: Minimal organic growth (inflation + natural growth)',
    eightToTen: '8-10%: Medium organic growth (existing customer expansion)',
    twelveToFifteen: '12-15%: Strong organic growth (mature products)',
    useOrganicRate: '⚠️ Use focusProjectInfo.organicGrowthRate if available, otherwise apply 0%.',
    whyOrganicGrowth: 'WHY ORGANIC GROWTH?',
    realism: '1. Realism: No project grows exactly 0%',
    existingCustomers: '2. Existing customer expansion happens without investment',
    investorConfidence: '3. Investor confidence: Non-exaggerated projections',
    jCurveEffect: '📈 3. J-CURVE EFFECT (Timing by Sector):',
    dontDistributeLinear: 'Don\'t distribute growth linearly across quarters! Apply different J-Curve by sector:',
    saasDefault: '🔷 SaaS / SOFTWARE (Default):',
    q1Effect: 'Q1: 10% effect (product development, beta)',
    q2Effect: 'Q2: 25% effect (first customers)',
    q3Effect: 'Q3: 65% effect (momentum)',
    q4Effect: 'Q4: 100% effect (full scale)',
    consultingService: '🔶 CONSULTING / SERVICE:',
    q1Consulting: 'Q1: 20% effect (team setup, first projects)',
    q2Consulting: 'Q2: 45% effect (references building)',
    q3Consulting: 'Q3: 75% effect (pipeline filling)',
    q4Consulting: 'Q4: 100% effect (full capacity)',
    productLicense: '🔹 PRODUCT / LICENSE:',
    q1Product: 'Q1: 5% effect (production preparation)',
    q2Product: 'Q2: 15% effect (first sales)',
    q3Product: 'Q3: 50% effect (distribution channels)',
    q4Product: 'Q4: 100% effect (market penetration)',
    ecommerce: '🔸 E-COMMERCE:',
    q1Ecommerce: 'Q1: 25% effect (campaign start)',
    q2Ecommerce: 'Q2: 40% effect (customer acquisition)',
    q3Ecommerce: 'Q3: 60% effect (repeat purchases)',
    q4Ecommerce: 'Q4: 100% effect (season + full scale)',
    sectorDetection: '⚠️ Sector detection: Look at revenue item names (SaaS, Tracker, Platform = SaaS; Audit, Consulting = Service)',
    operatingLeverage: '📊 4. OPERATING LEVERAGE (Expense Model):',
    revenueUp50: 'If revenue increases 50%, expenses should NOT increase 50%!',
    fixedExpenses: 'FIXED EXPENSES (Rent, Server, License): 5-10% increase (inflation)',
    variableExpenses: 'VARIABLE EXPENSES (Personnel, Marketing): Revenue increase × 0.4-0.6',
    targetMargin: 'TARGET: Profit margin improvement (Margin Expansion)',
    noMarginNote: 'NOTE: Growth without margin expansion is worthless to investors.',
    ifNoData: '5. IF NO DATA:',
    selectHighestGrowth: 'If user didn\'t specify focus project, select revenue item with highest growth potential',
    identifyBiggestDiff: 'Identify the item creating the biggest difference between Scenario A vs B',
    
    // Master prompt sections
    singleTask: '🎯 SINGLE TASK: Analyze ALL provided financial data (Historical Balance + Current Scenarios + Investment Deal + Professional Analysis Data) and prepare both OPERATIONAL INSIGHTS and INVESTOR PRESENTATION.',
    projectionYearRule: '📅 PROJECTION YEAR RULE - CRITICAL!',
    projectionYearCalc: 'next_year_projection.projection_year calculation rule:',
    projectionFormula: 'projection_year = max(Scenario_A_Year, Scenario_B_Year) + 1',
    examples: 'EXAMPLES:',
    example2028vs2027: '2028 vs 2027 comparison → projection_year = 2029',
    example2027vs2026: '2027 vs 2026 comparison → projection_year = 2028',
    example2026vs2026: '2026 vs 2026 comparison → projection_year = 2027',
    summaryWarning: '⚠️ summary.total_revenue and summary.total_expenses values should be projections for projection_year, NOT current scenario values!',
    dataPackage: '📥 DATA PACKAGE PROVIDED TO YOU:',
    dataItem1: '1. PREVIOUS YEAR BALANCE SHEET: Cash, Receivables, Payables, Equity (shows where company came from)',
    dataItem2: '2. SCENARIO DATA: A (Positive) vs B (Negative) full comparison + itemized revenue/expense details',
    dataItem3: '3. QUARTERLY PERFORMANCE: Q1-Q4 cash flow details',
    dataItem4: '4. DEAL CONFIG: User-defined investment amount, equity percentage, sector multiple',
    dataItem5: '5. CALCULATED EXIT PLAN: Post-Money Valuation, MOIC (3Y/5Y), Break-Even Year',
    dataItem6: '6. DEATH VALLEY ANALYSIS: Critical quarter, monthly burn rate, runway',
    dataItem7: '7. FINANCIAL RATIOS: Liquidity, Profitability, Leverage ratios + Sector Benchmark',
    dataItem8: '8. ITEMIZED TRENDS: Q1→Q4 trend, volatility, concentration for each revenue/expense item',
    dataItem9: '9. SENSITIVITY ANALYSIS: Impact of ±20% revenue change on profit, valuation, MOIC, runway',
    dataItem10: '10. BREAK-EVEN ANALYSIS: Monthly cumulative revenue/expense and break-even point',
    dataItem11: '11. **FOCUS PROJECT (if available)**: User-selected main investment project and growth plan',
    professionalStandards: '🔬 PROFESSIONAL ANALYSIS STANDARDS (Investment Banking Level):',
    itemizedDeepAnalysis: '1. ITEMIZED DEEP ANALYSIS:',
    forEachItem: 'For each revenue/expense item specify:',
    q1q4Trend: 'Q1→Q4 trend direction and growth rate (in %) [FROM DATA]',
    volatilityLevel: 'Volatility level: Low (<20%), Medium (20-50%), High (>50%) [CALCULATE]',
    shareInTotal: 'Share in total and concentration risk (30%+ = ⚠️ Warning, 50%+ = 🔴 Critical) [FROM DATA]',
    rootCauseDiff: 'Root cause of Scenario A vs B difference [COMPARE]',
    ratioInterpretation: '2. FINANCIAL RATIO INTERPRETATION (with Benchmark):',
    compareToBenchmark: 'Compare provided financial ratios to sector average:',
    currentRatioBench: 'Current Ratio: 1.8+ (Good) | 1.3-1.8 (Average) | <1.3 (Watch)',
    netProfitMarginBench: 'Net Profit Margin: 18%+ (Good) | 12-18% (Average) | <12% (Watch)',
    debtEquityBench: 'Debt/Equity: <0.5 (Good) | 0.5-1.0 (Average) | >1.0 (Watch)',
    receivablesAssetBench: 'Receivables/Assets: <20% (Good) | 20-30% (Average) | >30% (Collection Risk)',
    sensitivityInterpretation: '3. SENSITIVITY ANALYSIS INTERPRETATION:',
    whenRevenue20Down: 'When revenue drops 20%:',
    howProfitAffected: 'How is profit affected? [CALCULATE]',
    doesBreakEvenShift: 'Does break-even point shift? [CALCULATE]',
    howManyMonthsRunway: 'How many months of runway remain? [CALCULATE]',
    mostCriticalVariable: 'What is the MOST CRITICAL VARIABLE?',
    confidenceRequired: '4. CONFIDENCE SCORE REQUIREMENT:',
    forEachInsightReq: 'For each insight:',
    confidenceScore0to100: 'confidence_score: 0-100',
    listAssumptionsMade: 'List assumptions',
    showSupportingData: 'Show supporting data points',
    
    // Section titles
    section1Financial: '📊 SECTION 1: FINANCIAL ANALYSIS (For AI Analysis Tab)',
    section1Output: 'Generate these outputs in this section:',
    insights5to7: '5-7 critical insights (category: revenue/profit/cash_flow/risk/efficiency/opportunity)',
    eachInsightConfidence: 'EACH insight requires confidence_score (0-100)',
    eachInsightSource: 'EACH insight must specify data source',
    recommendations3to5: '3-5 strategic recommendations (priority ordered, with action plan)',
    quarterlyAnalysis: 'Quarterly analysis (critical periods, growth trajectory)',
    
    section2Deal: '💼 SECTION 2: DEAL EVALUATION (Investor Perspective)',
    valuationTransparency: '📊 VALUATION CALCULATION TRANSPARENCY (REQUIRED):',
    showFormulaForEach: 'SHOW FORMULA for each valuation:',
    preMoneyFormula: '1. Pre-Money Valuation:',
    preMoneyExample: 'Formula: Pre-Money = (Investment / Equity%) - Investment',
    postMoneyFormula: '2. Post-Money Valuation:',
    postMoneyExample: 'Formula: Post-Money = Investment / Equity%',
    revenueMultipleFormula: '3. Revenue Multiple:',
    revenueMultipleExample: 'Formula: Valuation = Revenue × Sector_Multiple',
    moicFormula: '4. MOIC Calculation:',
    moicExample: 'Formula: MOIC = Exit_Value × Equity% / Investment',
    backEveryNumber: '⚠️ BACK EVERY NUMBER WITH FORMULA - not "Valuation is $X" but "Valuation = Revenue × Multiple = $Y × Zx = $X"',
    dealOutput: 'OUTPUT:',
    dealScoreOutput: 'deal_score: 1-10 score + CALCULATION FORMULA (e.g.: "7/10 = (MOIC×2 + Margin×3 + Growth×2 + Risk×3) / 10")',
    valuationVerdictOutput: 'valuation_verdict: "premium" / "fair" / "cheap" + WHY',
    investorAttractivenessOutput: 'investor_attractiveness: 2 sentence comment',
    riskFactorsOutput: 'risk_factors: 3-5 risks (derive from DATA, DO NOT FABRICATE)',
    
    section3Pitch: '🎤 SECTION 3: PITCH DECK SLIDES (10 SLIDES - STARTUP FOUNDER TONE)',
    criticalNumbers: '⚠️ CRITICAL: EVERY SLIDE MUST CONTAIN SPECIFIC NUMBERS AND PROJECT NAMES!',
    generate10Slides: 'Generate 10-slide investor presentation. Each slide delivers one message, backed by numbers.',
    languageAndTone: 'LANGUAGE AND TONE:',
    speakAsFounder: 'Speak like a startup founder, NOT a financial analyst',
    confidentRealistic: 'Confident but realistic - use "We" language',
    numbersSupport: 'Numbers support the story, not the other way around',
    exciteInvestor: 'Excite the investor but don\'t exaggerate',
    forEachSlide: 'For each slide:',
    titleMax8: 'title: Catchy headline (max 8 words)',
    keyMessageWithNumber: 'key_message: Main message (single sentence) - INCLUDING NUMBERS ($X, %Y format)',
    contentBullets: 'content_bullets: 3-4 items - EVERY ITEM MUST CONTAIN $ or % FORMAT NUMBER',
    speakerNotesMax80: 'speaker_notes: Speaking text (MAX 80 WORDS!) - friendly startup language',
    speakerNotesRule: '⚠️ SPEAKER NOTES RULE:',
    max80Words: 'Maximum 80 words (30-45 second speech)',
    noTechJargon: 'Don\'t use technical jargon',
    catchInvestorAttention: 'Short, punchy sentences to catch investor\'s attention',
    atLeast1Number: 'At least 1 number in each note',
    slideStructure: 'SLIDE STRUCTURE (10 SLIDES):',
    slide1Problem: '1️⃣ PROBLEM',
    slide2Solution: '2️⃣ SOLUTION: [FOCUS PROJECT NAME]',
    slide3Market: '3️⃣ MARKET OPPORTUNITY',
    slide4BusinessModel: '4️⃣ BUSINESS MODEL',
    slide5Traction: '5️⃣ TRACTION (To Date)',
    slide6GrowthPlan: '6️⃣ GROWTH PLAN (With Investment)',
    slide7UseOfFunds: '7️⃣ USE OF FUNDS',
    slide8Financials: '8️⃣ FINANCIAL PROJECTION',
    slide9Team: '9️⃣ TEAM',
    slide10TheAsk: '🔟 THE ASK',
    forbidden: '🚫 FORBIDDEN:',
    forbiddenAnalystLang: 'Financial analyst language ("revenue concentration", "organic growth limits" etc.)',
    forbiddenGeneral: 'General phrases ("scalable", "innovative", "digital transformation")',
    forbiddenNoBullets: 'Items without numbers',
    required: '✅ REQUIRED:',
    requiredFounderTone: 'Startup founder tone',
    requiredEveryBullet: 'Every bullet has $ or % format number',
    requiredProjectName: 'Focus project name in titles (if available)',
    requiredSpeakerNotes: 'Friendly, persuasive explanation in speaker notes',
    
    section4Projection: '📈 SECTION 4: NEXT YEAR PROJECTION (Simulation Year +1)',
    criticalPositiveBase: '⚠️ CRITICAL: ALWAYS BASE ON POSITIVE SCENARIO (A)!',
    projectionRules: '🎯 PROJECTION RULES:',
    baseEqualsA: '1. Base = Scenario A year-end values',
    growth40to100: '2. Growth = 40-100% (investment effect)',
    everyQRevenue: '3. Revenue > 0 for every quarter, Expenses > 0',
    q3q4Positive: '4. Cash flow should turn POSITIVE in Q3-Q4',
    netProfitPositive: '5. Net profit should be positive or near break-even',
    itemizedProjection: '📊 ITEMIZED PROJECTION (SCIENTIFIC MODEL):',
    focusProjectCalc: '🎯 FOCUS PROJECT CALCULATION:',
    step1: 'Step 1: Investment_Product = Total_Investment × Product_Ratio (typically 40%)',
    step2: 'Step 2: Revenue_Uplift = Investment_Product × Multiplier (SaaS:2.0, Service:1.3, Product:1.8)',
    step3: 'Step 3: Growth = Revenue_Uplift / Current_Revenue',
    nonFocusRuleUpdated: '📉 NON-FOCUS RULE (UPDATED):',
    nonFocusOrganicRate: 'Non-focus projects: focusProjectInfo.organicGrowthRate value applies',
    ifNotSpecified: 'If organicGrowthRate not specified: 0% growth (full isolation)',
    exampleOrganicRate: 'Example: if organicGrowthRate = 5, non-focus projects get 5% growth',
    jCurveQuarterly: '⏱️ J-CURVE (Quarterly Distribution):',
    q1Yearly10: 'Q1: 10% of annual growth (preparation period)',
    q2Yearly25: 'Q2: 25% of annual growth (first traction)',
    q3Yearly65: 'Q3: 65% of annual growth (momentum)',
    q4Yearly100: 'Q4: 100% of annual growth (full scale)',
    expenseModel: '📊 EXPENSE MODEL (Operating Leverage):',
    fixedExpenses5to10: 'Fixed expenses: 5-10% increase (inflation effect)',
    variableExpenses05: 'Variable expenses: Revenue increase × 0.5 (margin expansion)',
    investmentDirect: 'Investment direct impact: Personnel + Marketing budgets',
    
    section5Executive: '📧 SECTION 5: EXECUTIVE SUMMARY (STRUCTURED FORMAT - REQUIRED)',
    criticalObject: '⚠️ CRITICAL: Executive summary must be an OBJECT, not plain text!',
    shortPitch150: '1️⃣ short_pitch (150 words): Investor summary',
    revenueItemsReq: '2️⃣ revenue_items (required): Top revenue items list',
    scenarioCompReq: '3️⃣ scenario_comparison (required): A vs B comparison',
    investmentImpactReq: '4️⃣ investment_impact (required): What happens without investment',
    
    doNot: '🚫 DO NOT:',
    doNotGeo: 'Geographic guesses (North America, Europe, etc.)',
    doNotMarketSize: 'Market size figures',
    doNotCompetitor: 'Competitor company names',
    doNotTech: 'Technology/integration guesses',
    doNotLegal: 'Legal structure suggestions',
    doNotExternal: 'External source references',
    
    doThis: '✅ DO:',
    doAnalyzeData: 'Analyze only from provided data',
    doSourceNumbers: 'Specify source of each number',
    doConfidenceScore: 'Give confidence score',
    doScenarioRef: 'Reference Scenario A = Positive, B = Negative',
    doProjectionBase: 'Base next year projection on Scenario A',
    
    language: 'LANGUAGE: Professional',
    languageVC: ', proficient in VC terminology.',
    
    // User prompt section headers
    historicalBalanceSection: 'PREVIOUS YEAR BALANCE SHEET',
    cashPosition: '💰 CASH POSITION:',
    cashOnHand: 'Cash on Hand:',
    bank: 'Bank:',
    totalLiquidAssets: 'Total Liquid Assets:',
    receivablesPayables: '📊 RECEIVABLES/PAYABLES STATUS:',
    tradeReceivables: 'Trade Receivables:',
    tradePayables: 'Trade Payables:',
    netWorkingCapital: 'Net Working Capital:',
    assetsLiabilities: '🏢 ASSETS/LIABILITIES:',
    totalAssets: 'Total Assets:',
    totalLiabilities: 'Total Liabilities:',
    totalEquity: 'Total Equity:',
    profitCapital: '📈 PROFIT/CAPITAL:',
    periodNetProfit: 'Period Net Profit:',
    retainedEarnings: 'Retained Earnings:',
    paidCapital: 'Paid Capital:',
    bankLoans: 'Bank Loans:',
    howToUseData: '🔍 USE THIS DATA AS FOLLOWS:',
    receivablesToAssets: 'Receivables/Total Assets ratio',
    ifAbove30Collection: '- if above 30% there\'s collection issue',
    bankLoansToAssets: 'Bank Loans/Assets ratio',
    debtRiskAnalysis: '- analyze debt risk',
    retainedEarningsStatus: 'Retained Earnings',
    negativeRecovery: 'NEGATIVE - Recovery Mode',
    positiveHealthy: 'POSITIVE - Healthy',
    compareGrowthTargets: '4. Compare this year\'s growth targets with previous year performance',
    noHistoricalBalance: '⚠️ PREVIOUS YEAR BALANCE SHEET NOT AVAILABLE',
    analyzeOnlyScenario: 'Analyze with scenario data only, but note that full risk analysis cannot be done without balance sheet data.',
    scenarioDataSection: 'SCENARIO DATA:',
    targetYear: 'Target Year:',
    totalRevenue: 'Total Revenue:',
    totalExpenses: 'Total Expenses:',
    netProfit: 'Net Profit:',
    profitMargin: 'Profit Margin:',
    quarterlyNet: 'Quarterly Net:',
    dealConfigSection: 'DEAL CONFIG (User Input):',
    requestedInvestment: 'Requested Investment:',
    offeredEquity: 'Offered Equity:',
    sectorMultiple: 'Sector Multiple:',
    safetyMargin: 'Safety Margin:',
    calculatedExitPlan: 'CALCULATED EXIT PLAN',
    basedOnPositive: '(based on POSITIVE SCENARIO):',
    postMoneyValuation: 'Post-Money Valuation:',
    yearInvestorShare: 'Investor Share:',
    moic: 'MOIC',
    breakEvenYear: 'Break-Even Year:',
    fiveYearProjectionDetails: '📊 5-YEAR FINANCIAL PROJECTION DETAILS (CALCULATED):',
    year: 'Year',
    aggressiveGrowth: 'Aggressive Growth',
    normalizedGrowth: 'Normalized Growth',
    stage: 'Stage',
    revenue: 'Revenue:',
    expenses: 'Expenses:',
    ebitda: 'EBITDA:',
    margin: 'Margin:',
    freeCashFlow: 'Free Cash Flow (FCF):',
    appliedGrowthRate: 'Applied Growth Rate:',
    valuationMethods: 'VALUATION METHODS:',
    revenueMultiple: 'Revenue Multiple',
    ebitdaMultiple: 'EBITDA Multiple:',
    dcfDiscount: 'DCF (30% discount):',
    vcMethod: 'VC Method (10x ROI):',
    weightedValuation: '⭐ WEIGHTED VALUATION:',
    valuationMethodology: '💰 VALUATION METHODOLOGY:',
    revenueMultipleWeight: '1. REVENUE MULTIPLE (30% Weight): Revenue × Sector Multiple',
    ebitdaMultipleWeight: '2. EBITDA MULTIPLE (25% Weight): EBITDA × EBITDA Multiple (SaaS:15x, E-commerce:8x)',
    dcfWeight: '3. DCF (30% Weight): 5-year FCF NPV + Terminal Value (30% discount, 3% terminal)',
    vcMethodWeight: '4. VC METHOD (15% Weight): Year 5 Valuation ÷ 10x ROI',
    valuationAnalysisInstructions: '🔍 VALUATION ANALYSIS INSTRUCTIONS:',
    weightedFormula: '1. WEIGHTED valuation = (Revenue×0.30) + (EBITDA×0.25) + (DCF×0.30) + (VC×0.15)',
    useYear5Weighted: '2. Use year 5 weighted valuation in pitch deck - CALCULATED not FABRICATED',
    ebitdaMarginTrend: '3. EBITDA margin trend: How does it change from early years to later years?',
    dcfVsRevenueMultiple: '4. Interpret DCF vs Revenue Multiple difference - which is more reliable?',
    vcMethodRealistic: '5. Evaluate VC method realism (is 10x ROI reasonable?)',
    getAllValuations: '6. Get EVERY valuation number from this section, DO NOT FABRICATE',
    deathValleyAnalysis: 'DEATH VALLEY ANALYSIS (POSITIVE SCENARIO BASED):',
    criticalQuarter: 'Critical Quarter:',
    minCumulativeCash: 'Minimum Cumulative Cash:',
    calculatedRequiredInvestment: 'Calculated Required Investment:',
    monthlyBurnRate: 'Monthly Burn Rate:',
    runway: 'Runway:',
    months: 'months',
    selfSustaining: 'Can Self-Finance:',
    yes: 'Yes',
    no: 'No',
    yearStructureRoles: '📅 YEAR STRUCTURE AND SCENARIO ROLES',
    scenarioType: '🔍 SCENARIO TYPE:',
    timeline: '🗓️ TIMELINE:',
    base: 'Base',
    completedYear: 'Completed year - Actual financials',
    baseYearLabel: 'Base Year',
    investmentTarget: 'Investment target',
    future: 'Future',
    successProjection: 'Success projection',
    year1: 'Year 1',
    scenarioYear: 'Scenario year - Positive/Negative target',
    year2: 'Year 2',
    firstProjectionYear: 'First projection year',
    year3Plus: 'Year 3+',
    moic3YearPoint: '3 Year MOIC calculation point',
    year5Plus: 'Year 5+',
    moic5YearPoint: '5 Year MOIC calculation point',
    scenarioRoles: '🎯 SCENARIO ROLES:',
    investmentYear: 'Investment year',
    dashboardFocused: 'ALL DASHBOARD AND ANALYSES FOCUSED ON THIS',
    exitPlanMoicBased: 'Exit Plan, MOIC, Pitch Deck based on this scenario',
    riskScenarioLabel: 'Risk scenario (without investment)',
    onlyForRiskDownside: 'ONLY for risk analysis and downside assessment',
    criticalInstructions: '⚠️ CRITICAL INSTRUCTIONS:',
    allProjectionsBased: '1. All projection calculations based on POSITIVE SCENARIO (A) data',
    moic3YearBased: '2. MOIC 3 Year = based on',
    moic5YearBased: '3. MOIC 5 Year = based on',
    useSpecificYears: '4. Use SPECIFIC YEARS in pitch deck (e.g. "',
    valuation: 'valuation")',
    refNegativeAs: '5. Reference negative scenario as "Without investment scenario"',
    nextYearProjectionEquals: '6. Next year projection =',
    revenueExpenseDetails: 'REVENUE/EXPENSE DETAILS:',
    scenarioARevenues: 'Scenario A Revenues:',
    scenarioAExpenses: 'Scenario A Expenses:',
    scenarioBRevenues: 'Scenario B Revenues:',
    scenarioBExpenses: 'Scenario B Expenses:',
    quarterlyItemizedDetails: 'QUARTERLY ITEMIZED REVENUE/EXPENSE DETAILS:',
    scenarioAQuarterlyRevenues: 'SCENARIO A - QUARTERLY REVENUES:',
    scenarioBQuarterlyRevenues: 'SCENARIO B - QUARTERLY REVENUES:',
    scenarioDiffRevenues: 'SCENARIO DIFFERENCES - REVENUE ITEMS:',
    scenarioDiffExpenses: 'SCENARIO DIFFERENCES - EXPENSE ITEMS:',
    total: 'Total',
    diff: 'Diff',
    totalDiff: 'Total Diff',
    currencyInfo: '💱 CURRENCY INFO:',
    allValuesNormalized: 'ALL VALUES NORMALIZED TO USD',
    balanceConverted: 'Balance sheet data converted from TL (Average Rate:',
    tlUsd: 'TL/USD)',
    scenarioAlreadyUsd: 'Scenario data already in USD',
    comparisonsHomogeneous: 'Comparisons should be made on homogeneous currency',
    focusProjectInfo: '🎯 FOCUS PROJECT INFORMATION (USER SELECTED):',
    selectedFocusProjects: 'Selected Focus Project(s):',
    projectDescription: '📝 Project Description/Notes (User Input):',
    organicGrowthRate: 'Organic Growth Rate for Non-Focus Projects:',
    growthPlan: '📈 GROWTH PLAN (User Input):',
    notSpecifiedAiSuggest: 'Not specified - AI should suggest most logical growth strategy',
    investmentDistribution: '💵 INVESTMENT DISTRIBUTION (User Preference):',
    productDevelopment: 'Product Development:',
    marketing: 'Marketing:',
    personnel: 'Personnel:',
    operations: 'Operations:',
    analysisInstruction: '🔍 ANALYSIS INSTRUCTION:',
    presentAsGrowthEngine: '1. Present this project(s) as main growth engine in pitch deck',
    createUseOfFunds: '2. Create "Use of Funds" slide based on investment distribution (with specific $ amounts)',
    includeGrowthPlan: '3. Include growth plan in speaker notes',
    everySlideKeyMessage: '4. Every slide\'s key_message should have project name and $ figure',
    highlightInExecutive: '5. Highlight focus project(s) in executive summary',
    noFocusProjectSpecified: '⚠️ NO FOCUS PROJECT SPECIFIED',
    userDidntSelectFocus: 'User didn\'t select focus project. When analyzing:',
    autoSelectHighestGrowth: '1. Auto-select revenue item with highest growth potential',
    identifyBiggestDiffItem: '2. Identify item creating biggest difference between Scenario A vs B',
    useAsGrowthStory: '3. Use this item as main growth story',
    userEdits: '📝 USER EDITS (After Previous Analysis):',
    userMadeChanges: 'User made changes to AI-suggested projection tables.',
    updateAnalysisWithChanges: 'Update analysis considering these changes.',
    editedRevenueProjection: 'Edited Revenue Projection (Next Year):',
    noRevenueEdit: 'No revenue edits',
    editedExpenseProjection: 'Edited Expense Projection (Next Year):',
    noExpenseEdit: 'No expense edits',
    userEdited: '[USER EDITED]',
    editAnalysisInstruction: '🔍 ANALYSIS INSTRUCTION:',
    validateChanges: '1. Validate user\'s changes and assess if they\'re logical',
    ifChangesAffectTotals: '2. If changes affect totals, reflect in insights and pitch deck',
    indicateAggressiveConservative: '3. Indicate if user\'s changes are aggressive/conservative',
    analyzeAllData: 'Analyze all this data (especially previous year balance sheet, quarterly itemized data, and FOCUS PROJECT information) and generate structured output including all 5 sections above.',
    languageInstruction: '🌐 LANGUAGE INSTRUCTION:',
    allContentMustBe: 'All insights, recommendations, pitch deck slides, and strategy notes MUST be in',
  },
  tr: {
    // Section headers
    antiHallucinationTitle: '🚫 HALÜSİNASYON YASAĞI - KRİTİK KURALLAR:',
    scenarioRulesTitle: '📊 SENARYO KURALLARI',
    focusProjectTitle: '🎯 ODAK PROJE ANALİZİ - BİLİMSEL FİNANSAL MODEL:',
    masterPromptRole: 'Sen, Fortune 500 CFO\'su ve Silikon Vadisi VC Ortağı yeteneklerine sahip "Omni-Scient (Her Şeyi Bilen) Finansal Zeka"sın.',
    
    // Anti-hallucination rules
    onlyUseProvidedData: 'SADECE VERİLEN VERİLERİ KULLAN:',
    noGeographicGuess: 'Coğrafi bölge (Kuzey Amerika, Avrupa, Asya vb.) ASLA tahmin etme',
    noMarketSize: 'Pazar büyüklüğü rakamları UYDURMA',
    noIndustryStats: 'Sektör istatistikleri UYDURMA',
    noCompetitorNames: 'Rakip şirket isimleri UYDURMA',
    noTechIntegrations: 'Teknoloji entegrasyonları (SAP, Oracle vb.) UYDURMA',
    noLegalStructures: 'Yasal yapılar (Delaware C-Corp vb.) UYDURMA',
    admitUnknown: 'BİLMEDİĞİNİ İTİRAF ET:',
    noDataAvailable: 'Veri yoksa "Bu bilgi mevcut verilerde yok" de',
    assumptionPrefix: 'Tahmin yapman gerekiyorsa "Varsayım: ..." ile başla',
    userInputRequired: '"[Kullanıcı Girişi Gerekli]" ile eksik bilgileri işaretle',
    sourceRequired: 'KAYNAK GÖSTERİMİ ZORUNLU:',
    sourceExample1: '"Bilanço verilerine göre: Current Ratio = X"',
    sourceExample2: '"Senaryo A projeksiyonuna göre: Gelir = $X"',
    sourceExample3: '"Deal config\'e göre: Yatırım = $X"',
    sourceExample4: '"Hesaplanan: MOIC = X" (formül göster)',
    forbiddenPhrases: 'KESİNLİKLE YASAK İFADELER (OTOMATİK RED):',
    consultingModel: '"danışmanlık modeli" (gerçek proje isimlerini kullan)',
    digitalTransformation: '"dijital dönüşüm" (ne dönüştüğünü söyle)',
    scalable: '"ölçeklenebilir" (rakamla göster)',
    traditionalBusiness: '"geleneksel iş modeli" (gelir kalemlerini listele)',
    marketLeader: '"pazar lideri" (veri yok)',
    industryAverage: '"sektör ortalaması" (karşılaştırmalı veri yok)',
    marketBillion: '"Pazar $X milyar büyüklüğünde" (harici veri yok)',
    competitorDoing: '"Rakip şirket Y bunu yapıyor" (veri yok)',
    industryTrend: '"Sektör trendi Z yönünde" (veri yok)',
    geographicMarket: '"Kuzey Amerika/Avrupa/Asya pazarı..." (coğrafya verisi yok)',
    investorsGenerally: '"Yatırımcılar genellikle..." (genel varsayım)',
    integrationMention: '"SAP/Oracle entegrasyonu..." (teknik veri yok)',
    legalSetup: '"Delaware C-Corp kurulumu..." (yasal veri yok)',
    tamSamSom: '"$X milyar TAM/SAM/SOM" (pazar verisi yok)',
    externalReport: '"McKinsey/Gartner raporuna göre..." (harici kaynak yok)',
    noBulletWithoutNumber: 'Rakam olmayan bullet point (HER BULLET $ veya % İÇERMELİ)',
    allowedInferences: 'İZİN VERİLEN ÇIKARIMLAR:',
    financialRatioCalc: 'Verilen finansal oranlardan hesaplama',
    scenarioComparison: 'Senaryo A vs B karşılaştırması (verilen verilerden)',
    quarterlyTrend: 'Çeyreklik trend analizi (Q1→Q4 verilen verilerden)',
    dealMetricsCalc: 'Deal metrikleri (MOIC, IRR) hesabı (formülden)',
    breakEvenAnalysis: 'Break-even analizi (verilen verilerden)',
    userProjectGrowth: 'Kullanıcının girdiği proje açıklamalarına dayalı büyüme',
    crossAnalysis: 'Bilanço + Senaryo verilerinden çapraz analiz',
    confidenceRule: 'CONFIDENCE SCORE KURALI (ZORUNLU - SIKIŞTIRILMIŞ):',
    confidence90: '%90-100: SADECE direkt veri hesaplaması (örn: Current Ratio = 2.1)',
    confidence75: '%75-89: Veri bazlı çıkarım, varsayım YOK (örn: Burn rate → runway hesabı)',
    confidence60: '%60-74: Mantıksal tahmin - "⚠️ TAHMİN:" etiketi ZORUNLU',
    confidence50: '%50-59: Düşük güvenli tahmin - "❓ DÜŞÜK GÜVENLİ:" etiketi ZORUNLU',
    confidenceBelow50: '<%50: KULLANMA - belirsizlik çok yüksek, bu insight\'ı ÜRETME',
    confidenceDistribution: '⚠️ CONFIDENCE DAĞILIMI KURALI:',
    notAll85Plus: 'Tüm insights\'ların hepsi %85+ olamaz - bu gerçekçi değil',
    atLeastOne60to74: 'En az 1 insight %60-74 aralığında olmalı (belirsizlik kabul et)',
    realAnalysis: 'Gerçek analizlerde hep "kesin" sonuçlar olmaz',
    only90PlusForMath: '%90+ sadece matematiksel hesaplamalar için (oran, yüzde, toplam)',
    assumptionTransparency: 'VARSAYIM ŞEFFAFLIĞI (YENİ):',
    forEachInsight: 'Her insight için "assumptions" alanında:',
    specifyDataSource: 'Hangi veriye dayandığını belirt',
    listAssumptions: 'Hangi varsayımlar yapıldığını listele',
    validUnderCondition: '"Bu tahmin şu koşulda geçerli: ..." formatı kullan',
    
    // Scenario rules
    positiveVsNegative: 'POZİTİF VS NEGATİF KARŞILAŞTIRMA',
    successorProjection: 'ARDIŞIK YIL PROJEKSİYONU (BAŞARI HİKAYESİ)',
    yearOverYear: 'Yıllar arası karşılaştırma',
    scenarioAPositive: 'SENARYO A = POZİTİF SENARYO',
    scenarioBNegative: 'SENARYO B = NEGATİF SENARYO',
    higherNetProfit: 'Net kârı daha yüksek olan senaryo',
    growthTargetsMet: 'Büyüme hedeflerinin tuttuğu senaryo',
    targetScenario: '"Hedef Senaryo" olarak referans al',
    mainScenarioForInvestor: 'Yatırımcıya gösterilecek ana senaryo',
    withInvestmentScenario: 'YATIRIM ALIRSAK gerçekleşecek senaryo',
    lowerNetProfit: 'Net kârı daha düşük olan senaryo',
    pessimisticAssumptions: 'Kötümser varsayımlar, düşük gelir',
    riskScenario: '"Risk Senaryosu" olarak referans al',
    forDownsideRisk: 'Downside risk değerlendirmesi için',
    withoutInvestmentScenario: 'YATIRIM ALAMAZSAK gerçekleşecek senaryo',
    analysisFocus: 'ANALİZ ODAĞI:',
    ifPositiveHappens: 'Pozitif Senaryo (A) gerçekleşirse ne olur? → Ana hikaye (Yatırım alırsak)',
    ifNegativeHappens: 'Negatif Senaryo (B) gerçekleşirse ne olur? → Risk analizi (Yatırım alamazsak)',
    whatsDifference: 'Fark ne kadar? Risk ne kadar büyük? → Gap analizi = FIRSAT MALİYETİ / ZARAR',
    investmentComparison: 'YATIRIM SENARYO KARŞILAŞTIRMASI:',
    withInvestmentA: 'YATIRIM ALIRSAK (A): Hedef büyüme gerçekleşir, exit plan işler',
    withoutInvestmentB: 'YATIRIM ALAMAZSAK (B): Organik (düşük) büyüme, FIRSAT MALİYETİ = ZARAR',
    makeComparisonClear: 'Her analizde bu karşılaştırmayı NET olarak yap!',
    nextYearProjectionRule: 'GELECEK YIL PROJEKSİYON KURALI:',
    projectionBasedOnA: 'Simülasyon Yılı +1 projeksiyonu Pozitif Senaryo (A) baz alınarak yapılır',
    projection40to100: 'Projeksiyon = Senaryo A\'nın %40-100 büyümesi',
    
    // Successor projection specific
    notPositiveVsNegative: '⚠️ KRİTİK: Bu bir "pozitif vs negatif" karşılaştırması DEĞİL!',
    bothScenariosPositive: '🎯 HER İKİ SENARYO DA POZİTİF! Risk karşılaştırması YAPMA!',
    baseScenario: 'BAZ SENARYO (YATIRIM YILI):',
    thisYearInvestmentTarget: 'Bu yılın yatırım hedefi',
    growthWithInvestment: 'Yatırımla gerçekleşecek büyüme',
    allExitPlanBased: 'TÜM exit plan ve MOIC hesaplamaları BUNA DAYALI',
    pitchDeckTraction: 'Pitch deck\'in "traction" bölümü bu yılın verileri',
    futureProjection: 'GELECEK PROJEKSİYON (BÜYÜME YILI):',
    ifBaseSucceeds: 'Baz senaryo başarılı olursa sonraki yıl',
    growthContinuation: 'Büyümenin devamı ve hızlanması',
    notNegativePositive: '⚠️ NEGATİF SENARYO DEĞİL - POZİTİF GELİŞME!',
    globalExpansionYear: 'Global genişleme ve ölçekleme yılı',
    successorAnalysisFocus: 'ANALİZ ODAĞI:',
    ifWeReachTargets: 'hedeflerimize ulaşırsak...',
    whereCanWeGo: '\'de nereye varabiliriz?',
    growthMomentumAnalysis: 'Büyüme momentum analizi',
    bothPositiveOpportunity: 'İKİ SENARYO DA OLUMLU - Fırsat analizi yap, risk karşılaştırması DEĞİL!',
    noOpportunityCost: '"Opportunity cost" analizi YAPMA - bu zaten başarı hikayesi',
    pitchDeckFocus: 'PITCH DECK ODAĞI:',
    investmentYearData: '(yatırım yılı) verileri = "Traction" ve "Business Model" slaytları',
    growthYearData: '(büyüme yılı) verileri = "Growth Plan" ve "Financial Projection" slaytları',
    storyFormat: 'Hikaye: "Bu yıl $X yaparsak, gelecek yıl $Y olur"',
    exitPlanAndMoic: 'EXIT PLAN VE MOIC:',
    baseYearFor: 'Baz yıl =',
    moicCalculationsFrom: 'MOIC hesaplamaları',
    onlyShowAsUpside: 'sadece "upside potansiyeli" olarak göster',
    doNotUseSuccessor: 'KULLANMA (BU SENARYO TİPİ İÇİN):',
    negativeScenarioPhrase: '"Negatif senaryo" ifadesi',
    riskScenarioPhrase: '"Risk senaryosu" ifadesi',
    withoutInvestmentPhrase: '"Yatırım alamazsak" ifadesi',
    opportunityCostCalc: '"Fırsat maliyeti" hesabı',
    lossComparison: 'A vs B "kayıp" karşılaştırması',
    
    // Focus project rules
    investmentRevenuePipeline: '📊 1. INVESTMENT → REVENUE PIPELINE (Yatırımın Gelire Dönüşümü):',
    formula: 'FORMÜL:',
    productInvestmentFormula: 'Product_Investment = Total_Investment × Product_Ratio',
    revenueUpliftFormula: 'Revenue_Uplift = Product_Investment × Revenue_Multiplier',
    growthRateFormula: 'Growth_Rate = Revenue_Uplift / Current_Revenue',
    revenueMultiplier: 'REVENUE MULTIPLIER (Sektöre Göre):',
    saasMultiplier: 'SaaS/Yazılım (ölçeklenebilir): 2.0x - 2.5x',
    consultingMultiplier: 'Danışmanlık (insan bağımlı): 1.2x - 1.5x',
    productMultiplier: 'Ürün/Lisans: 1.8x - 2.2x',
    exampleCalculation: 'ÖRNEK HESAPLAMA:',
    nonFocusRule: '📉 2. NON-FOCUS ORGANİK BÜYÜME KURALI:',
    sinceInvestmentFocused: '⚠️ Yatırım odak projelere yönlendirildiğinden:',
    focusProjects: 'ODAK PROJELER: Yukarıdaki formülle hesaplanan büyüme',
    otherProjects: 'DİĞER PROJELER: ORGANİK BÜYÜME oranı uygulanır',
    organicGrowthOptions: 'ORGANİK BÜYÜME SEÇENEKLERİ:',
    zeroDefault: '%0 (Varsayılan): Tam izolasyon - yatırım etkisi net görünür',
    fivePercent: '%5: Minimal organik büyüme (enflasyon + doğal büyüme)',
    eightToTen: '%8-10: Orta organik büyüme (mevcut müşteri genişlemesi)',
    twelveToFifteen: '%12-15: Güçlü organik büyüme (olgun ürünler)',
    useOrganicRate: '⚠️ focusProjectInfo.organicGrowthRate değeri varsa KULLAN, yoksa %0 uygula.',
    whyOrganicGrowth: 'NEDEN ORGANİK BÜYÜME?',
    realism: '1. Gerçekçilik: Hiçbir proje tam olarak %0 büyümez',
    existingCustomers: '2. Mevcut müşteri genişlemesi yatırım olmadan da olur',
    investorConfidence: '3. Yatırımcı güveni: Abartılı olmayan projeksiyonlar',
    jCurveEffect: '📈 3. J-CURVE EFFECT (Sektöre Göre Zamanlama):',
    dontDistributeLinear: 'Büyümeyi çeyreklere lineer dağıtma! Sektöre göre farklı J-Curve uygula:',
    saasDefault: '🔷 SaaS / YAZILIM (Varsayılan):',
    q1Effect: 'Q1: %10 etki (ürün geliştirme, beta)',
    q2Effect: 'Q2: %25 etki (ilk müşteriler)',
    q3Effect: 'Q3: %65 etki (momentum)',
    q4Effect: 'Q4: %100 etki (tam ölçek)',
    consultingService: '🔶 DANIŞMANLIK / HİZMET:',
    q1Consulting: 'Q1: %20 etki (ekip kurulumu, ilk projeler)',
    q2Consulting: 'Q2: %45 etki (referanslar oluşuyor)',
    q3Consulting: 'Q3: %75 etki (pipeline doluyor)',
    q4Consulting: 'Q4: %100 etki (tam kapasite)',
    productLicense: '🔹 ÜRÜN / LİSANS:',
    q1Product: 'Q1: %5 etki (üretim hazırlığı)',
    q2Product: 'Q2: %15 etki (ilk satışlar)',
    q3Product: 'Q3: %50 etki (dağıtım kanalları)',
    q4Product: 'Q4: %100 etki (pazar penetrasyonu)',
    ecommerce: '🔸 E-TİCARET:',
    q1Ecommerce: 'Q1: %25 etki (kampanya başlangıcı)',
    q2Ecommerce: 'Q2: %40 etki (müşteri kazanımı)',
    q3Ecommerce: 'Q3: %60 etki (tekrar satışlar)',
    q4Ecommerce: 'Q4: %100 etki (sezon + tam ölçek)',
    sectorDetection: '⚠️ Sektör belirleme: Gelir kalemlerinin isimlerine bak (SaaS, Tracker, Platform = SaaS; Denetim, Danışmanlık = Hizmet)',
    operatingLeverage: '📊 4. OPERATING LEVERAGE (Gider Modeli):',
    revenueUp50: 'Gelir %50 artarsa, giderler %50 artmamalı!',
    fixedExpenses: 'SABİT GİDERLER (Kira, Sunucu, Lisans): %5-10 artış (enflasyon)',
    variableExpenses: 'DEĞİŞKEN GİDERLER (Personel, Pazarlama): Gelir artışı × 0.4-0.6',
    targetMargin: 'HEDEF: Kâr marjının iyileşmesi (Margin Expansion)',
    noMarginNote: 'NOT: Margin expansion olmayan büyüme, yatırımcı için değersizdir.',
    ifNoData: '5. VERİ YOKSA:',
    selectHighestGrowth: 'Kullanıcı odak proje belirtmediyse, en yüksek büyüme potansiyeli olan gelir kalemini seç',
    identifyBiggestDiff: 'Senaryo A vs B arasındaki en büyük farkı yaratan kalemi belirle',
    
    // Master prompt sections
    singleTask: '🎯 TEK GÖREV: Sana verilen TÜM finansal verileri (Geçmiş Bilanço + Mevcut Senaryolar + Yatırım Anlaşması + Profesyonel Analiz Verileri) analiz edip, hem OPERASYONEL İÇGÖRÜLER hem de YATIRIMCI SUNUMU hazırla.',
    projectionYearRule: '📅 PROJECTION YEAR RULE - KRİTİK!',
    projectionYearCalc: 'next_year_projection.projection_year hesaplama kuralı:',
    projectionFormula: 'projection_year = max(Scenario_A_Year, Scenario_B_Year) + 1',
    examples: 'ÖRNEKLER:',
    example2028vs2027: '2028 vs 2027 karşılaştırması → projection_year = 2029',
    example2027vs2026: '2027 vs 2026 karşılaştırması → projection_year = 2028',
    example2026vs2026: '2026 vs 2026 karşılaştırması → projection_year = 2027',
    summaryWarning: '⚠️ summary.total_revenue ve summary.total_expenses değerleri, projection_year YILI için projeksiyonlar olmalı, mevcut senaryo değerleri DEĞİL!',
    dataPackage: '📥 SANA VERİLEN VERİ PAKETİ:',
    dataItem1: '1. GEÇMİŞ YIL BİLANÇOSU: Nakit, Alacaklar, Borçlar, Özkaynak (şirketin nereden geldiğini gösterir)',
    dataItem2: '2. SENARYO VERİLERİ: A (Pozitif) vs B (Negatif) tam karşılaştırması + kalem bazlı gelir/gider detayları',
    dataItem3: '3. ÇEYREKSEL PERFORMANS: Q1-Q4 nakit akış detayları',
    dataItem4: '4. DEAL CONFIG: Kullanıcının belirlediği yatırım tutarı, hisse oranı, sektör çarpanı',
    dataItem5: '5. HESAPLANMIŞ ÇIKIŞ PLANI: Post-Money Değerleme, MOIC (3Y/5Y), Break-Even Year',
    dataItem6: '6. DEATH VALLEY ANALİZİ: Kritik çeyrek, aylık burn rate, runway',
    dataItem7: '7. FİNANSAL ORANLAR: Likidite, Karlılık, Borçluluk oranları + Sektör Benchmark',
    dataItem8: '8. KALEM BAZLI TREND: Her gelir/gider kalemi için Q1→Q4 trend, volatilite, konsantrasyon',
    dataItem9: '9. DUYARLILIK ANALİZİ: Gelir %±20 değişiminin kâr, değerleme, MOIC, runway\'e etkisi',
    dataItem10: '10. BREAK-EVEN ANALİZİ: Aylık kümülatif gelir/gider ve break-even noktası',
    dataItem11: '11. **ODAK PROJE (varsa)**: Kullanıcının seçtiği ana yatırım projesi ve büyüme planı',
    professionalStandards: '🔬 PROFESYONEL ANALİZ STANDARTLARI (Investment Banking Seviyesi):',
    itemizedDeepAnalysis: '1. KALEM BAZLI DERİN ANALİZ:',
    forEachItem: 'Her gelir/gider kalemi için şunları belirt:',
    q1q4Trend: 'Q1→Q4 trend yönü ve büyüme oranı (% cinsinden) [VERİDEN]',
    volatilityLevel: 'Volatilite seviyesi: Düşük (<20%), Orta (20-50%), Yüksek (>50%) [HESAPLA]',
    shareInTotal: 'Toplam içindeki pay ve konsantrasyon riski (%30+ = ⚠️ Uyarı, %50+ = 🔴 Kritik) [VERİDEN]',
    rootCauseDiff: 'Senaryo A vs B farkının kök nedeni [KARŞILAŞTIR]',
    ratioInterpretation: '2. FİNANSAL ORAN YORUMLAMA (Benchmark ile):',
    compareToBenchmark: 'Sana verilen finansal oranları sektör ortalaması ile karşılaştır:',
    currentRatioBench: 'Current Ratio: 1.8+ (İyi) | 1.3-1.8 (Orta) | <1.3 (Dikkat)',
    netProfitMarginBench: 'Net Profit Margin: %18+ (İyi) | %12-18 (Orta) | <%12 (Dikkat)',
    debtEquityBench: 'Debt/Equity: <0.5 (İyi) | 0.5-1.0 (Orta) | >1.0 (Dikkat)',
    receivablesAssetBench: 'Alacak/Varlık: <%20 (İyi) | %20-30 (Orta) | >%30 (Tahsilat Riski)',
    sensitivityInterpretation: '3. DUYARLILIK ANALİZİ YORUMU:',
    whenRevenue20Down: 'Gelir %20 düştüğünde:',
    howProfitAffected: 'Kâr nasıl etkilenir? [HESAPLA]',
    doesBreakEvenShift: 'Break-even noktası kayar mı? [HESAPLA]',
    howManyMonthsRunway: 'Runway kaç ay kalır? [HESAPLA]',
    mostCriticalVariable: 'EN KRİTİK DEĞİŞKEN hangisi?',
    confidenceRequired: '4. CONFIDENCE SCORE ZORUNLULUĞU:',
    forEachInsightReq: 'Her insight için:',
    confidenceScore0to100: 'confidence_score: 0-100 arası',
    listAssumptionsMade: 'Varsayımları listele',
    showSupportingData: 'Destekleyen veri noktalarını göster',
    
    // Section titles
    section1Financial: '📊 BÖLÜM 1: FİNANSAL ANALİZ (AI Analiz Sekmesi İçin)',
    section1Output: 'Bu bölümde şu çıktıları üret:',
    insights5to7: '5-7 kritik insight (kategori: revenue/profit/cash_flow/risk/efficiency/opportunity)',
    eachInsightConfidence: 'HER insight için confidence_score (0-100) ZORUNLU',
    eachInsightSource: 'HER insight için veri kaynağını belirt',
    recommendations3to5: '3-5 stratejik öneri (öncelik sıralı, aksiyon planlı)',
    quarterlyAnalysis: 'Çeyreklik analiz (kritik dönemler, büyüme eğilimi)',
    
    section2Deal: '💼 BÖLÜM 2: DEAL DEĞERLENDİRME (Yatırımcı Gözüyle)',
    valuationTransparency: '📊 VALUATION HESAPLAMA ŞEFFAFLIĞI (ZORUNLU):',
    showFormulaForEach: 'Her değerleme için FORMÜLÜ GÖSTER:',
    preMoneyFormula: '1. Pre-Money Valuation:',
    preMoneyExample: 'Formül: Pre-Money = (Investment / Equity%) - Investment',
    postMoneyFormula: '2. Post-Money Valuation:',
    postMoneyExample: 'Formül: Post-Money = Investment / Equity%',
    revenueMultipleFormula: '3. Revenue Multiple:',
    revenueMultipleExample: 'Formül: Valuation = Revenue × Sector_Multiple',
    moicFormula: '4. MOIC Hesabı:',
    moicExample: 'Formül: MOIC = Exit_Value × Equity% / Investment',
    backEveryNumber: '⚠️ HER RAKAMI FORMÜLLE DESTEKLE - "Değerleme $X" yerine "Değerleme = Gelir × Çarpan = $Y × Zx = $X"',
    dealOutput: 'ÇIKTI:',
    dealScoreOutput: 'deal_score: 1-10 arası puan + HESAPLAMA FORMÜLÜ (örn: "7/10 = (MOIC×2 + Margin×3 + Growth×2 + Risk×3) / 10")',
    valuationVerdictOutput: 'valuation_verdict: "premium" / "fair" / "cheap" + NEDEN',
    investorAttractivenessOutput: 'investor_attractiveness: 2 cümlelik yorum',
    riskFactorsOutput: 'risk_factors: 3-5 risk (VERİDEN türet, UYDURMA)',
    
    section3Pitch: '🎤 BÖLÜM 3: PITCH DECK SLAYTLARI (10 SLAYT - STARTUP KURUCUSU TONU)',
    criticalNumbers: '⚠️ KRİTİK: HER SLAYT SPESİFİK RAKAMLAR VE PROJE İSİMLERİ İÇERMELİ!',
    generate10Slides: '10 slaytlık yatırımcı sunumu üret. Her slayt tek bir mesaj verir, rakamlarla destekler.',
    languageAndTone: 'DİL VE TON:',
    speakAsFounder: 'Startup kurucusu gibi konuş, finans analisti gibi DEĞİL',
    confidentRealistic: 'Özgüvenli ama gerçekçi - "Biz" dili kullan',
    numbersSupport: 'Rakamlar hikayeyi destekler, hikaye rakamları değil',
    exciteInvestor: 'Yatırımcıyı heyecanlandır ama abartma',
    forEachSlide: 'Her slayt için:',
    titleMax8: 'title: Çarpıcı başlık (max 8 kelime)',
    keyMessageWithNumber: 'key_message: Ana mesaj (tek cümle) - RAKAM DAHİL ($X, %Y formatında)',
    contentBullets: 'content_bullets: 3-4 madde - HER MADDE $ veya % FORMATINDA RAKAM İÇERMELİ',
    speakerNotesMax80: 'speaker_notes: Konuşma metni (MAX 80 KELİME!) - samimi startup dili',
    speakerNotesRule: '⚠️ SPEAKER NOTES KURALI:',
    max80Words: 'Maksimum 80 kelime (30-45 saniye konuşma)',
    noTechJargon: 'Teknik jargon kullanma',
    catchInvestorAttention: 'Yatırımcının dikkatini çekecek kısa, vurucu cümleler',
    atLeast1Number: 'Her notta EN AZ 1 rakam olmalı',
    slideStructure: 'SLAYT YAPISI (10 SLAYT):',
    slide1Problem: '1️⃣ PROBLEM',
    slide2Solution: '2️⃣ ÇÖZÜM: [ODAK PROJE ADI]',
    slide3Market: '3️⃣ PAZAR FIRSATI',
    slide4BusinessModel: '4️⃣ İŞ MODELİ',
    slide5Traction: '5️⃣ TRACTION (Bugüne Kadar)',
    slide6GrowthPlan: '6️⃣ BÜYÜME PLANI (Yatırımla)',
    slide7UseOfFunds: '7️⃣ USE OF FUNDS',
    slide8Financials: '8️⃣ FİNANSAL PROJEKSİYON',
    slide9Team: '9️⃣ EKİP',
    slide10TheAsk: '🔟 THE ASK',
    forbidden: '🚫 YASAK:',
    forbiddenAnalystLang: 'Finans analisti dili ("gelir konsantrasyonu", "organik büyüme sınırı" gibi)',
    forbiddenGeneral: 'Genel ifadeler ("ölçeklenebilir", "inovatif", "dijital dönüşüm")',
    forbiddenNoBullets: 'Rakam olmayan maddeler',
    required: '✅ ZORUNLU:',
    requiredFounderTone: 'Startup kurucusu tonu',
    requiredEveryBullet: 'Her bullet\'ta $ veya % formatında rakam',
    requiredProjectName: 'Odak proje ismi başlıklarda (varsa)',
    requiredSpeakerNotes: 'Speaker notes\'ta samimi, ikna edici açıklama',
    
    section4Projection: '📈 BÖLÜM 4: GELECEK YIL PROJEKSİYONU (Simülasyon Yılı +1)',
    criticalPositiveBase: '⚠️ KRİTİK: HER ZAMAN POZİTİF SENARYO (A) BAZ ALINIR!',
    projectionRules: '🎯 PROJEKSİYON KURALLARI:',
    baseEqualsA: '1. Base = Senaryo A\'nın yıl sonu değerleri',
    growth40to100: '2. Büyüme = %40-100 arası (yatırım etkisi)',
    everyQRevenue: '3. Her çeyrek için gelir > 0, gider > 0',
    q3q4Positive: '4. Q3-Q4\'te nakit akışı POZİTİFE dönmeli',
    netProfitPositive: '5. Net kâr pozitif veya break-even yakını olmalı',
    itemizedProjection: '📊 KALEM BAZLI PROJEKSİYON (BİLİMSEL MODEL):',
    focusProjectCalc: '🎯 ODAK PROJE HESAPLAMASI:',
    step1: 'Adım 1: Investment_Product = Total_Investment × Product_Ratio (genellikle %40)',
    step2: 'Adım 2: Revenue_Uplift = Investment_Product × Multiplier (SaaS:2.0, Service:1.3, Ürün:1.8)',
    step3: 'Adım 3: Growth = Revenue_Uplift / Current_Revenue',
    nonFocusRuleUpdated: '📉 NON-FOCUS KURALI (GÜNCELLENDİ):',
    nonFocusOrganicRate: 'Odak OLMAYAN projeler: focusProjectInfo.organicGrowthRate değeri uygulanır',
    ifNotSpecified: 'Eğer organicGrowthRate belirtilmemişse: %0 büyüme (tam izolasyon)',
    exampleOrganicRate: 'Örnek: organicGrowthRate = 5 ise, non-focus projeler %5 büyüme alır',
    jCurveQuarterly: '⏱️ J-CURVE (Çeyreklik Dağılım):',
    q1Yearly10: 'Q1: Yıllık büyümenin %10\'u (hazırlık dönemi)',
    q2Yearly25: 'Q2: Yıllık büyümenin %25\'i (ilk traction)',
    q3Yearly65: 'Q3: Yıllık büyümenin %65\'i (momentum)',
    q4Yearly100: 'Q4: Yıllık büyümenin %100\'ü (tam ölçek)',
    expenseModel: '📊 GİDER MODELİ (Operating Leverage):',
    fixedExpenses5to10: 'Sabit giderler: %5-10 artış (enflasyon etkisi)',
    variableExpenses05: 'Değişken giderler: Gelir artışı × 0.5 (margin expansion)',
    investmentDirect: 'Yatırım doğrudan etkisi: Personel + Pazarlama budgets',
    
    section5Executive: '📧 BÖLÜM 5: EXECUTIVE SUMMARY (YAPILANDIRILMIŞ FORMAT - ZORUNLU)',
    criticalObject: '⚠️ KRİTİK: Executive summary bir OBJE olmalı, düz metin DEĞİL!',
    shortPitch150: '1️⃣ short_pitch (150 kelime): Yatırımcı özeti',
    revenueItemsReq: '2️⃣ revenue_items (zorunlu): Top gelir kalemleri listesi',
    scenarioCompReq: '3️⃣ scenario_comparison (zorunlu): A vs B karşılaştırması',
    investmentImpactReq: '4️⃣ investment_impact (zorunlu): Yatırım alamazsak ne olur',
    
    doNot: '🚫 YAPMA:',
    doNotGeo: 'Coğrafi tahminler (Kuzey Amerika, Avrupa vb.)',
    doNotMarketSize: 'Pazar büyüklüğü rakamları',
    doNotCompetitor: 'Rakip şirket isimleri',
    doNotTech: 'Teknoloji/entegrasyon tahminleri',
    doNotLegal: 'Yasal yapı önerileri',
    doNotExternal: 'Harici kaynak referansları',
    
    doThis: '✅ YAP:',
    doAnalyzeData: 'Sadece verilen verilerden analiz',
    doSourceNumbers: 'Her rakamın kaynağını belirt',
    doConfidenceScore: 'Confidence score ver',
    doScenarioRef: 'Senaryo A = Pozitif, B = Negatif olarak referans al',
    doProjectionBase: 'Gelecek yıl projeksiyonunu Senaryo A baz alarak yap',
    
    language: 'DİL: Profesyonel Türkçe',
    languageVC: ', VC terminolojisine hakim.',
    
    // User prompt section headers
    historicalBalanceSection: 'GEÇMİŞ YIL BİLANÇOSU',
    cashPosition: '💰 NAKİT POZİSYONU:',
    cashOnHand: 'Kasa:',
    bank: 'Banka:',
    totalLiquidAssets: 'Toplam Likit Varlık:',
    receivablesPayables: '📊 ALACAK/BORÇ DURUMU:',
    tradeReceivables: 'Ticari Alacaklar:',
    tradePayables: 'Ticari Borçlar:',
    netWorkingCapital: 'Net Çalışma Sermayesi:',
    assetsLiabilities: '🏢 VARLIK/YÜKÜMLÜLÜK:',
    totalAssets: 'Toplam Varlıklar:',
    totalLiabilities: 'Toplam Yükümlülükler:',
    totalEquity: 'Toplam Özkaynak:',
    profitCapital: '📈 KAR/SERMAYE:',
    periodNetProfit: 'Dönem Net Kârı:',
    retainedEarnings: 'Geçmiş Yıllar Kârı:',
    paidCapital: 'Ödenmiş Sermaye:',
    bankLoans: 'Banka Kredileri:',
    howToUseData: '🔍 BU VERİYİ ŞÖYLE KULLAN:',
    receivablesToAssets: 'Alacak/Toplam Varlık oranı',
    ifAbove30Collection: '- %30\'dan yüksekse tahsilat sorunu var',
    bankLoansToAssets: 'Banka Kredisi/Varlık oranı',
    debtRiskAnalysis: '- borçluluk riski analiz et',
    retainedEarningsStatus: 'Geçmiş Yıllar Kârı',
    negativeRecovery: 'NEGATİF - Kurtarma Modu',
    positiveHealthy: 'POZİTİF - Sağlıklı',
    compareGrowthTargets: '4. Bu yılki büyüme hedeflerini geçmiş yıl performansıyla karşılaştır',
    noHistoricalBalance: '⚠️ GEÇMİŞ YIL BİLANÇOSU MEVCUT DEĞİL',
    analyzeOnlyScenario: 'Analizi sadece senaryo verileriyle yap, ancak bilanço verisi olmadan tam risk analizi yapılamayacağını belirt.',
    scenarioDataSection: 'SENARYO VERİLERİ:',
    targetYear: 'Hedef Yıl:',
    totalRevenue: 'Toplam Gelir:',
    totalExpenses: 'Toplam Gider:',
    netProfit: 'Net Kâr:',
    profitMargin: 'Kâr Marjı:',
    quarterlyNet: 'Çeyreklik Net:',
    dealConfigSection: 'DEAL CONFIG (Kullanıcı Girişi):',
    requestedInvestment: 'Talep Edilen Yatırım:',
    offeredEquity: 'Teklif Edilen Hisse:',
    sectorMultiple: 'Sektör Çarpanı:',
    safetyMargin: 'Güvenlik Marjı:',
    calculatedExitPlan: 'HESAPLANMIŞ EXIT PLANI',
    basedOnPositive: '(POZİTİF SENARYO):',
    postMoneyValuation: 'Post-Money Değerleme:',
    yearInvestorShare: 'Yatırımcı Payı:',
    moic: 'MOIC',
    breakEvenYear: 'Break-Even Yılı:',
    fiveYearProjectionDetails: '📊 5 YILLIK FİNANSAL PROJEKSİYON DETAYLARI (HESAPLANMIŞ):',
    year: 'Yıl',
    aggressiveGrowth: 'Agresif Büyüme',
    normalizedGrowth: 'Normalize Büyüme',
    stage: 'Aşaması',
    revenue: 'Gelir:',
    expenses: 'Gider:',
    ebitda: 'EBITDA:',
    margin: 'Marj:',
    freeCashFlow: 'Serbest Nakit Akışı (FCF):',
    appliedGrowthRate: 'Uygulanan Büyüme Oranı:',
    valuationMethods: 'DEĞERLEME METODLARI:',
    revenueMultiple: 'Ciro Çarpanı',
    ebitdaMultiple: 'EBITDA Çarpanı:',
    dcfDiscount: 'DCF (%30 iskonto):',
    vcMethod: 'VC Metodu (10x ROI):',
    weightedValuation: '⭐ AĞIRLIKLI DEĞERLEME:',
    valuationMethodology: '💰 DEĞERLEME METODOLOJİSİ:',
    revenueMultipleWeight: '1. CİRO ÇARPANI (%30 Ağırlık): Gelir × Sektör Çarpanı',
    ebitdaMultipleWeight: '2. EBITDA ÇARPANI (%25 Ağırlık): EBITDA × EBITDA Çarpanı (SaaS:15x, E-ticaret:8x)',
    dcfWeight: '3. DCF (%30 Ağırlık): 5 yıllık FCF NPV + Terminal Value (%30 iskonto, %3 terminal)',
    vcMethodWeight: '4. VC METODU (%15 Ağırlık): 5. Yıl Değerleme ÷ 10x ROI',
    valuationAnalysisInstructions: '🔍 DEĞERLEME ANALİZ TALİMATLARI:',
    weightedFormula: '1. AĞIRLIKLI değerleme = (Ciro×0.30) + (EBITDA×0.25) + (DCF×0.30) + (VC×0.15)',
    useYear5Weighted: '2. Pitch deck\'te 5. yıl ağırlıklı değerlemeyi kullan - UYDURMA değil HESAPLANMIŞ',
    ebitdaMarginTrend: '3. EBITDA marjı trendi: İlk yıllardan son yıllara nasıl değişiyor?',
    dcfVsRevenueMultiple: '4. DCF vs Revenue Multiple farkını yorumla - hangisi daha güvenilir?',
    vcMethodRealistic: '5. VC metodunun gerçekçiliğini değerlendir (10x ROI makul mü?)',
    getAllValuations: '6. HER değerleme rakamını bu bölümden al, UYDURMA',
    deathValleyAnalysis: 'DEATH VALLEY ANALİZİ (POZİTİF SENARYO BAZLI):',
    criticalQuarter: 'Kritik Çeyrek:',
    minCumulativeCash: 'Minimum Kümülatif Nakit:',
    calculatedRequiredInvestment: 'Hesaplanan Gereken Yatırım:',
    monthlyBurnRate: 'Aylık Burn Rate:',
    runway: 'Runway:',
    months: 'ay',
    selfSustaining: 'Kendi Kendini Finanse Edebilir mi:',
    yes: 'Evet',
    no: 'Hayır',
    yearStructureRoles: '📅 YIL YAPISI VE SENARYO ROLLERİ',
    scenarioType: '🔍 SENARYO TİPİ:',
    timeline: '🗓️ ZAMAN ÇİZELGESİ:',
    base: 'Base',
    completedYear: 'Tamamlanan yıl - Gerçek finansallar',
    baseYearLabel: 'Baz Yıl',
    investmentTarget: 'Yatırım hedefi',
    future: 'Gelecek',
    successProjection: 'Başarı projeksiyonu',
    year1: 'Year 1',
    scenarioYear: 'Senaryo yılı - Pozitif/Negatif hedef',
    year2: 'Year 2',
    firstProjectionYear: 'İlk projeksiyon yılı',
    year3Plus: 'Year 3+',
    moic3YearPoint: '3 Yıllık MOIC hesaplama noktası',
    year5Plus: 'Year 5+',
    moic5YearPoint: '5 Yıllık MOIC hesaplama noktası',
    scenarioRoles: '🎯 SENARYO TANIMLARI:',
    investmentYear: 'yılı HEDEFİ (yatırım alırsak)',
    dashboardFocused: 'TÜM DASHBOARD VE ANALİZLER BUNA ODAKLI',
    exitPlanMoicBased: 'Exit Plan, MOIC, Pitch Deck bu senaryoya dayalı',
    riskScenarioLabel: 'yılı RİSK senaryosu (yatırım alamazsak)',
    onlyForRiskDownside: 'SADECE risk analizi ve downside değerlendirmesi için',
    criticalInstructions: '⚠️ KRİTİK TALİMATLAR:',
    allProjectionsBased: '1. Tüm projeksiyon hesaplamaları POZİTİF SENARYO (A) verilerine dayalı',
    moic3YearBased: '2. MOIC 3 Yıl =',
    moic5YearBased: '3. MOIC 5 Yıl =',
    useSpecificYears: '4. Pitch deck\'te SPESİFİK YILLARI kullan (örn: "',
    valuation: 'değerleme")',
    refNegativeAs: '5. Negatif senaryoyu "Yatırım alamazsak senaryosu" olarak referans ver',
    nextYearProjectionEquals: '6. Gelecek yıl projeksiyonu =',
    revenueExpenseDetails: 'GELİR/GİDER DETAYLARI:',
    scenarioARevenues: 'Senaryo A Gelirleri:',
    scenarioAExpenses: 'Senaryo A Giderleri:',
    scenarioBRevenues: 'Senaryo B Gelirleri:',
    scenarioBExpenses: 'Senaryo B Giderleri:',
    quarterlyItemizedDetails: 'ÇEYREKLİK BAZDA GELİR/GİDER DETAYLARI:',
    scenarioAQuarterlyRevenues: 'SENARYO A - ÇEYREKLİK GELİRLER:',
    scenarioBQuarterlyRevenues: 'SENARYO B - ÇEYREKLİK GELİRLER:',
    scenarioDiffRevenues: 'SENARYO FARKLARI - GELİR KALEMLERİ:',
    scenarioDiffExpenses: 'SENARYO FARKLARI - GİDER KALEMLERİ:',
    total: 'Toplam',
    diff: 'Fark',
    totalDiff: 'Toplam Fark',
    currencyInfo: '💱 PARA BİRİMİ BİLGİSİ:',
    allValuesNormalized: 'TÜM DEĞERLER USD CİNSİNDEN NORMALİZE EDİLMİŞTİR',
    balanceConverted: 'Bilanço verileri TL\'den dönüştürülmüştür (Ortalama Kur:',
    tlUsd: 'TL/USD)',
    scenarioAlreadyUsd: 'Senaryo verileri zaten USD cinsindedir',
    comparisonsHomogeneous: 'Karşılaştırmalar homojen para birimi üzerinden yapılmalıdır',
    focusProjectInfo: '🎯 ODAK PROJE BİLGİSİ (KULLANICI SEÇTİ):',
    selectedFocusProjects: 'Seçilen Odak Proje(ler):',
    projectDescription: '📝 Proje Açıklaması/Notları (Kullanıcı Girişi):',
    organicGrowthRate: 'Odak Olmayan Projeler için Organik Büyüme Oranı:',
    growthPlan: '📈 BÜYÜME PLANI (Kullanıcı Girişi):',
    notSpecifiedAiSuggest: 'Belirtilmedi - AI en mantıklı büyüme stratejisini önersin',
    investmentDistribution: '💵 YATIRIM DAĞILIMI (Kullanıcı Tercihi):',
    productDevelopment: 'Ürün Geliştirme:',
    marketing: 'Pazarlama:',
    personnel: 'Personel:',
    operations: 'Operasyon:',
    analysisInstruction: '🔍 ANALİZ TALİMATI:',
    presentAsGrowthEngine: '1. Pitch deck\'te bu proje(leri) ana büyüme motoru olarak sun',
    createUseOfFunds: '2. Yatırım dağılımına göre "Use of Funds" slaytını oluştur (spesifik $ tutarları ile)',
    includeGrowthPlan: '3. Büyüme planını speaker notes\'a dahil et',
    everySlideKeyMessage: '4. Her slaytın key_message\'ında proje ismi ve $ rakamı olsun',
    highlightInExecutive: '5. Executive summary\'de odak proje(leri) vurgula',
    noFocusProjectSpecified: '⚠️ ODAK PROJE BELİRTİLMEDİ',
    userDidntSelectFocus: 'Kullanıcı odak proje seçmedi. Analiz yaparken:',
    autoSelectHighestGrowth: '1. En yüksek büyüme potansiyeli olan gelir kalemini otomatik seç',
    identifyBiggestDiffItem: '2. Senaryo A vs B arasındaki en büyük farkı yaratan kalemi belirle',
    useAsGrowthStory: '3. Bu kalemi ana büyüme hikayesi olarak kullan',
    userEdits: '📝 KULLANICI DÜZENLEMELERİ (Önceki Analiz Sonrası):',
    userMadeChanges: 'Kullanıcı AI tarafından önerilen projeksiyon tablolarında değişiklik yaptı.',
    updateAnalysisWithChanges: 'Bu değişiklikleri dikkate alarak analizi güncelle.',
    editedRevenueProjection: 'Düzenlenmiş Gelir Projeksiyonu (Sonraki Yıl):',
    noRevenueEdit: 'Gelir düzenlemesi yok',
    editedExpenseProjection: 'Düzenlenmiş Gider Projeksiyonu (Sonraki Yıl):',
    noExpenseEdit: 'Gider düzenlemesi yok',
    userEdited: '[KULLANICI DÜZENLEDİ]',
    editAnalysisInstruction: '🔍 ANALİZ TALİMATI:',
    validateChanges: '1. Kullanıcının yaptığı değişiklikleri doğrula ve mantıklı olup olmadığını değerlendir',
    ifChangesAffectTotals: '2. Değişiklikler toplam rakamları etkileyecekse, bunu insights ve pitch deck\'e yansıt',
    indicateAggressiveConservative: '3. Kullanıcının değişiklikleri agresif/konservatif mi belirt',
    analyzeAllData: 'Tüm bu verileri (özellikle geçmiş yıl bilançosunu, çeyreklik kalem bazlı verileri ve ODAK PROJE bilgisini) analiz et ve yukarıdaki 5 bölümün hepsini içeren yapılandırılmış çıktı üret.',
    languageInstruction: '🌐 DİL TALİMATI:',
    allContentMustBe: 'Tüm insights, recommendations, pitch deck slaytları ve strateji notları',
  }
};

// =====================================================
// UNIFIED ANALYSIS TOOL SCHEMA (Primary Model - Gemini)
// =====================================================
const getUnifiedAnalysisToolSchema = () => ({
  type: "function",
  function: {
    name: "generate_unified_analysis",
    description: "Generate comprehensive unified analysis with all 5 sections",
    parameters: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          description: "5-7 critical financial insights",
          items: {
            type: "object",
            properties: {
              category: { type: "string", description: "One of: revenue, profit, cash_flow, risk, efficiency, opportunity" },
              severity: { type: "string", description: "One of: critical, high, medium" },
              title: { type: "string" },
              description: { type: "string" },
              impact_analysis: { type: "string" },
              data_points: { type: "array", items: { type: "string" } }
            }
          }
        },
        recommendations: {
          type: "array",
          description: "3-5 strategic recommendations",
          items: {
            type: "object",
            properties: {
              priority: { type: "number", description: "1, 2, or 3" },
              title: { type: "string" },
              description: { type: "string" },
              action_plan: { type: "array", items: { type: "string" } },
              expected_outcome: { type: "string" },
              risk_mitigation: { type: "string" },
              timeframe: { type: "string" }
            }
          }
        },
        quarterly_analysis: {
          type: "object",
          properties: {
            overview: { type: "string" },
            critical_periods: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  quarter: { type: "string" },
                  reason: { type: "string" },
                  risk_level: { type: "string", description: "One of: high, medium, low" }
                }
              }
            },
            seasonal_trends: { type: "array", items: { type: "string" } },
            cash_burn_warning: { type: "string" },
            growth_trajectory: { type: "string" },
            winner_by_quarter: {
              type: "object",
              properties: {
                q1: { type: "string" },
                q2: { type: "string" },
                q3: { type: "string" },
                q4: { type: "string" }
              }
            }
          }
        },
        deal_analysis: {
          type: "object",
          description: "CRITICAL: Include formula transparency for deal_score calculation",
          properties: {
            deal_score: { type: "number", description: "Score from 1 to 10. MUST show calculation formula in deal_score_formula field" },
            deal_score_formula: { type: "string", description: "REQUIRED: Show exact calculation." },
            score_components: {
              type: "object",
              properties: {
                moic_score: { type: "number" },
                margin_score: { type: "number" },
                growth_score: { type: "number" },
                risk_score: { type: "number" }
              }
            },
            valuation_verdict: { type: "string", description: "One of: premium, fair, cheap" },
            investor_attractiveness: { type: "string" },
            risk_factors: { type: "array", items: { type: "string" } }
          },
          required: ["deal_score", "deal_score_formula", "valuation_verdict", "investor_attractiveness", "risk_factors"]
        },
        pitch_deck: {
          type: "object",
          description: "CRITICAL: Every slide MUST contain $ amounts and % figures.",
          properties: {
            slides: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slide_number: { type: "number" },
                  title: { type: "string" },
                  key_message: { type: "string" },
                  content_bullets: { type: "array", items: { type: "string" } },
                  speaker_notes: { type: "string" }
                }
              }
            },
            executive_summary: {
              type: "object",
              properties: {
                short_pitch: { type: "string" },
                revenue_items: { type: "string" },
                scenario_comparison: { type: "string" },
                investment_impact: { type: "string" }
              },
              required: ["short_pitch", "revenue_items", "scenario_comparison", "investment_impact"]
            }
          }
        },
        next_year_projection: {
          type: "object",
          description: "CRITICAL: projection_year is REQUIRED!",
          properties: {
            projection_year: { type: "number", description: "CRITICAL & REQUIRED" },
            strategy_note: { type: "string" },
            virtual_opening_balance: {
              type: "object",
              properties: {
                opening_cash: { type: "number" },
                war_chest_status: { type: "string" },
                intangible_growth: { type: "string" }
              }
            },
            quarterly: {
              type: "object",
              properties: {
                q1: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } } },
                q2: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } } },
                q3: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } } },
                q4: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } } }
              }
            },
            summary: {
              type: "object",
              properties: {
                total_revenue: { type: "number" },
                total_expenses: { type: "number" },
                net_profit: { type: "number" },
                ending_cash: { type: "number" }
              }
            },
            investor_hook: {
              type: "object",
              properties: {
                revenue_growth_yoy: { type: "string" },
                margin_improvement: { type: "string" },
                valuation_multiple_target: { type: "string" },
                competitive_moat: { type: "string" }
              }
            },
            itemized_revenues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  q1: { type: "number" }, q2: { type: "number" }, q3: { type: "number" }, q4: { type: "number" },
                  total: { type: "number" },
                  growth_rate: { type: "number" }
                },
                required: ["category", "q1", "q2", "q3", "q4", "total", "growth_rate"]
              }
            },
            itemized_expenses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  q1: { type: "number" }, q2: { type: "number" }, q3: { type: "number" }, q4: { type: "number" },
                  total: { type: "number" },
                  growth_rate: { type: "number" }
                },
                required: ["category", "q1", "q2", "q3", "q4", "total", "growth_rate"]
              }
            }
          },
          required: ["projection_year", "strategy_note", "quarterly", "summary", "itemized_revenues", "itemized_expenses"]
        }
      },
      required: ["insights", "recommendations", "quarterly_analysis", "deal_analysis", "pitch_deck", "next_year_projection"]
    }
  }
});

// =====================================================
// FALLBACK TOOL SCHEMA (Simpler for Claude)
// =====================================================
const getFallbackToolSchema = () => ({
  type: "function",
  function: {
    name: "generate_unified_analysis",
    description: "Generate unified financial analysis. Focus on accuracy over creativity.",
    parameters: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["revenue", "profit", "cash_flow", "risk", "efficiency", "opportunity"] },
              severity: { type: "string", enum: ["critical", "high", "medium"] },
              title: { type: "string" },
              description: { type: "string" },
              impact_analysis: { type: "string" },
              data_points: { type: "array", items: { type: "string" } }
            },
            required: ["category", "severity", "title", "description"]
          }
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priority: { type: "number", enum: [1, 2, 3] },
              title: { type: "string" },
              description: { type: "string" },
              action_plan: { type: "array", items: { type: "string" } },
              expected_outcome: { type: "string" },
              timeframe: { type: "string" }
            },
            required: ["priority", "title", "description"]
          }
        },
        quarterly_analysis: {
          type: "object",
          properties: {
            overview: { type: "string" },
            critical_periods: { type: "array", items: { type: "object", properties: { quarter: { type: "string" }, reason: { type: "string" }, risk_level: { type: "string" } } } },
            seasonal_trends: { type: "array", items: { type: "string" } },
            growth_trajectory: { type: "string" }
          },
          required: ["overview", "growth_trajectory"]
        },
        deal_analysis: {
          type: "object",
          properties: {
            deal_score: { type: "number", minimum: 1, maximum: 10 },
            deal_score_formula: { type: "string" },
            valuation_verdict: { type: "string", enum: ["premium", "fair", "cheap"] },
            investor_attractiveness: { type: "string" },
            risk_factors: { type: "array", items: { type: "string" } }
          },
          required: ["deal_score", "valuation_verdict", "investor_attractiveness", "risk_factors"]
        },
        pitch_deck: {
          type: "object",
          properties: {
            slides: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slide_number: { type: "number" },
                  title: { type: "string" },
                  key_message: { type: "string" },
                  content_bullets: { type: "array", items: { type: "string" } },
                  speaker_notes: { type: "string" }
                },
                required: ["slide_number", "title", "key_message", "content_bullets"]
              }
            },
            executive_summary: {
              type: "object",
              properties: {
                short_pitch: { type: "string" },
                revenue_items: { type: "string" },
                scenario_comparison: { type: "string" },
                investment_impact: { type: "string" }
              },
              required: ["short_pitch"]
            }
          },
          required: ["slides", "executive_summary"]
        },
        next_year_projection: {
          type: "object",
          properties: {
            projection_year: { type: "number" },
            strategy_note: { type: "string" },
            quarterly: {
              type: "object",
              properties: {
                q1: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } }, required: ["revenue", "expenses"] },
                q2: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } }, required: ["revenue", "expenses"] },
                q3: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } }, required: ["revenue", "expenses"] },
                q4: { type: "object", properties: { revenue: { type: "number" }, expenses: { type: "number" }, cash_flow: { type: "number" }, key_event: { type: "string" } }, required: ["revenue", "expenses"] }
              },
              required: ["q1", "q2", "q3", "q4"]
            },
            summary: {
              type: "object",
              properties: {
                total_revenue: { type: "number" },
                total_expenses: { type: "number" },
                net_profit: { type: "number" },
                ending_cash: { type: "number" }
              },
              required: ["total_revenue", "total_expenses", "net_profit"]
            },
            itemized_revenues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  q1: { type: "number" }, q2: { type: "number" }, q3: { type: "number" }, q4: { type: "number" },
                  total: { type: "number" },
                  growth_rate: { type: "number" }
                },
                required: ["category", "total"]
              }
            },
            itemized_expenses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  q1: { type: "number" }, q2: { type: "number" }, q3: { type: "number" }, q4: { type: "number" },
                  total: { type: "number" },
                  growth_rate: { type: "number" }
                },
                required: ["category", "total"]
              }
            }
          },
          required: ["projection_year", "strategy_note", "quarterly", "summary"]
        }
      },
      required: ["insights", "recommendations", "quarterly_analysis", "deal_analysis", "pitch_deck", "next_year_projection"]
    }
  }
});

// =====================================================
// BILINGUAL ANTI-HALLUCINATION RULES
// =====================================================
const getAntiHallucinationRules = (L: PromptLabels) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.antiHallucinationTitle}

1. **${L.onlyUseProvidedData}**
   - ${L.noGeographicGuess}
   - ${L.noMarketSize}
   - ${L.noIndustryStats}
   - ${L.noCompetitorNames}
   - ${L.noTechIntegrations}
   - ${L.noLegalStructures}
   
2. **${L.admitUnknown}**
   - ${L.noDataAvailable}
   - ${L.assumptionPrefix}
   - ${L.userInputRequired}
   
3. **${L.sourceRequired}**
   - ${L.sourceExample1}
   - ${L.sourceExample2}
   - ${L.sourceExample3}
   - ${L.sourceExample4}
   
4. **${L.forbiddenPhrases}**
   ❌ ${L.consultingModel}
   ❌ ${L.digitalTransformation}
   ❌ ${L.scalable}
   ❌ ${L.traditionalBusiness}
   ❌ ${L.marketLeader}
   ❌ ${L.industryAverage}
   ❌ ${L.marketBillion}
   ❌ ${L.competitorDoing}
   ❌ ${L.industryTrend}
   ❌ ${L.geographicMarket}
   ❌ ${L.investorsGenerally}
   ❌ ${L.integrationMention}
   ❌ ${L.legalSetup}
   ❌ ${L.tamSamSom}
   ❌ ${L.externalReport}
   ❌ ${L.noBulletWithoutNumber}

5. **${L.allowedInferences}**
   ✅ ${L.financialRatioCalc}
   ✅ ${L.scenarioComparison}
   ✅ ${L.quarterlyTrend}
   ✅ ${L.dealMetricsCalc}
   ✅ ${L.breakEvenAnalysis}
   ✅ ${L.userProjectGrowth}
   ✅ ${L.crossAnalysis}

6. **${L.confidenceRule}**
   - ${L.confidence90}
   - ${L.confidence75}
   - ${L.confidence60}
   - ${L.confidence50}
   - ${L.confidenceBelow50}

   ${L.confidenceDistribution}
   - ${L.notAll85Plus}
   - ${L.atLeastOne60to74}
   - ${L.realAnalysis}
   - ${L.only90PlusForMath}

7. **${L.assumptionTransparency}**
   ${L.forEachInsight}
   - ${L.specifyDataSource}
   - ${L.listAssumptions}
   - ${L.validUnderCondition}
`;

// =====================================================
// BILINGUAL SCENARIO RULES
// =====================================================
type ScenarioRelationType = 'positive_vs_negative' | 'successor_projection' | 'year_over_year';

interface ScenarioRelationship {
  type: ScenarioRelationType;
  baseScenario: 'A' | 'B';
  projectionYear: number;
  description: string;
}

function detectScenarioRelationship(scenarioA: any, scenarioB: any): ScenarioRelationship {
  const targetYearA = scenarioA.targetYear || new Date().getFullYear();
  const targetYearB = scenarioB.targetYear || new Date().getFullYear();
  
  if (targetYearA === targetYearB) {
    return {
      type: 'positive_vs_negative',
      baseScenario: 'A',
      projectionYear: targetYearA + 1,
      description: 'positive_vs_negative'
    };
  }
  
  if (targetYearA > targetYearB) {
    return {
      type: 'successor_projection',
      baseScenario: 'B',
      projectionYear: targetYearA + 1,
      description: 'successor_projection'
    };
  }
  
  return {
    type: 'year_over_year',
    baseScenario: 'A',
    projectionYear: targetYearB + 1,
    description: 'year_over_year'
  };
}

function generateDynamicScenarioRules(relationship: ScenarioRelationship, scenarioA: any, scenarioB: any, L: PromptLabels): string {
  if (relationship.type === 'successor_projection') {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ${L.scenarioRulesTitle}: 📈 ${L.successorProjection}

${L.notPositiveVsNegative}
"${scenarioB.name}" (${scenarioB.targetYear}) → "${scenarioA.name}" (${scenarioA.targetYear})

${L.bothScenariosPositive}

1. **${scenarioB.name} (${scenarioB.targetYear}) = ${L.baseScenario}**
   - ${L.thisYearInvestmentTarget}
   - ${L.growthWithInvestment}
   - ${L.allExitPlanBased}
   - ${L.pitchDeckTraction}
   
2. **${scenarioA.name} (${scenarioA.targetYear}) = ${L.futureProjection}**
   - ${L.ifBaseSucceeds}
   - ${L.growthContinuation}
   - ${L.notNegativePositive}
   - ${L.globalExpansionYear}

3. **${L.successorAnalysisFocus}**
   - ${scenarioB.targetYear} ${L.ifWeReachTargets}
   - ${scenarioA.targetYear}${L.whereCanWeGo}
   - ${L.growthMomentumAnalysis}
   - ${L.bothPositiveOpportunity}
   - ${L.noOpportunityCost}

4. **${L.pitchDeckFocus}**
   - ${scenarioB.targetYear} ${L.investmentYearData}
   - ${scenarioA.targetYear} ${L.growthYearData}
   - ${L.storyFormat}
   
5. **${L.exitPlanAndMoic}**
   - ${L.baseYearFor} ${scenarioB.targetYear} (${scenarioB.name})
   - ${L.moicCalculationsFrom} ${scenarioB.name}
   - ${scenarioA.name} ${L.onlyShowAsUpside}

6. **${L.doNotUseSuccessor}**
   ❌ ${L.negativeScenarioPhrase}
   ❌ ${L.riskScenarioPhrase}
   ❌ ${L.withoutInvestmentPhrase}
   ❌ ${L.opportunityCostCalc}
   ❌ ${L.lossComparison}
`;
  }
  
  // Default: Same year positive vs negative comparison
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ${L.scenarioRulesTitle} (⚖️ ${L.positiveVsNegative}):

1. **${L.scenarioAPositive} (${scenarioA.name}):**
   - ${L.higherNetProfit}
   - ${L.growthTargetsMet}
   - ${L.targetScenario}
   - ${L.mainScenarioForInvestor}
   - ${L.withInvestmentScenario}

2. **${L.scenarioBNegative} (${scenarioB.name}):**
   - ${L.lowerNetProfit}
   - ${L.pessimisticAssumptions}
   - ${L.riskScenario}
   - ${L.forDownsideRisk}
   - ${L.withoutInvestmentScenario}

3. **${L.analysisFocus}**
   - ${L.ifPositiveHappens}
   - ${L.ifNegativeHappens}
   - ${L.whatsDifference}

4. **${L.investmentComparison}**
   - ${L.withInvestmentA}
   - ${L.withoutInvestmentB}
   - ${L.makeComparisonClear}

5. **${L.nextYearProjectionRule}**
   - ${L.projectionBasedOnA}
   - ${L.projection40to100}
`;
}

// =====================================================
// BILINGUAL FOCUS PROJECT RULES
// =====================================================
const getFocusProjectRules = (L: PromptLabels) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.focusProjectTitle}

${L.investmentRevenuePipeline}

${L.formula}
┌─────────────────────────────────────────────────────────────────┐
│ ${L.productInvestmentFormula}          │
│ ${L.revenueUpliftFormula}       │
│ ${L.growthRateFormula}                 │
└─────────────────────────────────────────────────────────────────┘

${L.revenueMultiplier}
├── ${L.saasMultiplier}
├── ${L.consultingMultiplier}
└── ${L.productMultiplier}

${L.exampleCalculation}
$200K × 40% = $80K → Product Development
$80K × 2.0 (SaaS) = $160K Revenue Uplift
Growth = $160K ÷ $243K = 65.8%

${L.nonFocusRule}

${L.sinceInvestmentFocused}
- ${L.focusProjects}
- ${L.otherProjects}

${L.organicGrowthOptions}
├── ${L.zeroDefault}
├── ${L.fivePercent}
├── ${L.eightToTen}
└── ${L.twelveToFifteen}

${L.useOrganicRate}

${L.whyOrganicGrowth}
${L.realism}
${L.existingCustomers}
${L.investorConfidence}

${L.jCurveEffect}

${L.dontDistributeLinear}

${L.saasDefault}
- ${L.q1Effect}
- ${L.q2Effect}
- ${L.q3Effect}
- ${L.q4Effect}

${L.consultingService}
- ${L.q1Consulting}
- ${L.q2Consulting}
- ${L.q3Consulting}
- ${L.q4Consulting}

${L.productLicense}
- ${L.q1Product}
- ${L.q2Product}
- ${L.q3Product}
- ${L.q4Product}

${L.ecommerce}
- ${L.q1Ecommerce}
- ${L.q2Ecommerce}
- ${L.q3Ecommerce}
- ${L.q4Ecommerce}

${L.sectorDetection}

${L.operatingLeverage}

${L.revenueUp50}
- ${L.fixedExpenses}
- ${L.variableExpenses}
- ${L.targetMargin}

${L.noMarginNote}

**${L.ifNoData}**
- ${L.selectHighestGrowth}
- ${L.identifyBiggestDiff}
`;

// =====================================================
// BILINGUAL MASTER PROMPT
// =====================================================
const getUnifiedMasterPrompt = (dynamicScenarioRules: string, L: PromptLabels) => `${L.masterPromptRole}

${getAntiHallucinationRules(L)}

${dynamicScenarioRules}

${getFocusProjectRules(L)}

${L.singleTask}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.projectionYearRule}

${L.projectionYearCalc}
${L.projectionFormula}

${L.examples}
- ${L.example2028vs2027}
- ${L.example2027vs2026}
- ${L.example2026vs2026}

${L.summaryWarning}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.dataPackage}
${L.dataItem1}
${L.dataItem2}
${L.dataItem3}
${L.dataItem4}
${L.dataItem5}
${L.dataItem6}
${L.dataItem7}
${L.dataItem8}
${L.dataItem9}
${L.dataItem10}
${L.dataItem11}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.professionalStandards}

${L.itemizedDeepAnalysis}
   ${L.forEachItem}
   - ${L.q1q4Trend}
   - ${L.volatilityLevel}
   - ${L.shareInTotal}
   - ${L.rootCauseDiff}

${L.ratioInterpretation}
   ${L.compareToBenchmark}
   - ${L.currentRatioBench}
   - ${L.netProfitMarginBench}
   - ${L.debtEquityBench}
   - ${L.receivablesAssetBench}

${L.sensitivityInterpretation}
   ${L.whenRevenue20Down}
   - ${L.howProfitAffected}
   - ${L.doesBreakEvenShift}
   - ${L.howManyMonthsRunway}
   - ${L.mostCriticalVariable}

${L.confidenceRequired}
   ${L.forEachInsightReq}
   - ${L.confidenceScore0to100}
   - ${L.listAssumptionsMade}
   - ${L.showSupportingData}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.section1Financial}

${L.section1Output}
- ${L.insights5to7}
  - ${L.eachInsightConfidence}
  - ${L.eachInsightSource}
- ${L.recommendations3to5}
- ${L.quarterlyAnalysis}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.section2Deal}

${L.valuationTransparency}
${L.showFormulaForEach}

${L.preMoneyFormula}
   ${L.preMoneyExample}

${L.postMoneyFormula}
   ${L.postMoneyExample}

${L.revenueMultipleFormula}
   ${L.revenueMultipleExample}

${L.moicFormula}
   ${L.moicExample}

${L.backEveryNumber}

${L.dealOutput}
- ${L.dealScoreOutput}
- ${L.valuationVerdictOutput}
- ${L.investorAttractivenessOutput}
- ${L.riskFactorsOutput}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.section3Pitch}

${L.criticalNumbers}

${L.generate10Slides}

${L.languageAndTone}
- ${L.speakAsFounder}
- ${L.confidentRealistic}
- ${L.numbersSupport}
- ${L.exciteInvestor}

${L.forEachSlide}
- ${L.titleMax8}
- ${L.keyMessageWithNumber}
- ${L.contentBullets}
- ${L.speakerNotesMax80}
  ${L.speakerNotesRule}
  - ${L.max80Words}
  - ${L.noTechJargon}
  - ${L.catchInvestorAttention}
  - ${L.atLeast1Number}

${L.slideStructure}
${L.slide1Problem}
${L.slide2Solution}
${L.slide3Market}
${L.slide4BusinessModel}
${L.slide5Traction}
${L.slide6GrowthPlan}
${L.slide7UseOfFunds}
${L.slide8Financials}
${L.slide9Team}
${L.slide10TheAsk}

${L.forbidden}
- ${L.forbiddenAnalystLang}
- ${L.forbiddenGeneral}
- ${L.forbiddenNoBullets}

${L.required}
- ${L.requiredFounderTone}
- ${L.requiredEveryBullet}
- ${L.requiredProjectName}
- ${L.requiredSpeakerNotes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.section4Projection}

${L.criticalPositiveBase}

${L.projectionRules}
${L.baseEqualsA}
${L.growth40to100}
${L.everyQRevenue}
${L.q3q4Positive}
${L.netProfitPositive}

${L.itemizedProjection}

${L.focusProjectCalc}
${L.step1}
${L.step2}
${L.step3}

${L.nonFocusRuleUpdated}
- ${L.nonFocusOrganicRate}
- ${L.ifNotSpecified}
- ${L.exampleOrganicRate}

${L.jCurveQuarterly}
- ${L.q1Yearly10}
- ${L.q2Yearly25}
- ${L.q3Yearly65}
- ${L.q4Yearly100}

${L.expenseModel}
- ${L.fixedExpenses5to10}
- ${L.variableExpenses05}
- ${L.investmentDirect}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.section5Executive}

${L.criticalObject}

${L.shortPitch150}
${L.revenueItemsReq}
${L.scenarioCompReq}
${L.investmentImpactReq}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.doNot}
- ${L.doNotGeo}
- ${L.doNotMarketSize}
- ${L.doNotCompetitor}
- ${L.doNotTech}
- ${L.doNotLegal}
- ${L.doNotExternal}

${L.doThis}
- ${L.doAnalyzeData}
- ${L.doSourceNumbers}
- ${L.doConfidenceScore}
- ${L.doScenarioRef}
- ${L.doProjectionBase}

${L.language}${L.languageVC}`;

// =====================================================
// BILINGUAL USER PROMPT BUILDER
// =====================================================
function buildUserPrompt(
  data: {
    scenarioA: any;
    scenarioB: any;
    metrics: any;
    quarterly: any;
    dealConfig: any;
    exitPlan: any;
    capitalNeeds: any;
    historicalBalance: any;
    quarterlyItemized: any;
    exchangeRate: number | null;
    focusProjectInfo: any;
    previousEditedProjections: any;
    capTableEntries?: any[];
    workingCapitalConfig?: any;
  },
  scenarioRelationship: ScenarioRelationship,
  yearContext: {
    baseYear: number;
    scenarioYear: number;
    scenarioBYear: number;
    year2: number;
    year3: number;
    year5: number;
    exitPlanBaseYear: number;
  },
  L: PromptLabels
): string {
  const { scenarioA, scenarioB, metrics, quarterly, dealConfig, exitPlan, capitalNeeds, historicalBalance, quarterlyItemized, exchangeRate, focusProjectInfo, previousEditedProjections, capTableEntries, workingCapitalConfig } = data;
  const { baseYear, scenarioYear, scenarioBYear, year2, year3, year5 } = yearContext;

  // Currency note
  const currencyNote = exchangeRate ? `
${L.currencyInfo}
- ${L.allValuesNormalized}
- ${L.balanceConverted} ${exchangeRate.toFixed(2)} ${L.tlUsd}
- ${L.scenarioAlreadyUsd}
- ${L.comparisonsHomogeneous}
` : '';

  // Historical balance section
  const historicalBalanceSection = historicalBalance ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${currencyNote}
${L.historicalBalanceSection} (${historicalBalance.year}) - USD:

${L.cashPosition}
- ${L.cashOnHand} $${(historicalBalance.cash_on_hand || 0).toLocaleString()}
- ${L.bank} $${(historicalBalance.bank_balance || 0).toLocaleString()}
- ${L.totalLiquidAssets} $${((historicalBalance.cash_on_hand || 0) + (historicalBalance.bank_balance || 0)).toLocaleString()}

${L.receivablesPayables}
- ${L.tradeReceivables} $${(historicalBalance.trade_receivables || 0).toLocaleString()}
- ${L.tradePayables} $${(historicalBalance.trade_payables || 0).toLocaleString()}
- ${L.netWorkingCapital} $${((historicalBalance.trade_receivables || 0) - (historicalBalance.trade_payables || 0)).toLocaleString()}

${L.assetsLiabilities}
- ${L.totalAssets} $${(historicalBalance.total_assets || 0).toLocaleString()}
- ${L.totalLiabilities} $${(historicalBalance.total_liabilities || 0).toLocaleString()}
- ${L.totalEquity} $${(historicalBalance.total_equity || 0).toLocaleString()}

${L.profitCapital}
- ${L.periodNetProfit} $${(historicalBalance.current_profit || 0).toLocaleString()}
- ${L.retainedEarnings} $${(historicalBalance.retained_earnings || 0).toLocaleString()}
- ${L.paidCapital} $${(historicalBalance.paid_capital || 0).toLocaleString()}
- ${L.bankLoans} $${(historicalBalance.bank_loans || 0).toLocaleString()}

${L.howToUseData}
1. ${L.receivablesToAssets} ${((historicalBalance.trade_receivables || 0) / (historicalBalance.total_assets || 1) * 100).toFixed(1)}% ${L.ifAbove30Collection}
2. ${L.bankLoansToAssets} ${((historicalBalance.bank_loans || 0) / (historicalBalance.total_assets || 1) * 100).toFixed(1)}% ${L.debtRiskAnalysis}
3. ${L.retainedEarningsStatus} ${(historicalBalance.retained_earnings || 0) < 0 ? L.negativeRecovery : L.positiveHealthy}
${L.compareGrowthTargets}
` : `

${L.noHistoricalBalance}
${L.analyzeOnlyScenario}
`;

  // Year context section
  const yearContextSection = scenarioRelationship.type === 'successor_projection' ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${L.yearStructureRoles} (📈 ${L.successorProjection})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.scenarioType} 📈 ${L.successorProjection}
${L.bothScenariosPositive}

${L.timeline}
┌────────────────┬──────────────────────────────────────────┐
│ ${baseYear} (${L.base})    │ ${L.completedYear}     │
│ ${scenarioBYear} (${L.baseYearLabel})  │ "${scenarioB.name}" - ${L.investmentTarget}     │
│ ${scenarioYear} (${L.future})  │ "${scenarioA.name}" - ${L.successProjection}│
│ ${year3} (${L.year3Plus})   │ ${L.moic3YearPoint} (${scenarioBYear}) │
│ ${year5} (${L.year5Plus})   │ ${L.moic5YearPoint} (${scenarioBYear}) │
└────────────────┴──────────────────────────────────────────┘

${L.scenarioRoles}
- "${scenarioB.name}" (${scenarioBYear}) = ${L.baseScenario}
  - ${L.thisYearInvestmentTarget}
  - ${L.allExitPlanBased}
  - ${L.pitchDeckTraction}

- "${scenarioA.name}" (${scenarioYear}) = ${L.futureProjection}
  - ${L.ifBaseSucceeds}
  - ${L.notNegativePositive}
  - Pitch deck "Growth Plan"

${L.criticalInstructions}
1. ${L.allProjectionsBased}
2. ${L.moic3YearBased} ${scenarioBYear}
3. ${L.moic5YearBased} ${scenarioBYear}
4. ${L.storyFormat}
5. ${L.nextYearProjectionEquals} ${year2}
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${L.yearStructureRoles} (⚖️ ${L.positiveVsNegative})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.scenarioType} ⚖️ ${L.positiveVsNegative}

${L.timeline}
┌────────────────┬──────────────────────────────────────────┐
│ ${baseYear} (${L.base})    │ ${L.completedYear}     │
│ ${scenarioYear} (${L.year1})   │ ${L.scenarioYear}    │
│ ${year2} (${L.year2})   │ ${L.firstProjectionYear}                    │
│ ${year3} (${L.year3Plus})  │ ${L.moic3YearPoint}         │
│ ${year5} (${L.year5Plus})  │ ${L.moic5YearPoint}         │
└────────────────┴──────────────────────────────────────────┘

${L.scenarioRoles}
- ${L.scenarioAPositive} = "${scenarioA.name}"
  - ${scenarioYear} ${L.investmentYear}
  - ${L.dashboardFocused}
  - ${L.exitPlanMoicBased}

- ${L.scenarioBNegative} = "${scenarioB.name}"  
  - ${scenarioYear} ${L.riskScenarioLabel}
  - ${L.onlyForRiskDownside}

${L.criticalInstructions}
${L.allProjectionsBased}
${L.moic3YearBased} ${year3}
${L.moic5YearBased} ${year5}
${L.useSpecificYears}${year3} $2.5M ${L.valuation}
${L.refNegativeAs}
${L.nextYearProjectionEquals} ${scenarioYear + 1} (${year2})
`;

  // Focus project section
  const focusProjectSection = focusProjectInfo && focusProjectInfo.projects && focusProjectInfo.projects.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.focusProjectInfo}

${L.selectedFocusProjects} ${focusProjectInfo.projects.join(', ')}

${L.projectDescription}
${focusProjectInfo.notes || L.notSpecifiedAiSuggest}

${L.organicGrowthRate} %${focusProjectInfo.organicGrowthRate || 0}

${L.growthPlan}
${focusProjectInfo.growthPlan || L.notSpecifiedAiSuggest}

${L.investmentDistribution}
- ${L.productDevelopment} %${focusProjectInfo.investmentAllocation?.product || 40} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.product || 40) / 100).toLocaleString()})
- ${L.marketing} %${focusProjectInfo.investmentAllocation?.marketing || 30} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.marketing || 30) / 100).toLocaleString()})
- ${L.personnel} %${focusProjectInfo.investmentAllocation?.hiring || 20} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.hiring || 20) / 100).toLocaleString()})
- ${L.operations} %${focusProjectInfo.investmentAllocation?.operations || 10} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.operations || 10) / 100).toLocaleString()})

${L.analysisInstruction}
${L.presentAsGrowthEngine}
${L.createUseOfFunds}
${L.includeGrowthPlan}
${L.everySlideKeyMessage}
${L.highlightInExecutive}
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.noFocusProjectSpecified}
${L.userDidntSelectFocus}
${L.autoSelectHighestGrowth}
${L.identifyBiggestDiffItem}
${L.useAsGrowthStory}
`;

  // User edits section
  const userEditsSection = previousEditedProjections ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.userEdits}

${L.userMadeChanges}
${L.updateAnalysisWithChanges}

${L.editedRevenueProjection}
${(previousEditedProjections.revenue || []).filter((i: any) => i.userEdited).map((r: any) => 
  `${r.category}: Q1=$${Math.round(r.q1).toLocaleString()}, Q2=$${Math.round(r.q2).toLocaleString()}, Q3=$${Math.round(r.q3).toLocaleString()}, Q4=$${Math.round(r.q4).toLocaleString()} | ${L.total}=$${Math.round(r.total || (r.q1+r.q2+r.q3+r.q4)).toLocaleString()} ${L.userEdited}`
).join('\n') || L.noRevenueEdit}

${L.editedExpenseProjection}
${(previousEditedProjections.expense || []).filter((i: any) => i.userEdited).map((e: any) => 
  `${e.category}: Q1=$${Math.round(e.q1).toLocaleString()}, Q2=$${Math.round(e.q2).toLocaleString()}, Q3=$${Math.round(e.q3).toLocaleString()}, Q4=$${Math.round(e.q4).toLocaleString()} | ${L.total}=$${Math.round(e.total || (e.q1+e.q2+e.q3+e.q4)).toLocaleString()} ${L.userEdited}`
).join('\n') || L.noExpenseEdit}

${L.editAnalysisInstruction}
${L.validateChanges}
${L.ifChangesAffectTotals}
${L.indicateAggressiveConservative}
` : '';

  // Cap Table section
  const capTableSection = capTableEntries && capTableEntries.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CAP TABLE (Equity Structure):

Shareholders:
${capTableEntries.map((entry: any) => 
  `- ${entry.holder}: ${entry.shares.toLocaleString()} shares (${entry.percentage}%) [${entry.type}]`
).join('\n')}

Total Shares: ${capTableEntries.reduce((sum: number, e: any) => sum + (e.shares || 0), 0).toLocaleString()}

Analysis Instructions:
- Use this cap table data for dilution calculations
- Consider ownership percentages when evaluating investor returns
- Factor in option pool when calculating fully diluted ownership
` : '';

  // Working Capital section
  const workingCapitalSection = workingCapitalConfig ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 WORKING CAPITAL CONFIGURATION:

- Accounts Receivable Days: ${workingCapitalConfig.ar_days || 45} days
- Accounts Payable Days: ${workingCapitalConfig.ap_days || 30} days
- Inventory Days: ${workingCapitalConfig.inventory_days || 0} days
- Deferred Revenue Days: ${workingCapitalConfig.deferred_revenue_days || 0} days

Cash Conversion Cycle (CCC): ${(workingCapitalConfig.ar_days || 45) + (workingCapitalConfig.inventory_days || 0) - (workingCapitalConfig.ap_days || 30)} days

Analysis Instructions:
- Use these metrics to calculate cash flow timing
- Consider CCC when evaluating runway and death valley
- Factor working capital changes into cash flow reconciliation
` : '';

  // Build the full prompt
  return `
${historicalBalanceSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.scenarioDataSection}

SCENARIO A (${scenarioA.name}):
- ${L.targetYear} ${scenarioA.targetYear}
- ${L.totalRevenue} $${metrics.scenarioA.totalRevenue.toLocaleString()}
- ${L.totalExpenses} $${metrics.scenarioA.totalExpenses.toLocaleString()}
- ${L.netProfit} $${metrics.scenarioA.netProfit.toLocaleString()}
- ${L.profitMargin} %${metrics.scenarioA.profitMargin.toFixed(1)}
- ${L.quarterlyNet} Q1: $${quarterly.a.q1.toLocaleString()}, Q2: $${quarterly.a.q2.toLocaleString()}, Q3: $${quarterly.a.q3.toLocaleString()}, Q4: $${quarterly.a.q4.toLocaleString()}

SCENARIO B (${scenarioB.name}):
- ${L.targetYear} ${scenarioB.targetYear}
- ${L.totalRevenue} $${metrics.scenarioB.totalRevenue.toLocaleString()}
- ${L.totalExpenses} $${metrics.scenarioB.totalExpenses.toLocaleString()}
- ${L.netProfit} $${metrics.scenarioB.netProfit.toLocaleString()}
- ${L.profitMargin} %${metrics.scenarioB.profitMargin.toFixed(1)}
- ${L.quarterlyNet} Q1: $${quarterly.b.q1.toLocaleString()}, Q2: $${quarterly.b.q2.toLocaleString()}, Q3: $${quarterly.b.q3.toLocaleString()}, Q4: $${quarterly.b.q4.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.dealConfigSection}
- ${L.requestedInvestment} $${dealConfig.investmentAmount.toLocaleString()}
- ${L.offeredEquity} %${dealConfig.equityPercentage}
- ${L.sectorMultiple} ${dealConfig.sectorMultiple}x
- ${L.safetyMargin} %${dealConfig.safetyMargin}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.calculatedExitPlan} (${scenarioYear}, ${L.basedOnPositive}):
- ${L.postMoneyValuation} $${exitPlan.postMoneyValuation.toLocaleString()}
- ${year3} (3Y) ${L.yearInvestorShare} $${exitPlan.investorShare3Year.toLocaleString()}
- ${year5} (5Y) ${L.yearInvestorShare} $${exitPlan.investorShare5Year.toLocaleString()}
- ${L.moic} (${year3}): ${exitPlan.moic3Year.toFixed(2)}x
- ${L.moic} (${year5}): ${exitPlan.moic5Year.toFixed(2)}x
- ${L.breakEvenYear} ${exitPlan.breakEvenYear || 'N/A'}

${exitPlan.allYears && exitPlan.allYears.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.fiveYearProjectionDetails}

${exitPlan.allYears.map((year: any, i: number) => {
  const valuations = year.valuations || {};
  return `
🗓️ ${year.actualYear || (scenarioYear + i + 1)} (${year.growthStage === 'aggressive' ? L.aggressiveGrowth : L.normalizedGrowth} ${L.stage}):
- ${L.revenue} $${(year.revenue || 0).toLocaleString()}
- ${L.expenses} $${(year.expenses || 0).toLocaleString()}
- ${L.netProfit} $${(year.netProfit || 0).toLocaleString()}
- ${L.ebitda} $${(year.ebitda || 0).toLocaleString()} (${L.margin} %${(year.ebitdaMargin || 0).toFixed(1)})
- ${L.freeCashFlow} $${(year.freeCashFlow || 0).toLocaleString()}
- ${L.appliedGrowthRate} %${((year.appliedGrowthRate || 0) * 100).toFixed(1)}

${L.valuationMethods}
├─ ${L.revenueMultiple} (${dealConfig.sectorMultiple}x): $${(valuations.revenueMultiple || 0).toLocaleString()}
├─ ${L.ebitdaMultiple} $${(valuations.ebitdaMultiple || 0).toLocaleString()}
├─ ${L.dcfDiscount} $${(valuations.dcf || 0).toLocaleString()}
├─ ${L.vcMethod} $${(valuations.vcMethod || 0).toLocaleString()}
└─ ${L.weightedValuation} $${(valuations.weighted || year.companyValuation || 0).toLocaleString()}
`;
}).join('\n')}

${L.valuationMethodology}
${L.revenueMultipleWeight}
${L.ebitdaMultipleWeight}
${L.dcfWeight}
${L.vcMethodWeight}

${L.valuationAnalysisInstructions}
${L.weightedFormula}
${L.useYear5Weighted}
${L.ebitdaMarginTrend}
${L.dcfVsRevenueMultiple}
${L.vcMethodRealistic}
${L.getAllValuations}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.deathValleyAnalysis}
- ${L.criticalQuarter} ${capitalNeeds.criticalQuarter}
- ${L.minCumulativeCash} $${capitalNeeds.minCumulativeCash.toLocaleString()}
- ${L.calculatedRequiredInvestment} $${capitalNeeds.requiredInvestment.toLocaleString()}
- ${L.monthlyBurnRate} $${capitalNeeds.burnRateMonthly.toLocaleString()}
- ${L.runway} ${capitalNeeds.runwayMonths} ${L.months}
- ${L.selfSustaining} ${capitalNeeds.selfSustaining ? L.yes : L.no}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${yearContextSection}

${L.revenueExpenseDetails}

${L.scenarioARevenues}
${scenarioA.revenues.map((r: { category: string; projectedAmount: number }) => `- ${r.category}: $${r.projectedAmount.toLocaleString()}`).join('\n')}

${L.scenarioAExpenses}
${scenarioA.expenses.map((e: { category: string; projectedAmount: number }) => `- ${e.category}: $${e.projectedAmount.toLocaleString()}`).join('\n')}

${L.scenarioBRevenues}
${scenarioB.revenues.map((r: { category: string; projectedAmount: number }) => `- ${r.category}: $${r.projectedAmount.toLocaleString()}`).join('\n')}

${L.scenarioBExpenses}
${scenarioB.expenses.map((e: { category: string; projectedAmount: number }) => `- ${e.category}: $${e.projectedAmount.toLocaleString()}`).join('\n')}

${quarterlyItemized ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L.quarterlyItemizedDetails}

${L.scenarioAQuarterlyRevenues}
${quarterlyItemized.scenarioA.revenues.map((r: any) => 
  `${r.category}: Q1=$${Math.round(r.q1).toLocaleString()}, Q2=$${Math.round(r.q2).toLocaleString()}, Q3=$${Math.round(r.q3).toLocaleString()}, Q4=$${Math.round(r.q4).toLocaleString()} | ${L.total}=$${Math.round(r.total).toLocaleString()}`
).join('\n')}

${L.scenarioBQuarterlyRevenues}
${quarterlyItemized.scenarioB.revenues.map((r: any) => 
  `${r.category}: Q1=$${Math.round(r.q1).toLocaleString()}, Q2=$${Math.round(r.q2).toLocaleString()}, Q3=$${Math.round(r.q3).toLocaleString()}, Q4=$${Math.round(r.q4).toLocaleString()} | ${L.total}=$${Math.round(r.total).toLocaleString()}`
).join('\n')}

${L.scenarioDiffRevenues}
${quarterlyItemized.diffs.revenues.map((d: any) => 
  `${d.category}: Q1 ${L.diff}=$${Math.round(d.diffQ1).toLocaleString()}, Q2=$${Math.round(d.diffQ2).toLocaleString()}, Q3=$${Math.round(d.diffQ3).toLocaleString()}, Q4=$${Math.round(d.diffQ4).toLocaleString()} | ${L.totalDiff}=$${Math.round(d.totalDiff).toLocaleString()} (${d.percentChange.toFixed(1)}%)`
).join('\n')}

${L.scenarioDiffExpenses}
${quarterlyItemized.diffs.expenses.map((d: any) => 
  `${d.category}: Q1 ${L.diff}=$${Math.round(d.diffQ1).toLocaleString()}, Q2=$${Math.round(d.diffQ2).toLocaleString()}, Q3=$${Math.round(d.diffQ3).toLocaleString()}, Q4=$${Math.round(d.diffQ4).toLocaleString()} | ${L.totalDiff}=$${Math.round(d.totalDiff).toLocaleString()} (${d.percentChange.toFixed(1)}%)`
).join('\n')}
` : ''}

${focusProjectSection}

${userEditsSection}

${capTableSection}

${workingCapitalSection}

${L.analyzeAllData}
`;
}

// =====================================================
// MAIN SERVE FUNCTION
// =====================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      scenarioA, 
      scenarioB, 
      metrics, 
      quarterly, 
      dealConfig, 
      exitPlan, 
      capitalNeeds,
      historicalBalance,
      quarterlyItemized,
      exchangeRate,
      focusProjectInfo,
      previousEditedProjections,
      language = 'en',
      // NEW: Cap Table and Working Capital data
      capTableEntries,
      workingCapitalConfig,
    } = await req.json();

    // Select language labels
    const L = PROMPT_LABELS[language as Language] || PROMPT_LABELS.en;
    const isEnglish = language === 'en';
    
    const langConfig = {
      aiLanguage: isEnglish ? 'English' : 'Turkish',
      responseInstruction: isEnglish 
        ? 'RESPOND IN ENGLISH ONLY. Use professional VC/investment terminology.'
        : 'TÜRKÇE YANIT VER. Profesyonel VC/yatırım terminolojisi kullan.',
    };
    
    console.log(`Language: ${language}, AI will respond in: ${langConfig.aiLanguage}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const PRIMARY_MODEL_ID = "google/gemini-3-pro-preview";
    const FALLBACK_MODEL_ID = "anthropic/claude-3.5-sonnet";
    
    // Detect scenario relationship type
    const scenarioRelationship = detectScenarioRelationship(scenarioA, scenarioB);
    console.log("Detected scenario relationship:", scenarioRelationship);
    
    // Generate dynamic scenario rules with bilingual labels
    const dynamicScenarioRules = generateDynamicScenarioRules(scenarioRelationship, scenarioA, scenarioB, L);
    
    // Calculate year references
    const currentYear = new Date().getFullYear();
    const baseYear = scenarioA.baseYear || currentYear - 1;
    const exitPlanBaseYear = scenarioRelationship.type === 'successor_projection' 
      ? scenarioB.targetYear 
      : scenarioA.targetYear;
    const scenarioYear = scenarioA.targetYear || currentYear;
    const scenarioBYear = scenarioB.targetYear || currentYear;
    const year2 = scenarioRelationship.projectionYear;
    const year3 = exitPlanBaseYear + 3;
    const year5 = exitPlanBaseYear + 5;

    // Build bilingual user prompt with Cap Table and Working Capital
    const userPrompt = buildUserPrompt(
      { scenarioA, scenarioB, metrics, quarterly, dealConfig, exitPlan, capitalNeeds, historicalBalance, quarterlyItemized, exchangeRate, focusProjectInfo, previousEditedProjections, capTableEntries, workingCapitalConfig },
      scenarioRelationship,
      { baseYear, scenarioYear, scenarioBYear, year2, year3, year5, exitPlanBaseYear },
      L
    );

    console.log("Calling Lovable AI with Pro model for unified analysis...");

    // Build system prompt with bilingual content
    const systemPrompt = getUnifiedMasterPrompt(dynamicScenarioRules, L) + 
      `\n\n${L.languageInstruction} ${langConfig.responseInstruction}\n${L.allContentMustBe} ${langConfig.aiLanguage}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [getUnifiedAnalysisToolSchema()],
        tool_choice: { type: "function", function: { name: "generate_unified_analysis" } }
      }),
    });

    let usedModel = PRIMARY_MODEL_ID;
    let finalResponse = response;

    // Handle rate limit and credit errors
    if (response.status === 429) {
      const errorText = await response.text();
      console.error("Rate limit exceeded:", errorText);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      const errorText = await response.text();
      console.error("Credits exhausted:", errorText);
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to Claude if primary fails
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Primary model (${PRIMARY_MODEL_ID}) failed:`, response.status, errorText);
      console.log(`Attempting fallback to ${FALLBACK_MODEL_ID}...`);

      const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL_ID,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          tools: [getFallbackToolSchema()],
          tool_choice: { type: "function", function: { name: "generate_unified_analysis" } }
        }),
      });

      if (!fallbackResponse.ok) {
        const fallbackErrorText = await fallbackResponse.text();
        console.error(`Fallback model (${FALLBACK_MODEL_ID}) also failed:`, fallbackResponse.status, fallbackErrorText);
        throw new Error(`Both AI models failed. Primary: ${response.status}, Fallback: ${fallbackResponse.status}`);
      }

      finalResponse = fallbackResponse;
      usedModel = FALLBACK_MODEL_ID;
      console.log(`Fallback to ${FALLBACK_MODEL_ID} succeeded`);
    }

    const data = await finalResponse.json();
    console.log(`AI response received successfully from ${usedModel}`);
    
    console.log("Response structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
      toolCallsLength: data.choices?.[0]?.message?.tool_calls?.length,
    }));

    // Extract function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const analysisResult = JSON.parse(toolCall.function.arguments);
        console.log("Successfully parsed tool call arguments");
        
        const responseWithMetadata = {
          ...analysisResult,
          projection_year: scenarioRelationship.projectionYear,
          _metadata: {
            model_used: usedModel,
            is_fallback: usedModel !== PRIMARY_MODEL_ID,
            language: language
          }
        };

        return new Response(
          JSON.stringify(responseWithMetadata),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log("Trying to parse content directly, length:", content.length);
      try {
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        }
        
        const parsed = JSON.parse(jsonContent);
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (contentParseError) {
        console.error("Failed to parse content as JSON:", contentParseError);
      }
    }

    console.error("No valid response structure found in AI response");
    throw new Error("No valid response from AI - check logs for response structure");
  } catch (error) {
    console.error("Unified analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
