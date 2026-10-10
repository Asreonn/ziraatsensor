import { useState, type FormEvent } from 'react';
import { AicoLogo } from '@/components/brand/AicoLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthProvider';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = mode === 'signin' ? 'Giris yap' : 'Hesap olustur';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signin') {
        await signIn({ email, password });
      } else {
        await signUp({ email, password });
        setMessage('Hesap olusturuldu. Otomatik giris yapiliyor...');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Bir hata olustu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,252,243,0.92))] p-8 shadow-[0_30px_90px_-55px_rgba(7,130,95,0.75)]">
          <AicoLogo className="w-48" />
          <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight text-foreground">Supabase baglantisi gerekli</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Auth ve kullaniciya ait havuz verisi icin once Supabase URL ve anon key bilgilerini
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">.env.local</code>
            icine koyun.
          </p>
          <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-card/85 p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-foreground">
{`VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
          </div>
          <div className="mt-4 rounded-[1.4rem] border border-border/70 bg-card/85 p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-foreground">
{`supabase start
supabase db push`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,252,243,0.92))] p-8 shadow-[0_30px_90px_-55px_rgba(7,130,95,0.75)]">
        <AicoLogo className="w-44" />
        <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight text-foreground">AICO hesabinizla giris yapin</h1>

        <div className="mt-6 grid grid-cols-2 rounded-full border border-border/70 bg-white/76 p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Giris
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Kayit
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck={false}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Sifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-status-critical">{error}</p>}
          {message && <p className="text-sm text-status-healthy">{message}</p>}

          <Button className="w-full rounded-full" disabled={submitting} type="submit">
            {submitting ? 'Isleniyor...' : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
