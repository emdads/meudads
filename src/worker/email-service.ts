// Email service using Resend for sending notifications
import { Resend } from 'resend';

export interface ClientAccessEmailData {
  client_id: string;
  client_name: string;
  client_email: string;
  temporary_password: string;
  slug: string;
}

export interface SelectionNotificationData {
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

export interface UserWelcomeEmailData {
  user_name: string;
  user_email: string;
  user_type: string;
  temporary_password: string;
  roles: string[];
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendClientAccessEmail(data: ClientAccessEmailData): Promise<boolean> {
    try {
      console.log('[EMAIL-SERVICE] Enviando email de acesso para:', data.client_email);

      const emailData = {
        from: this.fromEmail,
        to: [data.client_email],
        subject: `🔑 Bem-vindo ao MeuDads - Seus dados de acesso - ${data.client_name}`,
        html: this.generateClientAccessEmailHTML(data),
        text: this.generateClientAccessEmailText(data)
      };

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        console.error('[EMAIL-SERVICE] Erro ao enviar email:', result.error);
        return false;
      }

      console.log('[EMAIL-SERVICE] ✅ Email enviado com sucesso:', result.data?.id);
      return true;

    } catch (error) {
      console.error('[EMAIL-SERVICE] Erro no serviço de email:', error);
      return false;
    }
  }

