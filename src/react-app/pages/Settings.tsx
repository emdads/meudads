import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Bell, 
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [selectionAlerts, setSelectionAlerts] = useState(true);
  const [syncAlerts, setSyncAlerts] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('meudads_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          setEmailNotifications(settings.emailNotifications ?? true);
          setBrowserNotifications(settings.browserNotifications ?? false);
          setSoundNotifications(settings.soundNotifications ?? true);
          setSelectionAlerts(settings.selectionAlerts ?? true);
          setSyncAlerts(settings.syncAlerts ?? false);
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setMessage(null);

    const settings = {
      emailNotifications,
      browserNotifications,
      soundNotifications,
      selectionAlerts,
      syncAlerts
    };

    try {
      // Save to localStorage
      localStorage.setItem('meudads_settings', JSON.stringify(settings));
      
      // Here you could also save to the backend if needed
      // await fetch('/api/user/settings', { method: 'POST', body: JSON.stringify(settings) });
      
      setMessage({ type: 'success', text: 'Configurações de notificação salvas com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações de notificação' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
          <a href="/" className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <span>/</span>
          <span>Notificações</span>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Notificações</h1>
                <p className="text-yellow-100 mt-1">Configure suas preferências de notificação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Configurações de Notificação</h3>
          </div>

          <div className="space-y-6">
            {/* Basic Notification Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Tipos de Notificação</h4>
              
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificações por E-mail</span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-7">Receba alertas importantes por email</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={browserNotifications}
                    onChange={(e) => setBrowserNotifications(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificações do Navegador</span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-7">Pop-ups no canto superior direito da tela</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={soundNotifications}
                    onChange={(e) => setSoundNotifications(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    {soundNotifications ? <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : <VolumeX className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sons de Notificação</span>
                  </div>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-7">Som de alerta para notificações importantes</p>
              </div>
            </div>

            {/* System Alerts */}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Alertas no Sistema</h4>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>💡 Como funcionam:</strong> Os alertas aparecem como pop-ups elegantes no canto superior direito da tela, 
                  com diferentes cores baseadas no tipo (sucesso, aviso, erro). Eles desaparecem automaticamente após alguns segundos.
                </p>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectionAlerts}
                    onChange={(e) => setSelectionAlerts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Novas seleções de anúncios</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={syncAlerts}
                    onChange={(e) => setSyncAlerts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Status de sincronização</span>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-600 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>{isLoading ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
