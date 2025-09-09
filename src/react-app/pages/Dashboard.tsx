import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { BarChart3, List, Shield, TrendingUp, Users, Target, ArrowRight, Settings, Activity, User } from 'lucide-react';
import PlatformButton from '../components/PlatformButton';

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const fetchWithAuth = useAuthFetch();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPlatforms, setUserPlatforms] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualizar relógio a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(timer);
  }, []);

  // Verificar se é admin e buscar plataformas do usuário
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = hasPermission('dashboard.stats') || hasPermission('clients.view');
        setIsAdmin(adminStatus);
        
        // Se não for admin, buscar plataformas disponíveis para o usuário
        if (!adminStatus) {
          await fetchUserPlatforms();
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkAdmin();
    }
  }, [user]);

  const fetchUserPlatforms = async () => {
    try {
      const response = await fetchWithAuth('/api/user/platforms');
      const data = await response.json();
      
      if (data.ok) {
        setUserPlatforms(data.platforms || []);
      }
    } catch (error) {
      console.error('Erro ao buscar plataformas do usuário:', error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin">
          <BarChart3 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-slate-600">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        {/* Saudação Compacta */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {getGreeting()}! 👋
          </h2>
          <div className="flex items-center justify-center space-x-2 text-slate-600">
            <User className="w-4 h-4" />
            <p className="text-base">
              {user?.name?.split(' ')[0] || user?.email.split('@')[0]} • {isAdmin ? 'Administrador' : 'Cliente'}
            </p>
          </div>
        </div>

        {/* Plataformas do Usuário - Compacto */}
        {!isAdmin && userPlatforms.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Suas Plataformas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPlatforms.map((platform) => (
                <PlatformButton
                  key={`${platform.client_slug}-${platform.platform}`}
                  platform={platform.platform}
                  accountCount={platform.account_count}
                  clientSlug={platform.client_slug}
                  isActive={platform.is_active}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ações Principais - Layout Compacto em Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-600" />
            Ações Principais
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gestão de Clientes */}
            {isAdmin && (
              <a
                href="/clients"
                className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-8 h-8 text-blue-100" />
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="font-semibold mb-1">Gestão de Clientes</h4>
                <p className="text-blue-100 text-sm">Configure clientes e contas</p>
              </a>
            )}

            {/* Ads Ativos */}
            <a
              href="/ads-active"
              className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-4 text-white hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <BarChart3 className="w-8 h-8 text-green-100" />
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold mb-1">Anúncios Ativos</h4>
              <p className="text-green-100 text-sm">Monitor em tempo real</p>
            </a>

            {/* Seleções de Anúncios */}
            <a
              href="/selections"
              className="group bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-4 text-white hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <List className="w-8 h-8 text-purple-100" />
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="font-semibold mb-1">Seleções de Anúncios</h4>
              <p className="text-purple-100 text-sm">Listas salvas</p>
            </a>

            {/* Acompanhamento de Performance - Placeholder */}
            <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-4 text-white opacity-75 cursor-not-allowed">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-orange-100" />
                <span className="text-xs bg-orange-400 px-2 py-1 rounded-full">Em breve</span>
              </div>
              <h4 className="font-semibold mb-1">Performance</h4>
              <p className="text-orange-100 text-sm">Relatórios avançados</p>
            </div>
          </div>
        </div>

        {/* Administração - Separado para Admin */}
        {isAdmin && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-600" />
              Administração
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="/users"
                className="group bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Gestão de Usuários</h4>
                    <p className="text-sm text-slate-600">Usuários e permissões</p>
                  </div>
                </div>
              </a>

              <a
                href="/permission-management"
                className="group bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-purple-300 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Gestão de Permissões</h4>
                    <p className="text-sm text-slate-600">Permissões detalhadas</p>
                  </div>
                </div>
              </a>

              <a
                href="/setup"
                className="group bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Setup do Sistema</h4>
                    <p className="text-sm text-slate-600">Configurações avançadas</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* Curiosidade e Motivação do Dia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Curiosidade do Dia */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-white text-sm">🧠</span>
              </div>
              <div>
                <p className="text-slate-700 font-medium text-sm leading-relaxed">
                  {(() => {
                    const curiosidades = [
                      { text: "Taxa de clique no Facebook: média de 0,9%, mas campanhas bem feitas chegam a 5%", fonte: "Facebook Business" },
                      { text: "85% das pessoas pesquisam online antes de comprar, mesmo em lojas físicas", fonte: "Google Consumer Insights" },
                      { text: "Anúncios com vídeos geram 27% mais cliques que imagens paradas", fonte: "Wordstream Marketing Research" },
                      { text: "Reconquistar clientes custa 5x menos que conseguir novos", fonte: "Harvard Business Review" },
                      { text: "Emails para carrinho abandonado recuperam 29% das vendas perdidas", fonte: "Baymard Institute" },
                      { text: "Páginas com apenas 1 botão de ação convertem 371% mais", fonte: "HubSpot Marketing Statistics" },
                      { text: "69% das pessoas desistem de comprar se o processo é muito longo", fonte: "Baymard Institute Study" },
                      { text: "Instagram tem 23% mais engajamento que Facebook nos anúncios", fonte: "Hootsuite Social Media Report" },
                      { text: "Google processa 8,5 bilhões de buscas por dia no mundo", fonte: "Internet Live Stats" },
                      { text: "Remarketing converte 150% mais que anúncios para pessoas novas", fonte: "Google Ads Research" },
                      { text: "46% das buscas no Google são para encontrar lojas ou serviços locais", fonte: "Google My Business Insights" },
                      { text: "Vídeos vão representar 82% de todo tráfego na internet até 2024", fonte: "Cisco Visual Networking Index" },
                      { text: "Tempo de atenção online: apenas 8 segundos para prender o usuário", fonte: "Microsoft Research Study" },
                      { text: "Avaliações online influenciam 93% das decisões de compra", fonte: "BrightLocal Consumer Survey" },
                      { text: "Testes A/B bem feitos aumentam resultado em 49% em média", fonte: "Optimizely Research" },
                      { text: "58% de todas as buscas no Google são feitas pelo celular", fonte: "Google Search Statistics" },
                      { text: "Chatbots podem reduzir custos de atendimento em até 30%", fonte: "IBM Watson Study" },
                      { text: "Personalização pode aumentar vendas em 15% e eficiência em 30%", fonte: "McKinsey Global Institute" },
                      { text: "75% das pessoas nunca passam da primeira página do Google", fonte: "Advanced Web Ranking Study" },
                      { text: "Remarcar para quem já visitou o site custa 76% menos", fonte: "AdRoll Marketing Report" },
                      { text: "Leads gerados por marketing custam 61% menos que métodos tradicionais", fonte: "Marketo Lead Generation Report" },
                      { text: "Anúncios das 19h às 21h convertem 15% mais", fonte: "Facebook Ads Manager Data" },
                      { text: "Melhorar retenção em 5% pode aumentar lucro em até 95%", fonte: "Bain & Company Research" },
                      { text: "Tráfego orgânico (SEO) converte 8,5x melhor que redes sociais pagas", fonte: "BrightEdge SEO Report" },
                      { text: "86% dos consumidores pagam mais por uma experiência melhor", fonte: "PWC Customer Experience Survey" },
                      { text: "Segmentar por comportamento gera 200% mais cliques que por idade/sexo", fonte: "Mailchimp Email Research" },
                      { text: "Pop-ups de saída (quando vai fechar a página) recuperam 35% dos visitantes", fonte: "Sumo Conversion Research" },
                      { text: "Cada R$ 1 investido em influenciadores gera R$ 5,78 de retorno", fonte: "Influencer Marketing Hub Study" },
                      { text: "77% dos consumidores preferem marcas que compartilham seus valores", fonte: "Cone Communications Study" },
                      { text: "Checkout em uma página só aumenta vendas em 21,8%", fonte: "Formisimo Checkout Research" },
                      { text: "Custo do Google Ads aumenta 15% por ano devido à concorrência", fonte: "WordStream PPC Report" }
                    ];
                    const hoje = new Date();
                    const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
                    const indice = diaDoAno % curiosidades.length;
                    const curiosidadeDoDia = curiosidades[indice];
                    return curiosidadeDoDia.text;
                  })()}
                </p>
                <p className="text-slate-500 text-xs mt-1 italic">
                  Curiosidade do dia • Fonte: {(() => {
                    const curiosidades = [
                      { text: "O CTR médio no Facebook Ads é 0,9%, mas campanhas otimizadas podem alcançar 3-5%", fonte: "Facebook Business" },
                      { text: "85% dos consumidores fazem pesquisas online antes de comprar, mesmo em lojas físicas", fonte: "Google Consumer Insights" },
                      { text: "Anúncios com vídeos têm 27% mais taxa de cliques que banners estáticos", fonte: "Wordstream Marketing Research" },
                      { text: "O custo de aquisição é 5x menor para clientes que retornam vs. novos clientes", fonte: "Harvard Business Review" },
                      { text: "Emails de carrinho abandonado recuperam 29% das vendas perdidas em média", fonte: "Baymard Institute" },
                      { text: "Landing pages com apenas um CTA aumentam conversões em 371%", fonte: "HubSpot Marketing Statistics" },
                      { text: "69% dos usuários abandonam o checkout se o processo for muito longo", fonte: "Baymard Institute Study" },
                      { text: "Anúncios no Instagram têm 23% mais engajamento que no Facebook", fonte: "Hootsuite Social Media Report" },
                      { text: "O Google processa mais de 8,5 bilhões de buscas por dia", fonte: "Internet Live Stats" },
                      { text: "Remarketing aumenta as conversões em até 150% comparado a campanhas frias", fonte: "Google Ads Research" },
                      { text: "46% das buscas no Google são locais - crucial para negócios físicos", fonte: "Google My Business Insights" },
                      { text: "Vídeos representam 82% de todo tráfego de internet até 2024", fonte: "Cisco Visual Networking Index" },
                      { text: "O tempo médio de atenção online é de apenas 8 segundos", fonte: "Microsoft Research Study" },
                      { text: "Reviews online influenciam 93% das decisões de compra", fonte: "BrightLocal Consumer Survey" },
                      { text: "Campanhas A/B aumentam ROI em média 49% quando bem executadas", fonte: "Optimizely Research" },
                      { text: "O mobile representa 58% de todas as buscas no Google", fonte: "Google Search Statistics" },
                      { text: "Chatbots podem reduzir custos de atendimento em até 30%", fonte: "IBM Watson Study" },
                      { text: "Personalização pode aumentar receitas em 5-15% e eficiência em 10-30%", fonte: "McKinsey Global Institute" },
                      { text: "75% dos usuários nunca passam da primeira página do Google", fonte: "Advanced Web Ranking Study" },
                      { text: "O retargeting custa 76% menos que adquirir novos clientes", fonte: "AdRoll Marketing Report" },
                      { text: "Leads qualificados por marketing custam 61% menos que métodos tradicionais", fonte: "Marketo Lead Generation Report" },
                      { text: "Anúncios em horários de pico (19h-21h) têm 15% mais conversões", fonte: "Facebook Ads Manager Data" },
                      { text: "5% de aumento na retenção pode aumentar lucros em 25-95%", fonte: "Bain & Company Research" },
                      { text: "O tráfego orgânico converte 8,5x melhor que redes sociais pagas", fonte: "BrightEdge SEO Report" },
                      { text: "86% dos compradores pagam mais por melhor experiência do usuário", fonte: "PWC Customer Experience Survey" },
                      { text: "Segmentação por comportamento aumenta CTR em 200% vs. demográfica", fonte: "Mailchimp Email Research" },
                      { text: "Pop-ups com intenção de saída recuperam 35% dos visitantes", fonte: "Sumo Conversion Research" },
                      { text: "Influencer marketing gera $5,78 para cada $1 investido", fonte: "Influencer Marketing Hub Study" },
                      { text: "77% dos consumidores escolhem marcas que compartilham seus valores", fonte: "Cone Communications Study" },
                      { text: "Checkout em uma página aumenta conversões em 21,8%", fonte: "Formisimo Checkout Research" },
                      { text: "O custo do Google Ads aumenta 15% ano a ano devido à competição", fonte: "WordStream PPC Report" }
                    ];
                    const hoje = new Date();
                    const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
                    const indice = diaDoAno % curiosidades.length;
                    const curiosidadeDoDia = curiosidades[indice];
                    return curiosidadeDoDia.fonte;
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Frase Motivacional */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-white text-sm">⚡</span>
              </div>
              <div>
                <p className="text-slate-700 font-medium text-sm leading-relaxed">
                  {(() => {
                    const motivacionais = [
                      "Cada teste A/B te leva mais perto do resultado perfeito",
                      "Dados não mentem. Confie nos números, não no 'achismo'",
                      "Transforme cada real investido em resultado concreto",
                      "O melhor momento para melhorar uma campanha é agora mesmo",
                      "Mire no público certo. Precisão gera muito mais vendas",
                      "Resultados altos vêm de análise profunda e ação rápida",
                      "Cada clique desperdiçado é dinheiro jogado fora",
                      "Criatividade sem dados é só gasto bonito",
                      "Conheça cada passo do seu cliente até a compra",
                      "Remarketing é sobre relacionamento inteligente, não perseguição",
                      "Valor do cliente maior que custo de aquisição = sucesso",
                      "Páginas que vendem falam a língua do cliente",
                      "Métricas bonitas não pagam conta. Foque no que vende",
                      "Saiba exatamente de onde vêm seus melhores resultados",
                      "Automação sem estratégia é como dirigir de olhos fechados",
                      "Trate cada cliente como único, mesmo sendo milhões",
                      "Primeiro clique conquista. Último clique converte",
                      "Teste tudo. Não assuma nada. Prove sempre",
                      "Marketing digital é como xadrez: pense, execute, adapte",
                      "Dados do passado ensinam. Dados de agora transformam",
                      "Cada segundo de demora na página é venda perdida",
                      "Campanhas que dão certo nascem de 1% inspiração e 99% análise",
                      "Alimente o algoritmo com dados bons, ele te dará resultados bons",
                      "Muita concorrência? Ótimo! Significa que tem dinheiro no mercado",
                      "Aumente o que funciona. Pare o que não funciona. Teste o resto",
                      "Valor total do cliente é o destino. Custo de aquisição é o caminho",
                      "Funil de vendas é como receita: cada etapa na hora certa",
                      "Celular em primeiro lugar não é futuro, é realidade de anos",
                      "Saber de onde vem cada venda separa profissionais de amadores",
                      "Sazonalidade não é problema. É oportunidade de ouro",
                      "Marketing digital é maratona. Consistência vence pressa"
                    ];
                    const hoje = new Date();
                    const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
                    const indice = (diaDoAno + 15) % motivacionais.length; // Offset para não coincidir com curiosidades
                    return motivacionais[indice];
                  })()}
                </p>
                <p className="text-slate-500 text-xs mt-1 italic">Motivação do dia • Transformando dados em resultados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status do Sistema */}
        <div className="mb-6">
          <div className="bg-white/70 rounded-lg border border-slate-200 p-3 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-slate-600 font-medium">Sistema Operacional</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Minimalista */}
        <div className="text-center">
          <span className="text-slate-400 text-xs">© 2025 MeuDads - Performance Marketing Hub</span>
        </div>
      </main>
    </div>
  );
}
