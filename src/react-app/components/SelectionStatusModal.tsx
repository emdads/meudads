import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuth';
import SelectionStatusBadge from './SelectionStatusBadge';

interface Selection {
  id: string;
  note: string;
  status?: string;
  selection_type: string;
  ads_total_count?: number;
  ads_paused_count?: number;
  executed_at?: string;
  executed_by_user_name?: string;
  execution_notes?: string;
}

interface SelectionStatusModalProps {
  selection: Selection;
  onClose: () => void;
  onUpdated: () => void;
}

export default function SelectionStatusModal({ selection, onClose, onUpdated }: SelectionStatusModalProps) {
  const [newStatus, setNewStatus] = useState(selection.status || 'pending');
  const [executionNotes, setExecutionNotes] = useState(selection.execution_notes || '');
  const [adsPausedCount, setAdsPausedCount] = useState(selection.ads_paused_count || 0);
  const [saving, setSaving] = useState(false);
  const fetchWithAuth = useAuthFetch();

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/selections/${selection.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          execution_notes: executionNotes.trim() || null,
          ads_paused_count: newStatus === 'completed' ? adsPausedCount : undefined
        })
      });

      const data = await response.json();

      if (data.ok) {
        alert('Status atualizado com sucesso!');
        onUpdated();
        onClose();
      } else {
        alert(data.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        if (dateString.includes('Z') || dateString.includes('+')) {
          date = new Date(dateString);
        } else {
          date = new Date(dateString + 'Z');
        }
      } else {
        date = new Date(dateString.replace(' ', 'T') + 'Z');
      }
      
      if (isNaN(date.getTime())) return 'Data inválida';

      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      };

      const formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
      return formatted.replace(',', ' às');
    } catch (error) {
      return 'Erro na data';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Atualizar Status da Seleção</h3>
            <p className="text-sm text-slate-500">{selection.note || `Seleção ${selection.id.slice(0, 8)}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status Atual */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900 mb-3">Status Atual</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-700">Status:</span>
                <div className="mt-1">
                  <SelectionStatusBadge status={selection.status as any || 'pending'} />
                </div>
              </div>
              <div>
                <span className="font-medium text-slate-700">Tipo:</span>
                <p className="text-slate-900 mt-1">
                  {selection.selection_type === 'pause' ? 'Para Pausar' : 'Para Ajustar'}
                </p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Total de Anúncios:</span>
                <p className="text-slate-900 mt-1">{selection.ads_total_count || 0}</p>
              </div>
              {selection.ads_paused_count !== undefined && (
                <div>
                  <span className="font-medium text-slate-700">Anúncios Pausados:</span>
                  <p className="text-slate-900 mt-1">{selection.ads_paused_count}</p>
                </div>
              )}
            </div>
            
            {selection.executed_at && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Executado em:</span>
                    <p className="text-slate-900 mt-1">{formatDateTime(selection.executed_at)}</p>
                  </div>
                  {selection.executed_by_user_name && (
                    <div>
                      <span className="font-medium text-slate-700">Executado por:</span>
                      <p className="text-slate-900 mt-1">{selection.executed_by_user_name}</p>
                    </div>
                  )}
                </div>
                
                {selection.execution_notes && (
                  <div className="mt-4">
                    <span className="font-medium text-slate-700">Notas de Execução:</span>
                    <p className="text-slate-900 mt-1 bg-white p-3 rounded border">{selection.execution_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Novo Status */}
          <div className="space-y-6">
            {/* Status management - different for pause vs adjust selections */}
            {selection.selection_type === 'pause' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-blue-600">🔄</span>
                  <h4 className="font-medium text-blue-900">Seleção de Pausar - Status Automático</h4>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Para seleções do tipo "pausar", o status é gerenciado automaticamente pelo sistema:
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-blue-700 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">⏳</span>
                    <span><strong>Pendente</strong> → Aguardando início da execução</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">🔄</span>
                    <span><strong>Em Execução</strong> → Primeiro anúncio pausado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">✅</span>
                    <span><strong>Concluída</strong> → Todos os anúncios pausados</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Status atual:</span>
                    <SelectionStatusBadge status={selection.status as any || 'pending'} />
                  </div>
                  
                  {selection.executed_at && (
                    <div className="text-xs text-slate-600 space-y-1">
                      <div><strong>Concluído em:</strong> {formatDateTime(selection.executed_at)}</div>
                      {selection.executed_by_user_name && (
                        <div><strong>Executado por:</strong> {selection.executed_by_user_name}</div>
                      )}
                      {selection.ads_paused_count !== undefined && selection.ads_total_count && (
                        <div><strong>Progresso:</strong> {selection.ads_paused_count}/{selection.ads_total_count} anúncios pausados</div>
                      )}
                    </div>
                  )}
                  
                  {selection.status === 'completed' && !selection.executed_at && (
                    <div className="text-xs text-green-600">
                      <strong>✅ Concluída</strong> - Todos os anúncios foram pausados
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Novo Status *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'pending', label: 'Pendente', icon: '⏳', color: 'yellow' },
                    { value: 'in_progress', label: 'Em Execução', icon: '🔄', color: 'blue' },
                    { value: 'completed', label: 'Concluída', icon: '✅', color: 'green' },
                    { value: 'cancelled', label: 'Cancelada', icon: '❌', color: 'red' }
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setNewStatus(status.value)}
                      className={`p-3 border-2 rounded-lg transition-all text-left ${
                        newStatus === status.value
                          ? `border-${status.color}-300 bg-${status.color}-50 ring-2 ring-${status.color}-200`
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{status.icon}</span>
                        <span className="font-medium text-slate-900">{status.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {newStatus === 'completed' && selection.selection_type !== 'pause' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantidade de Anúncios Pausados
                </label>
                <input
                  type="number"
                  value={adsPausedCount}
                  onChange={(e) => setAdsPausedCount(parseInt(e.target.value) || 0)}
                  min="0"
                  max={selection.ads_total_count || 0}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Quantos anúncios foram pausados"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Total de anúncios na seleção: {selection.ads_total_count || 0}
                </p>
              </div>
            )}

            {selection.selection_type !== 'pause' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas de Execução (opcional)
                </label>
                <textarea
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Adicione notas sobre a execução desta seleção..."
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            {selection.selection_type === 'pause' ? 'Fechar' : 'Cancelar'}
          </button>
          {selection.selection_type !== 'pause' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Salvando...' : 'Salvar Status'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
