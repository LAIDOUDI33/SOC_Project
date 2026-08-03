/**
 * HTML Formatter for Report Generation
 * Djezzy National SOC Platform
 * 
 * Generates email-ready HTML reports with inline styles
 */

import { ReportMetadata } from '../report-generator'

interface HTMLOptions {
  inlineStyles: boolean
  includeMetadata: boolean
  template?: 'email' | 'web' | 'print'
  maxLineWidth: number
}

const defaultOptions: HTMLOptions = {
  inlineStyles: true,
  includeMetadata: true,
  template: 'email',
  maxLineWidth: 600
}

export class HTMLFormatter {
  /**
   * Format content as styled HTML
   */
  static async format(
    content: string,
    metadata: ReportMetadata,
    options: Partial<HTMLOptions> = {}
  ): Promise<Buffer> {
    const opts = { ...defaultOptions, ...options }

    try {
      let htmlContent: string

      if (opts.template === 'email') {
        htmlContent = this.wrapAsEmail(content, metadata, opts)
      } else if (opts.template === 'print') {
        htmlContent = this.wrapForPrint(content, metadata, opts)
      } else {
        htmlContent = this.wrapAsWebPage(content, metadata, opts)
      }

      if (opts.inlineStyles) {
        htmlContent = this.inlineStyles(htmlContent)
      }

      return Buffer.from(htmlContent, 'utf-8')
    } catch (error) {
      console.error('HTML formatting failed:', error)
      throw new Error(`Failed to generate HTML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Wrap content as email-compatible HTML
   */
  private static wrapAsEmail(
    content: string,
    metadata: ReportMetadata,
    options: HTMLOptions
  ): string {
    return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${metadata.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Email client resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f7; }
    
    .email-container { 
      max-width: ${options.maxLineWidth}px; 
      margin: 0 auto; 
      background-color: #ffffff;
    }
    
    .email-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 30px 30px 25px;
      text-align: center;
    }
    
    .email-header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    
    .email-header p {
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      margin: 0;
    }
    
    .email-body {
      padding: 30px;
    }
    
    .email-footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .email-footer p {
      color: #64748b;
      font-size: 12px;
      margin: 5px 0;
    }
    
    /* Button styles */
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
    }
    
    .button:hover {
      background-color: #2563eb;
    }
    
    /* Table styles */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    
    .data-table th {
      background-color: #f1f5f9;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .data-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .data-table tr:nth-child(even) {
      background-color: #fafafa;
    }
    
    /* KPI cards for email */
    .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 0;
    }
    
    .kpi-card {
      flex: 1;
      min-width: 120px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 18px;
      border-radius: 8px;
      text-align: center;
    }
    
    .kpi-value {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
    }
    
    .kpi-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 5px;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .kpi-card { min-width: calc(50% - 10px); }
      .kpi-row { gap: 10px; }
      .data-table { font-size: 12px; }
      .data-table th, .data-table td { padding: 8px 10px; }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <h1>${metadata.title}</h1>
              <p>Generated on ${metadata.generatedAt.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="email-body">
              ${content}
              
              ${options.includeMetadata ? `
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #94a3b8; margin: 5px 0;">
                  Document ID: ${metadata.id}
                </p>
                <p style="font-size: 12px; color: #94a3b8; margin: 5px 0;">
                  Period: ${metadata.periodStart.toLocaleDateString()} — ${metadata.periodEnd.toLocaleDateString()}
                </p>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p><strong>${metadata.generatedBy || 'Djezzy National SOC Platform'}</strong></p>
              <p>This is an automated report. Please do not reply to this message.</p>
              <p>© ${new Date().getFullYear()} All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }

  /**
   * Wrap content for print output
   */
  private static wrapForPrint(
    content: string,
    metadata: ReportMetadata,
    options: HTMLOptions
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${metadata.title} - Print Version</title>
  <style>
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
    
    body {
      font-family: 'Georgia', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 15mm auto;
      padding: 0;
    }
    
    .print-header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    
    .print-header h1 {
      font-size: 22pt;
      margin: 0 0 8px 0;
    }
    
    .print-meta {
      font-size: 10pt;
      color: #666;
    }
    
    .print-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: #999;
      border-top: 1px solid #ddd;
      padding: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      border: 1px solid #ccc;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: #eee;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>${metadata.title}</h1>
    <div class="print-meta">
      Generated: ${metadata.generatedAt.toLocaleDateString()} | 
      Document ID: ${metadata.id} |
      Page <span class="page-number"></span> of <span class="total-pages"></span>
    </div>
  </div>
  
  ${content}
  
  <div class="print-footer no-print">
    ${metadata.title} | Confidential
  </div>
  
  <script>
    // Simple page numbering
    window.addEventListener('beforeprint', function() {
      // Add any pre-print processing here
    });
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * Wrap content as web page
   */
  private static wrapAsWebPage(
    content: string,
    metadata: ReportMetadata,
    options: HTMLOptions
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title}</title>
  <meta name="description" content="${metadata.type} report generated by Djezzy SOC Platform">
  <meta name="generated-at" content="${metadata.generatedAt.toISOString()}">
  <meta name="document-id" content="${metadata.id}">
</head>
<body>
  <main style="max-width: 1200px; margin: 0 auto; padding: 20px;">
    <header style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
      <h1 style="font-size: 28px; margin: 0;">${metadata.title}</h1>
      <p style="color: #64748b; margin: 8px 0 0 0;">
        Generated: ${metadata.generatedAt.toLocaleString()} | 
        Type: ${metadata.type} | 
        Format: ${metadata.format}
      </p>
    </header>
    
    <article>
      ${content}
    </article>
    
    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 13px;">
      <p>Generated by Djezzy National SOC Platform</p>
      <p>Document ID: ${metadata.id}</p>
    </footer>
  </main>
</body>
</html>
    `.trim()
  }

  /**
   * Inline CSS styles into HTML elements
   */
  private static inlineStyles(html: string): string {
    // This is a simplified version - in production, use a library like juice
    // For now, we just ensure basic compatibility
    
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
        // Keep style tags but they won't work in all email clients
        return match
      })
  }

  /**
   * Generate notification email HTML
   */
  static async generateNotificationEmail(options: {
    recipientName: string
    subject: string
    title: string
    message: string
    actionUrl?: string
    actionLabel?: string
    metrics?: Array<{ label: string; value: string }>
  }): Promise<Buffer> {
    const html = `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 22px; color: #1e40af; margin: 0 0 8px 0;">${options.title}</h1>
        <p style="color: #64748b; margin: 0;">Hello ${options.recipientName},</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; line-height: 1.7; color: #374151;">${options.message}</p>
      </div>
      
      ${options.metrics ? `
      <div style="display: flex; gap: 15px; margin: 25px 0; flex-wrap: wrap;">
        ${options.metrics.map(m => `
          <div style="flex: 1; min-width: 100px; background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${m.value}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 5px;">${m.label}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${options.actionUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${options.actionUrl}" style="
          display: inline-block;
          padding: 14px 32px;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        ">${options.actionLabel || 'View Details'}</a>
      </div>
      ` : ''}
    `

    const metadata: ReportMetadata = {
      id: `notif-${Date.now()}`,
      title: options.subject,
      type: 'notification' as any,
      format: 'html',
      generatedAt: new Date(),
      generatedBy: 'system',
      periodStart: new Date(),
      periodEnd: new Date(),
      status: 'completed'
    }

    return this.format(html, metadata, { template: 'email' })
  }
}

export default HTMLFormatter
