import { useQuery } from '@tanstack/react-query';
import { fetchProviders } from '../../api/chat';
import type { Providers } from '../../types';

const FALLBACK_PROVIDERS: Providers = {
  openai: ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano'],
  google: ['gemini-3.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Google',
};

// Free-tier rate limit hints shown next to Gemini model names.
// RPM = requests per minute, RPD = requests per day.
const GEMINI_RATE_HINTS: Record<string, string> = {
  'gemini-3.0-flash':       'paid only',
  'gemini-2.5-flash':       '10 RPM · 500 RPD',
  'gemini-2.5-flash-lite':  '15 RPM · 1000 RPD',
  'gemini-2.0-flash':       '10 RPM · deprecated',
};

function modelLabel(provider: string, model: string): string {
  if (provider !== 'google') return model;
  const hint = GEMINI_RATE_HINTS[model];
  return hint ? `${model} (${hint})` : model;
}

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
            <option key={m} value={m}>{modelLabel(provider, m)}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
