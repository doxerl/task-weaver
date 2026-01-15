// ============================================
// MERKEZI PDF ENGINE - BARREL EXPORT
// ============================================

// Configuration
export { 
  PDF_CONFIG, 
  PDF_SELECTORS, 
  MEMORY_OPTIMIZATION,
  type PdfGenerateOptions 
} from './config/pdf';

// Core modules
export * from './core';

// Builders (Data-Driven PDF) - Primary source for builder types
export {
  PdfDocumentBuilder,
  createPortraitBuilder,
  createLandscapeBuilder,
  type PdfBuilderConfig,
  type TableSection,
  type ChartSection,
  type BalanceSheetSection,
  type IncomeStatementSection,
  type DetailedIncomeSection,
  type TextSection,
  type SpacerSection,
  type PageBreakSection,
  type PdfSection,
  type TableSectionOptions,
  type TableColumnStyle,
  type PdfOrientation as BuilderPdfOrientation,
} from './builders';

// Renderers (Data to Table Rows)
export * from './renderers';
