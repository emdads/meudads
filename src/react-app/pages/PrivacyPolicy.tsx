import { Shield, Eye, Database, Mail, Lock, Users } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div>

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
          <a href="/" className="text-blue-600 hover:text-blue-700">
            Dashboard
          </a>
          <span>/</span>
          <span>Política de Privacidade</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header da política */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Política de Privacidade</h2>
                <p className="text-blue-100 mt-2">MeuDads - Performance Marketing Hub</p>
                <p className="text-blue-200 text-sm mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-8">
            {/* Introdução */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">1. Introdução</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <p>
                  Esta Política de Privacidade descreve como o <strong>MeuDads</strong> coleta, usa, 
                  armazena e protege suas informações pessoais quando você utiliza nossa plataforma 
                  de gestão de performance marketing.
                </p>
                <p>
                  Ao utilizar o MeuDads, você concorda com as práticas descritas nesta política. 
                  Comprometemo-nos a proteger sua privacidade e manter a transparência sobre como 
                  seus dados são utilizados.
                </p>
              </div>
            </section>

            {/* Dados coletados */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">2. Dados Coletados</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <h4 className="font-semibold text-slate-800">2.1 Informações de Conta</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Nome completo e endereço de e-mail</li>
                  <li>Informações de login e senhas criptografadas</li>
                  <li>Tipo de usuário e permissões de acesso</li>
                  <li>Data de criação e último acesso</li>
                </ul>

                <h4 className="font-semibold text-slate-800">2.2 Dados de Anúncios</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Métricas de performance de campanhas publicitárias</li>
                  <li>Dados de anúncios das plataformas Meta, Google, TikTok e Pinterest</li>
                  <li>Informações de contas de anúncios vinculadas</li>
                  <li>Histórico de seleções e ações realizadas</li>
                </ul>

                <h4 className="font-semibold text-slate-800">2.3 Dados de Uso</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Logs de acesso e navegação na plataforma</li>
                  <li>Endereços IP e informações do dispositivo</li>
                  <li>Sessões de usuário e tempo de utilização</li>
                </ul>
              </div>
            </section>

            {/* Como utilizamos */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">3. Como Utilizamos Seus Dados</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Operação da plataforma:</strong> Fornecer acesso e funcionalidades do sistema</li>
                  <li><strong>Análise de performance:</strong> Gerar relatórios e insights de campanhas</li>
                  <li><strong>Comunicação:</strong> Enviar notificações relevantes sobre sua conta</li>
                  <li><strong>Segurança:</strong> Proteger contra acessos não autorizados</li>
                  <li><strong>Suporte técnico:</strong> Resolver problemas e melhorar a experiência</li>
                  <li><strong>Desenvolvimento:</strong> Aprimorar funcionalidades e criar novos recursos</li>
                </ul>
              </div>
            </section>

            {/* Compartilhamento */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">4. Compartilhamento de Dados</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <p><strong>Não vendemos seus dados pessoais.</strong> Compartilhamos informações apenas nos seguintes casos:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Plataformas de anúncios:</strong> Acesso autorizado às APIs do Meta, Google, TikTok e Pinterest</li>
                  <li><strong>Equipe interna:</strong> Funcionários autorizados para suporte e desenvolvimento</li>
                  <li><strong>Obrigações legais:</strong> Quando exigido por lei ou ordem judicial</li>
                  <li><strong>Provedores de serviço:</strong> Parceiros técnicos sob acordo de confidencialidade</li>
                </ul>
              </div>
            </section>

            {/* Segurança */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">5. Segurança e Proteção</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Criptografia:</strong> Dados sensíveis são criptografados em trânsito e em repouso</li>
                  <li><strong>Autenticação:</strong> Sistema de login seguro com tokens de sessão</li>
                  <li><strong>Controle de acesso:</strong> Permissões granulares por usuário e função</li>
                  <li><strong>Monitoramento:</strong> Logs de segurança e detecção de atividades suspeitas</li>
                  <li><strong>Backup:</strong> Cópias de segurança regulares em ambiente protegido</li>
                </ul>
              </div>
            </section>

            {/* Seus direitos */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">6. Seus Direitos</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <p>De acordo com a LGPD, você tem os seguintes direitos:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Acesso:</strong> Solicitar informações sobre seus dados pessoais</li>
                  <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
                  <li><strong>Exclusão:</strong> Solicitar a remoção de seus dados (quando aplicável)</li>
                  <li><strong>Portabilidade:</strong> Obter cópia de seus dados em formato estruturado</li>
                  <li><strong>Oposição:</strong> Contestar o tratamento de seus dados</li>
                  <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
                </ul>
              </div>
            </section>

            {/* Retenção */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">7. Retenção de Dados</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Dados de conta:</strong> Mantidos enquanto a conta estiver ativa</li>
                  <li><strong>Dados de anúncios:</strong> Mantidos por até 5 anos para fins analíticos</li>
                  <li><strong>Logs de acesso:</strong> Mantidos por 12 meses para segurança</li>
                  <li><strong>Dados excluídos:</strong> Removidos permanentemente em até 30 dias</li>
                </ul>
              </div>
            </section>

            {/* Contato */}
            <section>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">8. Contato</h3>
              </div>
              <div className="text-slate-700 space-y-4">
                <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta política:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p><strong>Suporte:</strong> suporte@meudads.com.br</p>
                </div>
              </div>
            </section>

            {/* Alterações */}
            <section>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-2">Alterações nesta Política</h4>
                <p className="text-blue-800 text-sm">
                  Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças 
                  significativas por e-mail ou através da plataforma. A versão mais recente 
                  sempre estará disponível nesta página.
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-6">
              <div className="text-center text-sm text-slate-500">
                <p>© {new Date().getFullYear()} MeuDads - Performance Marketing Hub</p>
                <p className="mt-1">Todos os direitos reservados • Desenvolvido com segurança e transparência</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
