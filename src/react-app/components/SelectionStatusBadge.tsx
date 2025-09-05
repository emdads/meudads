interface SelectionStatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    icon: '⏳',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  in_progress: {
    label: 'Em Execução',
    icon: '🔄',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  completed: {
    label: 'Concluída',
    icon: '✅',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  cancelled: {
    label: 'Cancelada',
    icon: '❌',
    className: 'bg-red-100 text-red-800 border-red-200'
  }
};

export default function SelectionStatusBadge({ status, className = '' }: SelectionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className} ${className}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
