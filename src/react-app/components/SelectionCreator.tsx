import { useState } from 'react';
import { X, Save, AlertCircle, Edit, Play } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuth';
import AdAccountSelector from './AdAccountSelector';
import { AdAccount } from '../../shared/platforms';

interface SelectionCreatorProps {
  selectedAds: any[];
  onClose: () => void;
  onSaved: () => void;
  clientSlug: string;
}

export default function SelectionCreator({ selectedAds, onClose, onSaved, clientSlug }: SelectionCreatorProps) {
  const [step, setStep] = useState<'accounts' | 'type' | 'reasons' | 'summary'>('accounts');
  const [selectionType, setSelectionType] = useState<'pause' | 'adjust'>('pause');
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  
  const [selectionDescription, setSelectionDescription] = useState('');
  const [adReasons, setAdReasons] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fetchWithAuth = useAuthFetch();

  const updateAdReason = (adId: string, reason: string) => {
    setAdReasons(prev => ({ ...prev, [adId]: reason }));
  };

  

  const canProceedToSummary = () => {
    return selectedAds.every(ad => adReasons[ad.ad_id]?.trim());
  };

  const handleSave = async () => {
    if (!canProceedToSummary()) {
      alert('Por favor, preencha o motivo para todos os anúncios');
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/clients/${clientSlug}/selections`, {
        method: 'POST',
        body: JSON.stringify({
          ad_ids: selectedAds.map(ad => ad.ad_id),
          selection_type: selectionType,
          description: selectionDescription.trim() || null,
          ad_reasons: adReasons
        })
      });

      const data = await response.json();

      if (data.ok) {
        alert('Seleção criada com sucesso!');
        onSaved();
        onClose();
      } else if (data.error === 'ads_already_in_pending_selection') {
        // Handle duplicate ads in pending selections
        const conflictingSelections = data.conflicting_selections || [];
        const totalConflicts = data.total_conflicts || 0;
        
        let message = `⚠️ AVISO: ${totalConflicts} anúncio${totalConflicts > 1 ? 's' : ''} já ${totalConflicts > 1 ? 'estão' : 'está'} em seleções pendentes:\n\n`;
        
        conflictingSelections.forEach((conflict: any) => {
          const statusText = conflict.status === 'pending' ? 'Aguardando' : 'Em Execução';
          const date = new Date(conflict.created_at).toLocaleDateString('pt-BR');
          message += `📋 "${conflict.note}"\n`;
          message += `   👤 Por: ${conflict.user_name}\n`;
          message += `   📅 Criada: ${date}\n`;
          message += `   🔄 Status: ${statusText}\n`;
          message += `   🎯 Anúncios duplicados: ${conflict.duplicate_count}\n\n`;
        });
        
        message += 'Deseja continuar mesmo assim? Os anúncios duplicados aparecerão em múltiplas seleções.';
        
        const shouldContinue = confirm(message);
        
        if (shouldContinue) {
          // Force save by adding a flag to bypass the check
          const forceResponse = await fetchWithAuth(`/api/clients/${clientSlug}/selections`, {
            method: 'POST',
            body: JSON.stringify({
              ad_ids: selectedAds.map(ad => ad.ad_id),
              selection_type: selectionType,
              description: selectionDescription.trim() || null,
              ad_reasons: adReasons,
              force_save: true // Add flag to bypass duplicate check
            })
          });
          
          const forceData = await forceResponse.json();
          
          if (forceData.ok) {
            alert('Seleção criada com sucesso (com anúncios duplicados)!');
            onSaved();
            onClose();
          } else {
            alert(forceData.error || 'Erro ao criar seleção');
          }
        }
      } else {
        alert(data.error || 'Erro ao criar seleção');
      }
    } catch (error) {
      console.error('Error saving selection:', error);
      alert('Erro ao criar seleção');
    } finally {
      setSaving(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'accounts':
        return 'Selecionar Conta de Anúncios';
      case 'type':
        return 'Tipo de Seleção';
      case 'reasons':
        return 'Motivos dos Anúncios';
      case 'summary':
        return 'Resumo da Seleção';
      default:
        return 'Nova Seleção';
    }
  };

  const getTypeIcon = (type: 'pause' | 'adjust') => {
    return type === 'pause' ? 
      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
        <Play className="w-4 h-4 text-red-600 rotate-180" />
      </div> :
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <Edit className="w-4 h-4 text-blue-600" />
      </div>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{getStepTitle()}</h3>
            <p className="text-sm text-slate-500">{selectedAds.length} anúncios selecionados</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Account Selection */}
          {step === 'accounts' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">
                    Selecione uma conta de anúncios
                  </h4>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Escolha a conta de anúncios onde os {selectedAds.length} anúncios selecionados serão gerenciados.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Conta de Anúncios Disponíveis
                </label>
                <AdAccountSelector
                  clientSlug={clientSlug}
                  showAllAccounts={true}
                  selectedAccount={selectedAccount}
                  onAccountSelect={setSelectedAccount}
                  hideManageButton={true}
                  showAccountId={true}
                />
              </div>

              {selectedAccount && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Conta selecionada: {selectedAccount.account_name}
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Cliente: {(selectedAccount as any).client_name} • Plataforma: {selectedAccount.platform}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep('type')}
                  disabled={!selectedAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Selection Type */}
          {step === 'type' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={selectionDescription}
                  onChange={(e) => setSelectionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descrição adicional sobre esta seleção..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Tipo de Seleção *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectionType('pause')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectionType === 'pause'
                        ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                        : 'border-slate-200 hover:border-red-200 hover:bg-red-25'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getTypeIcon('pause')}
                      <div className="text-left">
                        <h4 className="font-medium text-slate-900">Para Pausar Anúncios</h4>
                        <p className="text-sm text-slate-600">
                          Lista para pausar anúncios
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectionType('adjust')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectionType === 'adjust'
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-blue-25'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getTypeIcon('adjust')}
                      <div className="text-left">
                        <h4 className="font-medium text-slate-900">Para Ajustar Anúncios</h4>
                        <p className="text-sm text-slate-600">
                          Lista para revisão e ajustes em anúncios
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-between space-x-3 pt-4">
                <button
                  onClick={() => setStep('accounts')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep('reasons')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ad Reasons */}
          {step === 'reasons' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">
                    Informe o motivo para cada anúncio
                  </h4>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {selectionType === 'pause' 
                    ? 'Descreva por que cada anúncio deve ser pausado'
                    : 'Descreva que ajustes devem ser feitos em cada anúncio'
                  }
                </p>
              </div>

              <div className="space-y-4">
                {selectedAds.map((ad) => (
                  <div key={ad.ad_id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      {ad.creative_thumb && (
                        <img
                          src={ad.creative_thumb}
                          alt="Creative"
                          className="w-16 h-16 rounded-lg object-cover bg-slate-100"
                        />
                      )}
                      <div className="flex-1">
                        <h5 className="font-medium text-slate-900 mb-1">
                          {ad.ad_name || `Anúncio ${ad.ad_id}`}
                        </h5>
                        <p className="text-sm text-slate-600 mb-3">
                          ID: {ad.ad_id}
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Motivo *
                          </label>
                          <textarea
                            value={adReasons[ad.ad_id] || ''}
                            onChange={(e) => updateAdReason(ad.ad_id, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Digite o motivo aqui..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between space-x-3 pt-4">
                <button
                  onClick={() => setStep('type')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep('summary')}
                  disabled={!canProceedToSummary()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  Revisar
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 'summary' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Resumo da Seleção</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Tipo:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {getTypeIcon(selectionType)}
                      <span className="text-slate-900">
                        {selectionType === 'pause' ? 'Para Pausar Anúncios' : 'Para Ajustar Anúncios'}
                      </span>
                    </div>
                  </div>
                  {selectionDescription && (
                    <div className="md:col-span-2">
                      <span className="font-medium text-slate-700">Descrição:</span>
                      <p className="text-slate-900">{selectionDescription}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-slate-700">Conta:</span>
                    <p className="text-slate-900">{selectedAccount?.account_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Anúncios:</span>
                    <p className="text-slate-900">{selectedAds.length} selecionados</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-slate-900">Anúncios e Motivos</h5>
                {selectedAds.map((ad) => (
                  <div key={ad.ad_id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h6 className="font-medium text-slate-900 text-sm">
                        {ad.ad_name || `Anúncio ${ad.ad_id}`}
                      </h6>
                      <span className="text-xs text-slate-500">{ad.ad_id}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                      {adReasons[ad.ad_id]}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between space-x-3 pt-4">
                <button
                  onClick={() => setStep('reasons')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Salvando...' : 'Criar Seleção'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
