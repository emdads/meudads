import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { 
  TrendingUp, 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  ChevronDown,
  Clock
} from 'lucide-react';

export default function GlobalHeader() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const menuRef = useRef<HTMLDivElement>(null);

  // Atualizar relógio a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fechar menu quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
      try {
        await logout();
        window.location.href = '/login';
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao sair do sistema');
      }
    }
  };

  const formatCurrentDateTime = () => {
    return currentTime.toLocaleString('pt-BR', {
      weekday: 'short',
      year: 'numeric',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path === '/clients') return 'Gestão de Clientes';
    if (path === '/users') return 'Gestão de Usuários';
    if (path === '/permission-management') return 'Gestão de Permissões';
    if (path === '/setup') return 'Setup do Sistema';
    if (path === '/ads-active') return 'Anúncios Ativos';
    if (path === '/selections') return 'Seleções de Anúncios';
    if (path.includes('/ads/active')) return 'Anúncios do Cliente';
    if (path.includes('/accounts')) return 'Contas de Anúncios';
    if (path === '/admin/email-test') return 'Teste de Email';
    
    return 'MeuDads';
  };

  // Não mostrar o header nas páginas de login e outras páginas públicas
  if (location.pathname === '/login' || location.pathname === '/privacy-policy' || !user) {
    return null;
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e Título da Página */}
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MeuDads
                </h1>
                <p className="text-xs text-slate-500 leading-tight -mt-1">Performance Marketing Hub</p>
              </div>
            </a>
            
            <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
            
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-slate-900">
                {getPageTitle()}
              </h2>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Data e Hora */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{formatCurrentDateTime()}</span>
            </div>

            <div className="h-6 w-px bg-slate-300 hidden md:block"></div>

            {/* Menu do Usuário */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-900 truncate max-w-32">
                    {getGreeting()}!
                  </p>
                  <p className="text-xs text-slate-600 truncate max-w-32">
                    {user?.name?.split(' ')[0] || user?.email.split('@')[0]}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user?.name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {user?.name || user?.email.split('@')[0]}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          {user?.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {isAdmin() && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Online
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <a
                      href="/profile"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Meu Perfil</span>
                    </a>
                    
                    <a
                      href="/notifications"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Notificações</span>
                    </a>

                    {isAdmin() && (
                      <>
                        <div className="border-t border-slate-200 my-2"></div>
                        <a
                          href="/permission-management"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="w-4 h-4 text-slate-400" />
                          <span>Permissões</span>
                        </a>
                        <a
                          href="/setup"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Setup do Sistema</span>
                        </a>
                      </>
                    )}

                    <div className="border-t border-slate-200 my-2"></div>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
