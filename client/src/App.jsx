import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TaxonomyProvider } from './context/TaxonomyContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import Landing from './pages/Landing';
import Catalog from './pages/Catalog';
import Categories from './pages/Categories';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import EnConstruccion from './pages/EnConstruccion';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* La taxonomía (categorías y marcas) se carga una sola vez y la
            comparten la portada, el catálogo y la página de categorías. */}
        <TaxonomyProvider>
          <a className="saltar-al-contenido" href="#contenido">
            Saltar al contenido
          </a>
          <Navbar />

          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/products" element={<Catalog />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="*" element={<EnConstruccion />} />
          </Routes>

          <Footer />
        </TaxonomyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
