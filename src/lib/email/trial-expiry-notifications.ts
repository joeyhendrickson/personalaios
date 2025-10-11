import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTrialExpiryWarning(email: string, name: string, daysRemaining: number) {
  try {
    const subject =
      daysRemaining === 1
        ? '⚠️ Your Life Stacks trial expires tomorrow!'
        : `⚠️ Your Life Stacks trial expires in ${daysRemaining} days`

    const { data, error } = await resend.emails.send({
      from: 'Life Stacks <noreply@lifestacks.ai>',
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="width: 60px; height: 12px; background: white; border-radius: 6px;"></div>
                <div style="width: 60px; height: 12px; background: white; border-radius: 6px;"></div>
                <div style="width: 60px; height: 12px; background: white; border-radius: 6px;"></div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: white;">Life</div>
                <div style="font-size: 24px; font-weight: bold; color: white;">Stacks</div>
              </div>
            </div>
          </div>
          
          <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; color: white;">
            <h1 style="color: white; font-size: 28px; margin-bottom: 20px; text-align: center;">
              ${daysRemaining === 1 ? 'Trial Expires Tomorrow!' : `Trial Expires in ${daysRemaining} Days`}
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hi ${name || 'there'},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              ${
                daysRemaining === 1
                  ? 'Your Life Stacks 7-day free trial expires tomorrow!'
                  : `Your Life Stacks 7-day free trial expires in ${daysRemaining} days.`
              }
            </p>
            
            <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: white; margin-bottom: 15px;">What happens when your trial ends?</h3>
              <ul style="color: #ccc; line-height: 1.6;">
                <li>You'll lose access to all Life Stacks features</li>
                <li>Your goals, tasks, and progress will be saved</li>
                <li>You can upgrade anytime to regain access</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/create-account" 
                 style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Upgrade to Standard Plan - $20.00/month
              </a>
            </div>
            
            <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: white; margin-bottom: 15px;">Standard Plan includes:</h3>
              <ul style="color: #ccc; line-height: 1.6;">
                <li>Full access to all features</li>
                <li>Exclusive Life Hacks & Business Hacks</li>
                <li>AI-powered insights</li>
                <li>Progress tracking</li>
                <li>Monthly meeting access</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #999; text-align: center; margin-top: 30px;">
              Questions? Reply to this email or contact us at support@lifestacks.ai
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending trial expiry email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Error sending trial expiry email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendTrialExpiredNotification(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Life Stacks <noreply@lifestacks.ai>',
      to: [email],
      subject: '🔒 Your Life Stacks trial has expired',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="width: 60px; height: 12px; background: white; border-radius: 6px;"></div>
                <div style="width: 60px; height: 12px; background: white; border-radius: 6px;"></div>
                <div style="width: 60px; height: 12px; background: white; border-radius: 6px;"></div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: white;">Life</div>
                <div style="font-size: 24px; font-weight: bold; color: white;">Stacks</div>
              </div>
            </div>
          </div>
          
          <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; color: white;">
            <h1 style="color: white; font-size: 28px; margin-bottom: 20px; text-align: center;">
              Your Trial Has Expired
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hi ${name || 'there'},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Your Life Stacks 7-day free trial has expired. Your account is now inactive.
            </p>
            
            <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: white; margin-bottom: 15px;">Don't worry - your data is safe!</h3>
              <ul style="color: #ccc; line-height: 1.6;">
                <li>All your goals, tasks, and progress are saved</li>
                <li>Upgrade anytime to regain full access</li>
                <li>Your data will be exactly as you left it</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/create-account" 
                 style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Upgrade to Standard Plan - $20.00/month
              </a>
            </div>
            
            <p style="font-size: 14px; color: #999; text-align: center; margin-top: 30px;">
              Questions? Reply to this email or contact us at support@lifestacks.ai
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending trial expired email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Error sending trial expired email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
