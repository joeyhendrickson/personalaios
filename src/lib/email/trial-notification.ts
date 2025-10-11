import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TrialExpiryEmailData {
  email: string
  name?: string
  daysRemaining: number
  trialEndDate: string
  conversionPrice: number
  planType: string
}

export async function sendTrialExpiryNotification(data: TrialExpiryEmailData) {
  try {
    const { email, name, daysRemaining, trialEndDate, conversionPrice, planType } = data

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .price { font-size: 32px; font-weight: bold; color: #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Your Life Stacks Trial is Ending Soon</h1>
            </div>
            <div class="content">
              <p>Hi ${name || 'there'},</p>
              
              <p>We hope you've been enjoying your free trial of Life Stacks! This is a friendly reminder that your trial will expire in <strong>${daysRemaining} days</strong> on <strong>${new Date(trialEndDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
              
              <div class="highlight">
                <p><strong>⏰ What happens next?</strong></p>
                <p>After your trial ends, you'll need to upgrade to continue using Life Stacks. Your subscription will be:</p>
                <p class="price">$${conversionPrice}/month</p>
                <p>for our ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan with full access to all features.</p>
              </div>
              
              <h3>✨ What You'll Keep:</h3>
              <ul>
                <li>AI-powered task prioritization and recommendations</li>
                <li>Comprehensive habit tracking with points & rewards</li>
                <li>Project management with strategic insights</li>
                <li>Life Hacks modules for productivity enhancement</li>
                <li>Progress analytics and goal tracking</li>
                <li>Relationship manager and wellness tools</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lifestacks.ai'}/dashboard" class="button">
                  Upgrade Now
                </a>
              </div>
              
              <p><strong>Need help or have questions?</strong> Just reply to this email and we'll be happy to assist you!</p>
              
              <p>Thanks for being part of Life Stacks!</p>
              
              <p>Best regards,<br>The Life Stacks Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Life Stacks. All rights reserved.</p>
              <p>You're receiving this email because you signed up for a free trial.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lifestacks.ai'}/cancel-trial">Cancel Trial</a></p>
            </div>
          </div>
        </body>
      </html>
    `

    const result = await resend.emails.send({
      from: 'Life Stacks <notifications@lifestacks.ai>',
      to: email,
      subject: `⏰ Your Life Stacks Trial Ends in ${daysRemaining} Days`,
      html: emailContent,
    })

    return {
      success: true,
      messageId: result.data?.id,
      error: null
    }
  } catch (error) {
    console.error('Error sending trial expiry email:', error)
    return {
      success: false,
      messageId: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function sendTrialExpiredNotification(data: TrialExpiryEmailData) {
  try {
    const { email, name, conversionPrice, planType } = data

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #ffe5e5; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .price { font-size: 32px; font-weight: bold; color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Your Life Stacks Trial Has Ended</h1>
            </div>
            <div class="content">
              <p>Hi ${name || 'there'},</p>
              
              <p>Your 7-day free trial of Life Stacks has ended. To continue using Life Stacks and keep all your progress, please upgrade to a paid plan.</p>
              
              <div class="highlight">
                <p><strong>🔒 Your account is now limited</strong></p>
                <p>Upgrade now to restore full access:</p>
                <p class="price">$${conversionPrice}/month</p>
                <p>${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lifestacks.ai'}/dashboard" class="button">
                  Upgrade Your Account
                </a>
              </div>
              
              <p><strong>All your data is safe!</strong> Your habits, tasks, projects, and progress are preserved and will be available as soon as you upgrade.</p>
              
              <p>Questions? Reply to this email anytime!</p>
              
              <p>Best regards,<br>The Life Stacks Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Life Stacks. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const result = await resend.emails.send({
      from: 'Life Stacks <notifications@lifestacks.ai>',
      to: email,
      subject: '⚠️ Your Life Stacks Trial Has Ended - Upgrade to Continue',
      html: emailContent,
    })

    return {
      success: true,
      messageId: result.data?.id,
      error: null
    }
  } catch (error) {
    console.error('Error sending trial expired email:', error)
    return {
      success: false,
      messageId: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
