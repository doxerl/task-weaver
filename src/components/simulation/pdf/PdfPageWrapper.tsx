import React from 'react';
import { PDF_PAGE_STYLE } from '@/styles/pdfExport';

interface PdfPageWrapperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Wrapper component for PDF pages
 * Ensures consistent sizing and page breaks
 */
export function PdfPageWrapper({ children, style, className }: PdfPageWrapperProps) {
  return (
    <div
      className={`page-break-after ${className || ''}`}
      style={{ ...PDF_PAGE_STYLE, ...style }}
    >
      {children}
    </div>
  );
}

export default PdfPageWrapper;
