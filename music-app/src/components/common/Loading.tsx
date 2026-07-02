import { Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface LoadingProps {
  size?: number;
  className?: string;
  text?: string;
}

export default function Loading({ size = 24, className = '', text }: LoadingProps) {
  const { t } = useI18n();
  const displayText = text || t('common.loading');

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className="animate-spin text-primary" size={size} />
      {displayText && <span className="text-text-secondary text-sm">{displayText}</span>}
    </div>
  );
}
