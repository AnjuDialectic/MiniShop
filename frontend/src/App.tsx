import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, RefreshCw, ShoppingBag } from 'lucide-react';

interface HealthPayload {
  status: string;
  database: string;
  driver: string;
  timestamp: string;
}

interface HealthResponse {
  success: boolean;
  message: string;
  data?: HealthPayload;
}

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthPayload }
  | { kind: 'error'; message: string };

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

async function fetchBackendHealth(signal?: AbortSignal): Promise<HealthState> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    const body = (await response.json()) as HealthResponse;

    if (!response.ok || !body.success || !body.data) {
      return { kind: 'error', message: body.message || `HTTP ${response.status}` };
    }

    return { kind: 'ok', data: body.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghubungi REST API.';
    return { kind: 'error', message };
  }
}

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  const handleRetry = useCallback(async () => {
    setHealth({ kind: 'loading' });
    setHealth(await fetchBackendHealth());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchBackendHealth(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setHealth(result);
      }
    });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-ink text-surface">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-ink">MiniShop</span>
              <p className="text-xs text-ink-secondary">Editorial Retail Foundation</p>
            </div>
          </div>

          <span className="rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-medium text-accent">
            Fase 0 Ready
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="rounded-[14px] border border-hairline bg-surface p-6 shadow-[0_1px_2px_rgba(22,22,20,0.04)] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                Environment &amp; API Bootstrap
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-ink-secondary">
                Frontend React + Vite + TypeScript + Tailwind CSS terhubung dengan design tokens{' '}
                <span className="font-medium text-ink">Editorial Warm Minimalism</span> dan REST API Laravel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={health.kind === 'loading'}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-surface transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${health.kind === 'loading' ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Uji Koneksi API</span>
            </button>
          </div>

          <div className="mt-6 border-t border-hairline pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] border border-hairline bg-subtle/60 p-4">
                <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-ink-secondary uppercase">
                  <Database className="h-4 w-4" aria-hidden="true" />
                  <span>API Endpoint</span>
                </div>
                <p className="mt-2 break-all font-mono text-sm text-ink">{API_BASE_URL}/health</p>
              </div>

              <div className="rounded-[10px] border border-hairline bg-subtle/60 p-4">
                <div className="text-xs font-medium tracking-wide text-ink-secondary uppercase">
                  Status Backend
                </div>

                {health.kind === 'loading' && (
                  <p className="mt-2 text-sm text-ink-secondary">Memeriksa koneksi REST API…</p>
                )}

                {health.kind === 'ok' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Terhubung</span>
                    </span>
                    <span className="font-mono text-xs text-ink-secondary tabular-nums">
                      driver: {health.data.driver} · db: {health.data.database}
                    </span>
                  </div>
                )}

                {health.kind === 'error' && (
                  <div className="mt-2 flex items-start gap-2 rounded-[10px] bg-danger-bg px-3 py-2 text-xs text-danger">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{health.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
