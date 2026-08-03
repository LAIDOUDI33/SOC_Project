/**
 * PDF Formatter for Report Generation
 * Djezzy National SOC Platform
 * 
 * Converts HTML content to PDF format using server-side rendering
 */

import { ReportMetadata } from '../report-generator'

interface PDFFormatOptions {
  format: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  margins: { top: number; right: number; bottom: number; left: number }
  header?: string
  footer?: string
  watermark?: boolean
  pageNumbers?: boolean
}

const defaultOptions: PDFFormatOptions = {
  format: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  header: undefined,
  footer: undefined,
  watermark: true,
  pageNumbers: true
}

export class PDFFormatter {
  /**
   * Format HTML content as PDF
   */
  static async format(
    htmlContent: string,
    metadata: ReportMetadata,
    options: Partial<PDFFormatOptions> = {}
  ): Promise<Buffer> {
    const opts = { ...defaultOptions, ...options }

    try {
      // In production, use a proper PDF library like puppeteer, pdfkit, or jsPDF
      // For now, we'll create a simplified HTML-to-PDF conversion
      
      // Add PDF-specific styling and metadata
      const pdfHtml = this.prepareHTMLForPDF(htmlContent, metadata, opts)
      
      // Simulate PDF generation - in production, this would call an actual PDF library
      // For demonstration, we return the HTML wrapped in a structure that represents a PDF
      const pdfBuffer = await this.generatePDFFromHTML(pdfHtml, opts)
      
      return pdfBuffer
    } catch (error) {
      console.error('PDF formatting failed:', error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Prepare HTML content for PDF conversion
   */
  private static prepareHTMLForPDF(
    html: string,
    metadata: ReportMetadata,
    options: PDFFormatOptions
  ): string {
    // Extract body content from HTML
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : html

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${metadata.title}</title>
  <style>
    @page {
      size: ${options.format} ${options.orientation};
      margin: ${options.margins.top}mm ${options.margins.right}mm ${options.margins.bottom}mm ${options.margins.left}mm;
    }
    
    * { box-sizing: border-box; }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    
    /* Header & Footer for print */
    @page :first {
      margin-top: 10mm;
    }
    
    .pdf-header {
      position: running(header);
      text-align: center;
      font-size: 9pt;
      color: #666;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    
    .pdf-footer {
      position: running(footer);
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 5px;
      margin-top: 15px;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80pt;
      color: rgba(200, 200, 200, 0.15);
      font-weight: bold;
      z-index: -1;
      pointer-events: none;
    }
    
    .page-number::after {
      content: counter(page) " of " counter(pages);
    }
    
    /* Table styles for better PDF output */
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    
    th, td {
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    
    /* Avoid breaking inside cards/boxes */
    .kpi-card, .stat-card, .highlight-box, .section {
      page-break-inside: avoid;
    }
    
    /* Print-optimized colors */
    h1, h2, h3 { 
      page-break-after: avoid; 
      color: #1a1a1a;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    a {
      color: #0066cc;
      text-decoration: none;
    }
    
    a::after {
      content: " (" attr(href) ")";
      font-size: 0.85em;
      color: #999;
    }
  </style>
</head>
<body>
  ${options.watermark ? '<div class="watermark">CONFIDENTIAL</div>' : ''}
  
  ${options.header ? `
  <div class="pdf-header">
    ${options.header}
  </div>
  ` : ''}
  
  ${bodyContent}
  
  ${options.footer || options.pageNumbers ? `
  <div class="pdf-footer">
    ${options.footer || ''}
    ${options.pageNumbers ? '<span class="page-number"></span>' : ''}
    <br/>
    <small>${metadata.title} | Generated: ${metadata.generatedAt.toLocaleDateString()} | Document ID: ${metadata.id}</small>
  </div>
  ` : ''}
  
  <script>
    // Ensure all images are embedded for PDF
    document.querySelectorAll('img').forEach(img => {
      if (!img.src.startsWith('data:')) {
        // Images should be converted to data URLs before PDF generation
        console.warn('External image detected:', img.src);
      }
    });
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * Generate PDF buffer from HTML
   * In production, this would use puppeteer, wkhtmltopdf, or similar
   */
  private static async generatePDFFromHTML(html: string, options: PDFFormatOptions): Promise<Buffer> {
    // For demonstration purposes, we create a simple representation
    // In production, integrate with:
    // - Puppeteer for headless Chrome rendering
    // - pdfkit for programmatic PDF generation
    // - jsPDF for client-side generation
    
    const pdfContent = Buffer.from(html, 'utf-8')
    
    // Create a mock PDF buffer that would be generated by a real PDF library
    // This is a placeholder - actual implementation would use one of the libraries above
    const mockPdfHeader = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34 // %PDF-1.4
    ])
    
    // Return combined buffer (in production, this would be actual PDF binary)
    return Buffer.concat([mockPdfHeader, pdfContent])
  }

  /**
   * Generate executive summary PDF (single page optimized)
   */
  static async generateExecutiveSummary(
    data: Record<string, unknown>,
    metadata: ReportMetadata
  ): Promise<Buffer> {
    const summaryHtml = `
      <div style="padding: 40px;">
        <h1 style="text-align: center; color: #1e40af; margin-bottom: 30px;">
          Executive Summary
        </h1>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0;">
          ${Object.entries(data).map(([key, value]) => `
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${value}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 5px;">
                ${key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `

    return this.format(summaryHtml, metadata, {
      format: 'A4',
      watermark: true,
      pageNumbers: false
    })
  }
}

export default PDFFormatter
