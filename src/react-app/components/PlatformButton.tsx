import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AD_PLATFORMS } from '../../shared/platforms';

interface PlatformButtonProps {
  platform: string;
  accountCount: number;
  clientSlug: string;
  isActive?: boolean;
}

export default function PlatformButton({ platform, accountCount, clientSlug, isActive = true }: PlatformButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const platformInfo = AD_PLATFORMS[platform];
  
  if (!platformInfo) {
    return null;
  }

  const handleClick = () => {
    if (!isActive) return;
    window.location.href = `/c/${clientSlug}/ads-active?platform=${platform}`;
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={!isActive}
      className={`group w-full bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 text-left transition-all duration-200 ${
        isActive 
          ? 'hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center transition-transform ${
            isHovered && isActive ? 'scale-110' : ''
          }`} style={{ backgroundColor: `${platformInfo.color}20` }}>
            {platformInfo.logo ? (
              <img 
                src={platformInfo.logo} 
                alt={platformInfo.name}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'inline';
                }}
              />
            ) : null}
            <span className={`text-4xl ${platformInfo.logo ? 'hidden' : ''}`}>
              {platformInfo.icon}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {platformInfo.name}
            </h3>
            <p className="text-sm text-slate-600">
              {accountCount} conta{accountCount !== 1 ? 's' : ''} configurada{accountCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-500">
              {platformInfo.description}
            </p>
          </div>
        </div>
        
        {isActive && (
          <ChevronRight className={`w-6 h-6 text-slate-400 transition-transform ${
            isHovered ? 'translate-x-1' : ''
          }`} />
        )}
      </div>
    </button>
  );
}
