import { useQuery } from '@tanstack/react-query';
import { fetchProviders } from '../../api/chat';
import type { Providers } from '../../types';

const FALLBACK_PROVIDERS: Providers = {
  openai: ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Google',
};

interface Props {
  value: string;
  onChange: (model: string) => void;
  className?: string;
}

export default function ModelSelect({ value, onChange, className }: Props) {
  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
    staleTime: 60_000,
  });

  const data = providers ?? FALLBACK_PROVIDERS;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {Object.entries(data).map(([provider, models]) => (
        <optgroup key={provider} label={PROVIDER_LABELS[provider] ?? provider}>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
