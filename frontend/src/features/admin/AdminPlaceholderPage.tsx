import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function AdminPlaceholderPage() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-2xl py-8">
      <div className="rounded-[14px] border border-hairline bg-surface p-6 text-center shadow-[var(--shadow-card)] sm:p-10">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-subtle text-ink">
          <Shield className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />
        </span>

        <div className="mt-4">
          <Badge variant="neutral">Fase 6 · Admin Dashboard</Badge>
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold text-ink">
          Admin Dashboard Siap Dikerjakan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
          Halaman pengelolaan produk (CRUD) dan daftar order masuk berada di fase berikutnya. Gunakan Storefront untuk mencoba katalog, keranjang, dan checkout.
        </p>

        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            leftIcon={<ArrowLeft className="h-4 w-4 stroke-[2]" aria-hidden="true" />}
          >
            Kembali ke Storefront
          </Button>
        </div>
      </div>
    </section>
  );
}
