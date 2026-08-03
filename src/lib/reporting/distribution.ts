/**
 * Report Distribution Module
 * Djezzy National SOC Platform
 * 
 * Handles distribution of generated reports via email, Slack, and other channels
 */

import { ReportMetadata } from './report-generator'

// ============================================================
// Type Definitions
// ============================================================

export interface DistributionConfig {
  channels: ('email' | 'slack' | 'webhook')[]
  email?: EmailConfig
  slack?: SlackConfig
  webhook?: WebhookConfig
}

export interface EmailConfig {
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  includeBody: boolean
  fromName: string
  fromAddress: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

export interface SlackConfig {
  webhookUrl?: string
  channel: string
  username?: string
  iconEmoji?: string
  blocks?: SlackBlock[]
  text?: string
}

export interface WebhookConfig {
  url: string
  method: 'POST' | 'PUT'
  headers: Record<string, string>
  payload: Record<string, unknown>
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string; emoji?: boolean }>
  accessory?: { type: string; text: string; style?: string; url?: string }
}

interface DistributionResult {
  channel: string
  success: boolean
  messageId?: string
  error?: string
  timestamp: Date
}

// ============================================================
// Distribution Service Class
// ============================================================

export class ReportDistribution {
  private static instance: ReportDistribution

  private constructor() {}

  public static getInstance(): ReportDistribution {
    if (!ReportDistribution.instance) {
      ReportDistribution.instance = new ReportDistribution()
    }
    return ReportDistribution.instance
  }

  /**
   * Distribute report through configured channels
   */
  async distribute(options: {
    buffer: Buffer
    metadata: ReportMetadata
    config: DistributionConfig
  }): Promise<DistributionResult[]> {
    const results: DistributionResult[] = []

    for (const channel of options.config.channels) {
      try {
        let result: DistributionResult

        switch (channel) {
          case 'email':
            if (options.config.email) {
              result = await this.sendEmail({
                ...options.config.email,
                attachments: [{
                  filename: `${options.metadata.title.replace(/\s+/g, '_')}.${options.metadata.format}`,
                  content: options.buffer,
                  contentType: this.getContentType(options.metadata.format)
                }]
              })
            } else {
              throw new Error('Email configuration not provided')
            }
            break

          case 'slack':
            if (options.config.slack) {
              result = await this.sendSlackMessage({
                ...options.config.slack,
                text: `📊 ${options.metadata.title} is ready`,
                metadata: options.metadata,
                fileBuffer: options.buffer,
                fileName: `${options.metadata.id}.${options.metadata.format}`
              })
            } else {
              throw new Error('Slack configuration not provided')
            }
            break

          case 'webhook':
            if (options.config.webhook) {
              result = await this.sendWebhook({
                ...options.config.webhook,
                payload: {
                  ...options.config.webhook.payload,
                  reportId: options.metadata.id,
                  title: options.metadata.title,
                  type: options.metadata.type,
                  format: options.metadata.format,
                  generatedAt: options.metadata.generatedAt.toISOString(),
                  size: options.buffer.length
                }
              })
            } else {
              throw new Error('Webhook configuration not provided')
            }
            break

          default:
            throw new Error(`Unknown distribution channel: ${channel}`)
        }

        results.push(result)
      } catch (error) {
        results.push({
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })

        console.error(`Distribution failed for ${channel}:`, error)
      }
    }

    return results
  }

  /**
   * Send report via email
   */
  private async sendEmail(config: EmailConfig): Promise<DistributionResult> {
    // In production, integrate with:
    // - Nodemailer / SendGrid / AWS SES / Mailgun
    // - SMTP server or API-based service
    
    console.log(`[Distribution] Sending email to: ${config.recipients.join(', ')}`)
    console.log(`[Distribution] Subject: ${config.subject}`)

    // Simulate email sending
    const mockMessageId = `<${Date.now().toString(36)}@djezzy-soc.dz>`

    return {
      channel: 'email',
      success: true,
      messageId: mockMessageId,
      timestamp: new Date()
    }

    /* Production implementation example with Nodemailer:
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: config.recipients.join(', '),
      cc: config.cc?.join(', '),
      bcc: config.bcc?.join(', '),
      replyTo: config.replyTo,
      subject: config.subject,
      html: config.includeBody ? this.generateEmailBody() : undefined,
      attachments: config.attachments
    });

    return {
      channel: 'email',
      success: true,
      messageId: info.messageId,
      timestamp: new Date()
    };
    */
  }

