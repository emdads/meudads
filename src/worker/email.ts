// Email notification helper for admin notifications
import { createEmailService, SelectionNotificationData } from './email-service';

export interface EmailNotificationData {
  user_email: string;
  user_name: string;
  client_name: string;
  client_slug: string;
  selection_note: string;
  selection_type: string;
  selection_id: string;
  ad_count: number;
  created_at: string;
}

export async function notifyAdminsAboutNewSelection(
  db: D1Database,
  data: EmailNotificationData,
  env?: any
): Promise<void> {
  try {
    // Get all active admin emails from users table (admin type)
    const admins = await db.prepare(
      `SELECT email FROM users 
       WHERE user_type = 'admin' AND is_active = 1
       UNION
       SELECT email FROM admins WHERE is_active = 1`
    ).all();
    
    const adminEmails = (admins.results as any[]).map(admin => admin.email);
    
    if (adminEmails.length === 0) {
      console.log('[EMAIL] No admin emails found for notification');
      return;
    }
    
    console.log('[EMAIL] Sending notification to admins:', adminEmails);
    
    // Try to send real email if service is configured
    if (env) {
      const emailService = await createEmailService(env);
      if (emailService) {
        const selectionData: SelectionNotificationData = {
          user_email: data.user_email,
          user_name: data.user_name,
          client_name: data.client_name,
          client_slug: data.client_slug,
          selection_note: data.selection_note,
          selection_type: data.selection_type,
          selection_id: data.selection_id,
          ad_count: data.ad_count,
          created_at: data.created_at
        };
        
        const sent = await emailService.sendAdminSelectionNotification(adminEmails, selectionData);
        if (sent) {
          console.log('[EMAIL] ✅ Admin notification sent successfully');
          return;
        } else {
          console.log('[EMAIL] ❌ Failed to send admin notification, falling back to logging');
        }
      }
    }
    
    // Fallback: log what would be sent
    console.log('[EMAIL] Selection details:', {
      user: `${data.user_name} (${data.user_email})`,
      client: data.client_name,
      note: data.selection_note,
      ads: data.ad_count,
      created: data.created_at
    });
    
  } catch (error) {
    console.error('[EMAIL] Error sending admin notification:', error);
  }
}
