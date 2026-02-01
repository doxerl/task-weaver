import React from 'react';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import type { PdfPitchDeckPageProps } from './types';

/**
 * PDF Pitch Deck Page Component
 * Displays the investor pitch deck slides
 */
export function PdfPitchDeckPage({
  unifiedAnalysis,
}: PdfPitchDeckPageProps) {
  if (!unifiedAnalysis?.pitch_deck?.slides || unifiedAnalysis.pitch_deck.slides.length === 0) {
    return null;
  }

  // Get executive summary text
  const getExecutiveSummary = () => {
    if (!unifiedAnalysis.pitch_deck?.executive_summary) return null;
    const summary = unifiedAnalysis.pitch_deck.executive_summary;
    if (typeof summary === 'string') return summary;
    return summary?.short_pitch || '';
  };

  const executiveSummary = getExecutiveSummary();

  return (
    <div
      style={{
        ...CONTENT_PAGE_STYLE,
        // Last page - no page break after
      }}
    >
      <h2 style={PAGE_HEADER_STYLE}>Yatırımcı Sunumu</h2>

      {/* Executive Summary */}
      {executiveSummary && (
        <div
          style={{
            marginBottom: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            borderRadius: '16px',
            border: '1px solid #bfdbfe',
          }}
        >
          <p
            style={{
              fontSize: '15px',
              color: '#374151',
              fontStyle: 'italic',
              lineHeight: '1.6',
            }}
          >
            "{executiveSummary}"
          </p>
        </div>
      )}

      {/* Slides Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {unifiedAnalysis.pitch_deck.slides.slice(0, 5).map((slide, i) => (
          <div
            key={i}
            style={{
              background: 'linear-gradient(to bottom right, #f8fafc, white)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {slide.slide_number}
              </span>
              <h3 style={{ fontWeight: '600', fontSize: '14px', color: PDF_COLORS.primary }}>
                {slide.title}
              </h3>
            </div>
            <ul style={{ paddingLeft: '16px', margin: 0 }}>
              {slide.content_bullets?.slice(0, 4).map((bullet, j) => (
                <li
                  key={j}
                  style={{
                    fontSize: '11px',
                    color: '#4b5563',
                    marginBottom: '4px',
                    lineHeight: '1.4',
                  }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PdfPitchDeckPage;