  async sendAdminSelectionNotification(admins: string[], data: SelectionNotificationData): Promise<boolean> {
    try {
      console.log('[EMAIL-SERVICE] Enviando notificação para admins:', admins);

      const emailData = {
        from: this.fromEmail,
        to: admins,
        subject: `🚨 Nova ${data.selection_type === 'pause' ? 'Lista para Pausar' : data.selection_type === 'adjust' ? 'Lista de Ajustes' : 'Seleção'} - ${data.client_name}`,
        html: this.generateSelectionNotificationHTML(data),
        text: this.generateSelectionNotificationText(data)
      };

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        console.error('[EMAIL-SERVICE] Erro ao enviar notificação:', result.error);
        return false;
      }

      console.log('[EMAIL-SERVICE] ✅ Notificação enviada com sucesso:', result.data?.id);
      return true;

    } catch (error) {
      console.error('[EMAIL-SERVICE] Erro ao enviar notificação:', error);
      return false;
    }
  }

  async sendUserWelcomeEmail(data: UserWelcomeEmailData): Promise<boolean> {
    try {
      console.log('[EMAIL-SERVICE] Enviando email de boas-vindas para usuário:', data.user_email);

      const emailData = {
        from: this.fromEmail,
        to: [data.user_email],
        subject: `🎉 Bem-vindo ao MeuDads - Sua conta foi criada`,
        html: this.generateUserWelcomeEmailHTML(data),
        text: this.generateUserWelcomeEmailText(data)
      };

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        console.error('[EMAIL-SERVICE] Erro ao enviar email de boas-vindas:', result.error);
        return false;
      }

      console.log('[EMAIL-SERVICE] ✅ Email de boas-vindas enviado com sucesso:', result.data?.id);
      return true;

    } catch (error) {
      console.error('[EMAIL-SERVICE] Erro no serviço de email de boas-vindas:', error);
      return false;
    }
  }

  private generateClientAccessEmailHTML(data: ClientAccessEmailData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao MeuDads</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .welcome-box { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credentials-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .credential-item:last-child { border-bottom: none; }
        .credential-label { font-weight: 600; color: #374151; }
        .credential-value { font-family: 'Courier New', monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .password-warning { background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 16px; margin: 20px 0; color: #dc2626; }
        .button { 
          display: inline-block; 
          background: linear-gradient(135deg, #1e40af, #3b82f6); 
          color: white !important; 
          padding: 14px 28px; 
          text-decoration: none; 
          border-radius: 10px; 
          font-weight: 700; 
          margin: 20px 0; 
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.1);
          font-size: 16px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          transition: all 0.3s;
        }
        .button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
        }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .step { margin: 15px 0; padding: 12px; background: #f9fafb; border-left: 4px solid #3b82f6; }
        .step-number { display: inline-block; background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao MeuDads!</h1>
            <p>Performance Marketing Hub</p>
        </div>
        
        <div class="content">
            <div class="welcome-box">
                <h2 style="margin-top: 0; color: #0369a1;">Olá, ${data.client_name}!</h2>
                <p style="margin: 0;">Sua conta foi criada com sucesso no MeuDads. Agora você pode acompanhar seus anúncios ativos e analisar métricas de performance em tempo real.</p>
            </div>

            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #d97706;">🔑 Seus dados de acesso:</h3>
                <div class="credential-item">
                    <span class="credential-label">E-mail:</span>
                    <span class="credential-value">${data.client_email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Senha temporária:</span>
                    <span class="credential-value">${data.temporary_password}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Link de acesso:</span>
                    <span class="credential-value"><a href="https://meudads.com.br/c/${data.slug}/creatives/active" style="color: #3b82f6; text-decoration: none;">Clique aqui para acessar sua conta</a></span>
                </div>
            </div>

            <div class="password-warning">
                <strong>⚠️ IMPORTANTE:</strong> Esta é uma senha temporária que DEVE ser alterada no primeiro acesso por motivos de segurança.
            </div>

            <h3>📋 Como começar:</h3>
            <div class="step">
                <span class="step-number">1</span>
                <strong>Acesse sua conta:</strong> Clique no botão abaixo ou visite o link de acesso
            </div>
            <div class="step">
                <span class="step-number">2</span>
                <strong>Faça login:</strong> Use seu e-mail e a senha temporária fornecida
            </div>
            <div class="step">
                <span class="step-number">3</span>
                <strong>Altere sua senha:</strong> Siga as instruções para criar uma nova senha segura
            </div>
            <div class="step">
                <span class="step-number">4</span>
                <strong>Explore:</strong> Navegue pelos seus anúncios e relatórios de performance
            </div>

            <div style="text-align: center;">
                <a href="https://meudads.com.br/c/${data.slug}/creatives/active" class="button" style="color: white !important; text-decoration: none;">
                    🚀 Acessar Minha Conta
                </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <h4>🤝 Precisa de ajuda?</h4>
                <p>Nossa equipe está pronta para te ajudar:</p>
                <ul>
                    <li>📧 E-mail: <a href="mailto:suporte@meudads.com.br">suporte@meudads.com.br</a></li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>MeuDads - Performance Marketing Hub</strong></p>
            <p>Transformando dados em resultados</p>
            <p>Este é um e-mail automático, não responda diretamente.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateClientAccessEmailText(data: ClientAccessEmailData): string {
    return `
🎉 BEM-VINDO AO MEUDADS!

Olá, ${data.client_name}!

Sua conta foi criada com sucesso no MeuDads - Performance Marketing Hub.

Agora você pode acompanhar seus anúncios ativos e analisar métricas de performance em tempo real.

🔑 SEUS DADOS DE ACESSO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E-mail: ${data.client_email}
Senha temporária: ${data.temporary_password}
Link de acesso: Clique no botão abaixo ou acesse: https://meudads.com/c/${data.slug}/creatives/active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE: Esta é uma senha temporária que DEVE ser alterada no primeiro acesso.

📋 COMO COMEÇAR:
1. Acesse o link: https://meudads.com.br/c/${data.slug}/creatives/active
2. Faça login com seu e-mail e senha temporária
3. Altere sua senha seguindo as instruções
4. Explore seus anúncios e relatórios de performance

🤝 PRECISA DE AJUDA?
E-mail: suporte@meudads.com.br

Bem-vindo ao futuro do marketing de performance!

---
MeuDads - Performance Marketing Hub
Transformando dados em resultados
`;
  }

  // Helper function to format date in Brazil timezone
  private formatBrazilDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  private generateSelectionNotificationHTML(data: SelectionNotificationData): string {
    const getTypeInfo = (type: string) => {
      switch (type) {
        case 'pause':
          return { name: 'Lista para Pausar', icon: '⏸️', color: '#dc2626', bgColor: '#fef2f2' };
        case 'adjust':
          return { name: 'Lista de Ajustes', icon: '⚙️', color: '#2563eb', bgColor: '#eff6ff' };
        default:
          return { name: 'Seleção de Anúncios', icon: '📋', color: '#7c3aed', bgColor: '#f3e8ff' };
      }
    };

    const typeInfo = getTypeInfo(data.selection_type);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova ${typeInfo.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        .header { background: linear-gradient(135deg, ${typeInfo.color}, #ec4899); color: white; padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: pulse 4s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .header-content { position: relative; z-index: 1; }
        .alert-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
        .content { padding: 40px 30px; }
        .alert-box { background: ${typeInfo.bgColor}; border-left: 4px solid ${typeInfo.color}; border-radius: 8px; padding: 24px; margin: 24px 0; }
        .info-grid { display: grid; gap: 16px; margin: 24px 0; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; transition: transform 0.2s; }
        .info-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); }
        .info-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .info-value { font-size: 16px; font-weight: 700; color: #1e293b; }
        .action-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #1e40af, #3b82f6); 
          color: white !important; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 12px; 
          font-weight: 700; 
          text-align: center; 
          margin: 24px 0; 
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3); 
          transition: all 0.3s;
          border: 2px solid rgba(255, 255, 255, 0.1);
          font-size: 16px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .action-button:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4); 
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
        }
        .footer { background: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-logo { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        .footer-text { font-size: 14px; color: #64748b; }
        .urgent-indicator { position: absolute; top: 20px; right: 20px; background: #ff4444; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; animation: blink 2s infinite; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.6; } }
        .stats-table { width: 100%; margin: 24px 0; border-collapse: separate; border-spacing: 8px; }
        .stat-cell { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; vertical-align: top; width: 33.33%; }
        .stat-number { font-size: 32px; font-weight: 800; color: ${typeInfo.color}; display: block; margin-bottom: 12px; line-height: 1; }
        .stat-label { font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="urgent-indicator">🚨 URGENTE</div>
            <div class="header-content">
                <div class="alert-badge">
                    <span>${typeInfo.icon}</span>
                    <span>NOVA NOTIFICAÇÃO</span>
                </div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800;">${typeInfo.name} Criada</h1>
                <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Ação necessária da equipe administrativa</p>
            </div>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <h3 style="margin: 0 0 16px; color: ${typeInfo.color}; font-size: 18px; font-weight: 700;">
                    ${typeInfo.icon} ${typeInfo.name} Aguarda Revisão
                </h3>
                <p style="margin: 0; color: #374151; font-size: 15px;">
                    Uma nova ${typeInfo.name.toLowerCase()} foi criada e precisa da sua atenção. 
                    Clique no botão abaixo para revisar e tomar as ações necessárias.
                </p>
            </div>

            <table class="stats-table">
                <tr>
                    <td class="stat-cell">
                        <div class="stat-number">${data.ad_count}</div>
                        <div class="stat-label">Anúncios<br>Selecionados</div>
                    </td>
                    <td class="stat-cell">
                        <div class="stat-number">${typeInfo.icon}</div>
                        <div class="stat-label">Ação:<br>${data.selection_type === 'pause' ? 'Pausar' : data.selection_type === 'adjust' ? 'Ajustar' : 'Outros'}</div>
                    </td>
                    <td class="stat-cell">
                        <div class="stat-number">🚨</div>
                        <div class="stat-label">Prioridade<br>Alta</div>
                    </td>
                </tr>
            </table>
            
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">👤 Criado por</div>
                    <div class="info-value">${data.user_name}</div>
                    <div style="font-size: 14px; color: #64748b; margin-top: 4px;">${data.user_email}</div>
                </div>
                
                <div class="info-card">
                    <div class="info-label">🏢 Cliente</div>
                    <div class="info-value">${data.client_name}</div>
                </div>
                
                <div class="info-card">
                    <div class="info-label">📅 Data e Hora</div>
                    <div class="info-value">${this.formatBrazilDateTime(data.created_at)}</div>
                </div>
                
                ${data.selection_note ? `
                <div class="info-card" style="grid-column: 1 / -1;">
                    <div class="info-label">📝 Observações</div>
                    <div class="info-value" style="font-weight: 500;">${data.selection_note}</div>
                </div>
                ` : ''}
            </div>

            <div style="text-align: center;">
                <a href="https://meudads.com.br/selections?client_slug=${data.client_slug}&selection_id=${data.selection_id}" class="action-button" style="color: white !important; text-decoration: none;">
                    🔍 Revisar ${typeInfo.name} Agora
                </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; color: #92400e;">
                    <span style="font-size: 18px;">⚠️</span>
                    <strong>Atenção:</strong>
                </div>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">
                    Esta notificação foi enviada automaticamente para todos os super administradores. 
                    Verifique o painel o quanto antes para evitar delays nas operações.
                </p>
            </div>
        </div>

        <div class="footer">
            <div class="footer-logo">MeuDads - Performance Marketing Hub</div>
            <div class="footer-text">Sistema de Notificações Automáticas</div>
            <div style="margin-top: 12px; font-size: 12px; color: #9ca3af;">
                Este é um e-mail automático de alta prioridade • Não responder
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateSelectionNotificationText(data: SelectionNotificationData): string {
    const getTypeName = (type: string) => {
      switch (type) {
        case 'pause': return 'LISTA PARA PAUSAR ANÚNCIOS';
        case 'adjust': return 'LISTA DE AJUSTES';
        default: return 'SELEÇÃO DE ANÚNCIOS';
      }
    };

    return `
🚨 NOVA ${getTypeName(data.selection_type)} - AÇÃO NECESSÁRIA

Uma nova ${getTypeName(data.selection_type).toLowerCase()} foi criada no MeuDads e precisa da sua atenção:

👤 CRIADO POR: ${data.user_name} (${data.user_email})
🏢 CLIENTE: ${data.client_name}
📊 ANÚNCIOS: ${data.ad_count} selecionados
📝 OBSERVAÇÕES: ${data.selection_note || 'Sem observações'}
📅 DATA/HORA: ${this.formatBrazilDateTime(data.created_at)}
🔗 TIPO: ${data.selection_type === 'pause' ? 'Para Pausar' : data.selection_type === 'adjust' ? 'Ajustes' : 'Outros'}

ACESSO DIRETO:
https://meudads.com.br/selections?client_slug=${data.client_slug}&selection_id=${data.selection_id}

⚠️ IMPORTANTE: Esta notificação foi enviada para todos os super administradores. 
Verifique o painel o quanto antes para evitar delays nas operações.

---
MeuDads - Sistema de Notificações Automáticas
🚨 E-mail de alta prioridade - Não responder
`;
  }

  private generateUserWelcomeEmailHTML(data: UserWelcomeEmailData): string {
    const getUserTypeLabel = (type: string) => {
      switch (type) {
        case 'admin': return 'Administrador';
        case 'client': return 'Cliente';
        case 'user': return 'Usuário';
        default: return type;
      }
    };

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao MeuDads</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .welcome-box { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credentials-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .credential-item:last-child { border-bottom: none; }
        .credential-label { font-weight: 600; color: #374151; }
        .credential-value { font-family: 'Courier New', monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .password-warning { background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 16px; margin: 20px 0; color: #dc2626; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .step { margin: 15px 0; padding: 12px; background: #f9fafb; border-left: 4px solid #3b82f6; }
        .step-number { display: inline-block; background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; margin-right: 10px; }
        .role-badge { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin: 2px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao MeuDads!</h1>
            <p>Performance Marketing Hub</p>
        </div>
        
        <div class="content">
            <div class="welcome-box">
                <h2 style="margin-top: 0; color: #0369a1;">Olá, ${data.user_name}!</h2>
                <p>Sua conta foi criada no MeuDads como <strong>${getUserTypeLabel(data.user_type)}</strong>.</p>
                <p style="margin: 0;">Agora você tem acesso ao nosso sistema de gestão de performance marketing!</p>
                ${data.roles.length > 0 ? `
                <div style="margin-top: 16px;">
                    <p style="margin-bottom: 8px; font-weight: 600;">Suas funções no sistema:</p>
                    ${data.roles.map(role => `<span class="role-badge">${role}</span>`).join('')}
                </div>
                ` : ''}
            </div>

            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #d97706;">🔑 Seus dados de acesso:</h3>
                <div class="credential-item">
                    <span class="credential-label">E-mail:</span>
                    <span class="credential-value">${data.user_email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Senha temporária:</span>
                    <span class="credential-value">${data.temporary_password}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Link de acesso:</span>
                    <span class="credential-value"><a href="https://meudads.com.br/login" style="color: #3b82f6; text-decoration: none;">Clique aqui para acessar</a></span>
                </div>
            </div>

            <div class="password-warning">
                <strong>⚠️ IMPORTANTE:</strong> Esta é uma senha temporária que DEVE ser alterada no primeiro acesso por motivos de segurança.
            </div>

            <h3>📋 Como começar:</h3>
            <div class="step">
                <span class="step-number">1</span>
                <strong>Acesse o sistema:</strong> Clique no botão abaixo ou visite https://meudads.com.br/login
            </div>
            <div class="step">
                <span class="step-number">2</span>
                <strong>Faça login:</strong> Use seu e-mail e a senha temporária fornecida
            </div>
            <div class="step">
                <span class="step-number">3</span>
                <strong>Altere sua senha:</strong> Siga as instruções para criar uma nova senha segura
            </div>
            <div class="step">
                <span class="step-number">4</span>
                <strong>Explore:</strong> Navegue pelo sistema conforme suas permissões e funções
            </div>

            <div style="text-align: center;">
                <a href="https://meudads.com.br/login" class="button" style="color: white !important; text-decoration: none;">
                    🚀 Acessar o Sistema
                </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <h4>🤝 Precisa de ajuda?</h4>
                <p>Nossa equipe está pronta para te ajudar:</p>
                <ul>
                    <li>📧 E-mail: <a href="mailto:suporte@meudads.com.br">suporte@meudads.com.br</a></li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>MeuDads - Performance Marketing Hub</strong></p>
            <p>Transformando dados em resultados</p>
            <p>Este é um e-mail automático, não responda diretamente.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateUserWelcomeEmailText(data: UserWelcomeEmailData): string {
    const getUserTypeLabel = (type: string) => {
      switch (type) {
        case 'admin': return 'Administrador';
        case 'client': return 'Cliente';
        case 'user': return 'Usuário';
        default: return type;
      }
    };

    return `
🎉 BEM-VINDO AO MEUDADS!

Olá, ${data.user_name}!

Sua conta foi criada no MeuDads - Performance Marketing Hub como ${getUserTypeLabel(data.user_type)}.

${data.roles.length > 0 ? `
SUAS FUNÇÕES NO SISTEMA:
${data.roles.map(role => `• ${role}`).join('\n')}
` : ''}

🔑 SEUS DADOS DE ACESSO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E-mail: ${data.user_email}
Senha temporária: ${data.temporary_password}
Link de acesso: https://meudads.com.br/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE: Esta é uma senha temporária que DEVE ser alterada no primeiro acesso.

📋 COMO COMEÇAR:
1. Acesse o sistema: https://meudads.com.br/login
2. Faça login com seu e-mail e senha temporária
3. Altere sua senha seguindo as instruções
4. Explore o sistema conforme suas permissões

🤝 PRECISA DE AJUDA?
E-mail: suporte@meudads.com.br

Bem-vindo ao futuro do marketing de performance!

---
MeuDads - Performance Marketing Hub
Transformando dados em resultados
`;
  }
}

export async function createEmailService(env: any): Promise<EmailService | null> {
  try {
    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
      console.warn('[EMAIL-SERVICE] Configuração de email não encontrada, emails serão simulados');
      return null;
    }

    return new EmailService(env.RESEND_API_KEY, env.FROM_EMAIL);
  } catch (error) {
    console.error('[EMAIL-SERVICE] Erro ao inicializar serviço de email:', error);
    return null;
  }
}
