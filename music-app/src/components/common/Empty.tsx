import { Music2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface EmptyProps {
  text?: string;
  className?: string;
}

export default function Empty({ text, className = '' }: EmptyProps) {
  const { t } = useI18n();
  const displayText = text || t('common.noContent');

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <Music2 className="text-text-tertiary" size={40} />
      <span className="text-text-secondary text-sm">{displayText}</span>
    </div>
  );
}
