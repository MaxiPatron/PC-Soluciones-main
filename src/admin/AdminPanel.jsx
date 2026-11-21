import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaBoxOpen,
  FaChartPie,
  FaExternalLinkAlt,
  FaLayerGroup,
  FaSignOutAlt,
  FaUsers,
  FaBars,
} from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { ConfirmProvider, ToastProvider } from "./ui";
import Dashboard from "./Dashboard";
import ProductsManager from "./ProductsManager";
import CategoriesManager from "./CategoriesManager";
import UsersManager from "./UsersManager";
import "./admin.css";

const TABS = [
  { key: "dashboard", label: "Resumen", icon: <FaChartPie /> },
  { key: "productos", label: "Productos", icon: <FaBoxOpen /> },
  { key: "categorias", label: "Categorías", icon: <FaLayerGroup /> },
  { key: "usuarios", label: "Usuarios", icon: <FaUsers /> },
];

// Supabase devuelve máximo 1000 filas por request: traemos en tandas.
async function fetchAllProducts() {
  const PAGE = 1000;
  let from = 0;
  let all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name, slug)")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export default function AdminPanel() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "dashboard";
  const setTab = (key) => {
    setParams({ tab: key });
    setMenuOpen(false);
  };

  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadProducts = useCallback(async () => {
    setProducts(await fetchAllProducts());
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    setCategories(data || []);
  }, []);

  const loadExchangeRate = useCallback(async () => {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("id", 1)
      .single();
    if (!error) setExchangeRate(data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadProducts(), loadCategories(), loadExchangeRate()]);
      } catch (e) {
        console.error(e);
        setLoadError(e.message || "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProducts, loadCategories, loadExchangeRate]);

  const shared = {
    products,
    setProducts,
    categories,
    exchangeRate,
    reloadProducts: loadProducts,
    reloadCategories: loadCategories,
    reloadExchangeRate: loadExchangeRate,
    goTo: setTab,
  };

  const counts = {
    productos: products.length,
    categorias: categories.length,
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="adm">
          <aside className={`adm-sidebar ${menuOpen ? "open" : ""}`}>
            <Link to="/" className="adm-brand">
              PC <span>Soluciones</span>
              <small>Panel de administración</small>
            </Link>

            <nav className="adm-nav">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={tab === t.key ? "active" : ""}
                  onClick={() => setTab(t.key)}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {counts[t.key] > 0 && <em>{counts[t.key]}</em>}
                </button>
              ))}
            </nav>

            <div className="adm-sidebar-footer">
              <Link to="/productos" className="adm-nav-link">
                <FaExternalLinkAlt /> Ver tienda
              </Link>
              <button
                className="adm-nav-link"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                <FaSignOutAlt /> Cerrar sesión
              </button>
              {user?.email && <p className="adm-user">{user.email}</p>}
            </div>
          </aside>
          {menuOpen && <div className="adm-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

          <main className="adm-main">
            <header className="adm-topbar">
              <button className="adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Menú">
                <FaBars />
              </button>
              <h1>{TABS.find((t) => t.key === tab).label}</h1>
            </header>

            {loading ? (
              <div className="adm-loading">
                <div className="adm-spinner" />
                Cargando datos...
              </div>
            ) : loadError ? (
              <div className="adm-empty error">
                No se pudieron cargar los datos: {loadError}
              </div>
            ) : (
              <>
                {tab === "dashboard" && <Dashboard {...shared} />}
                {tab === "productos" && <ProductsManager {...shared} />}
                {tab === "categorias" && <CategoriesManager {...shared} />}
                {tab === "usuarios" && <UsersManager currentUserId={user?.id} />}
              </>
            )}
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
