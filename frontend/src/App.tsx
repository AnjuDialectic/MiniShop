import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AdminPlaceholderPage } from './features/admin/AdminPlaceholderPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { ProductDetailPage } from './features/catalog/ProductDetailPage';
import { OrderConfirmationPage } from './features/checkout/OrderConfirmationPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppShell>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route
            path="/orders/:id/confirmation"
            element={<OrderConfirmationPage />}
          />
          <Route path="/admin" element={<AdminPlaceholderPage />} />
          <Route path="/admin/*" element={<AdminPlaceholderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