  /**
   * Send notification to Slack
   */
  private async sendSlackMessage(config: SlackConfig & {
    metadata: ReportMetadata
    fileBuffer: Buffer
    fileName: string
  }): Promise<DistributionResult> {
    // In production, use @slack/web-api or webhook integration
    
    console.log(`[Distribution] Sending Slack message to #${config.channel}`)

    const message = {
      channel: config.channel,
      username: config.username || 'SOC Reports Bot',
      icon_emoji: config.iconEmoji || ':robot_face:',
      text: config.text || '📊 New report available',
      blocks: config.blocks || this.generateSlackBlocks(config.metadata),
      attachments: [
        {
          color: '#3b82f6',
          fields: [
            { type: 'mrkdwn', value: `*Report:* ${config.metadata.title}`, short: false },
            { type: 'mrkdwn', value: `*Type:* ${config.metadata.type}`, short: true },
            { type: 'mrkdwn', value: `*Format:* ${config.metadata.format.toUpperCase()}`, short: true },
            { type: 'mrkdwn', value: `*Size:* ${(config.fileBuffer.length / 1024).toFixed(1)} KB`, short: true },
            { type: 'mrkdwn', value: `*Generated:* ${config.metadata.generatedAt.toLocaleString()}`, short: false }
          ],
          actions: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Download Report' },
              url: `/api/reports/${config.metadata.id}/download`,
              style: 'primary'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Dashboard' },
              url: '/dashboards/executive',
              style: 'default'
            }
          ]
        }
      ]
    }

    // Simulate Slack API call
    const mockTs = `${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`

    return {
      channel: 'slack',
      success: true,
      messageId: mockTs,
      timestamp: new Date()
    }

    /* Production implementation:

    if (config.webhookUrl) {
      // Use incoming webhook
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } else {
      // Use Slack Web API client
      const web = new WebClient(process.env.SLACK_BOT_TOKEN);
      
      // Post message
      const postResult = await web.chat.postMessage(message);
      
      // Upload file (if configured)
      if (config.fileBuffer && config.fileName) {
        await web.files.uploadV2({
          channels: config.channel,
          file: config.fileBuffer,
          filename: config.fileName,
          initial_comment: `📎 ${config.metadata.title} (${config.metadata.format.toUpperCase()})`
        });
      }
    }
    */
  }

  /**
   * Send data to webhook endpoint
   */
  private async sendWebhook(config: WebhookConfig): Promise<DistributionResult> {
    console.log(`[Distribution] Sending webhook to: ${config.url}`)

    // Simulate webhook call
    /*
    const response = await fetch(config.url, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(config.payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}`);
    }
    */

    return {
      channel: 'webhook',
      success: true,
      timestamp: new Date()
    }
  }

  /**
   * Generate Slack block kit message
   */
  private generateSlackBlocks(metadata: ReportMetadata): SlackBlock[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 ${metadata.title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Type:*\n${metadata.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
          },
          {
            type: 'mrkdwn',
            text: `*Format:*\n\`${metadata.format.toUpperCase()}\``
          },
          {
            type: 'mrkdwn',
            text: `*Generated:*\n${metadata.generatedAt.toLocaleString()}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${metadata.status === 'completed' ? '✅ Ready' : '⏳ Processing'}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📥 Download Report' },
            url: `/api/reports/${metadata.id}/download`,
            style: 'primary'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔗 View in Portal' },
            url: '/dashboards/executive',
            style: 'default'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Generated by Djezzy National SOC Platform | ID: \`${metadata.id}\``
          }
        ]
      }
    ]
  }

  /**
   * Get MIME content type for format
   */
  private getContentType(format: string): string {
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      csv: 'text/csv',
      json: 'application/json',
      html: 'text/html'
    }
    return types[format.toLowerCase()] || 'application/octet-stream'
  }

  /**
   * Generate simple email body
   */
  private generateEmailBody(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Security Operations Report</h2>
        <p>Please find the attached report file.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b;">
          This is an automated message from the Djezzy National SOC Platform.<br>
          Please do not reply to this email.
        </p>
      </div>
    `
  }
}

// Export singleton instance
export const reportDistribution = ReportDistribution.getInstance()

/**
 * Convenience function for distributing reports
 */
export async function distributeReport(options: {
  buffer: Buffer
  metadata: ReportMetadata
  email?: EmailConfig
  slack?: SlackConfig
}): Promise<DistributionResult[]> {
  const config: DistributionConfig = {
    channels: []
  }

  if (options.email) {
    config.channels.push('email')
    config.email = options.email
  }

  if (options.slack) {
    config.channels.push('slack')
    config.slack = options.slack
  }

  return reportDistribution.distribute({
    buffer: options.buffer,
    metadata: options.metadata,
    config
  })
}

export default ReportDistribution
