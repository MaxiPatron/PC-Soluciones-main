import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaFilter, FaTimes, FaWhatsapp, FaCartPlus, FaCheck } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import FilterSidebar from "../components/FilterSidebar";
import "../components/ProductsPage.css";
import { useCart } from "../components/CartContext";
import {
  SHOW_PRICES,
  hasPrice,
  priceLabel,
  productImage,
  productWhatsappText,
  whatsappLink,
  FALLBACK_IMAGE,
} from "../utils/store";

const PAGE_STEP = 24;

const SORTS = {
  relevance: { label: "Más recientes", fn: null },
  ...(SHOW_PRICES && {
    "price-asc": {
      label: "Menor precio",
      // Los "consultar precio" van al final
      fn: (a, b) => (Number(a.price) || Infinity) - (Number(b.price) || Infinity),
    },
    "price-desc": { label: "Mayor precio", fn: (a, b) => Number(b.price || 0) - Number(a.price || 0) },
  }),
  featured: { label: "Destacados primero", fn: (a, b) => Number(!!b.featured) - Number(!!a.featured) },
  "name-asc": { label: "Nombre A-Z", fn: (a, b) => a.name.localeCompare(b.name) },
  "stock-first": { label: "En stock primero", fn: (a, b) => Number(b.stock > 0) - Number(a.stock > 0) },
};

const emptyFilters = { categories: [], brands: [], storage: [], stock: "" };

async function fetchActiveProducts() {
  const PAGE = 1000;
  let from = 0;
  let all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name, slug)")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const ProductsPage = () => {
  const location = useLocation();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState(emptyFilters);
  const [sort, setSort] = useState("relevance");
  const [visible, setVisible] = useState(PAGE_STEP);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState(null);

  // Leer filtros de la URL (buscador del navbar, categorías del home, marcas)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setSearch(q.get("search") || "");
    setSelectedFilters({
      ...emptyFilters,
      categories: q.get("categoria") ? [q.get("categoria")] : [],
      brands: q.get("brand") ? [q.get("brand")] : [],
    });
  }, [location.search]);

  useEffect(() => {
    fetchActiveProducts()
      .then(setProducts)
      .catch((e) => console.error("Error al obtener productos:", e))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter(
      (p) =>
        (!q || [p.name, p.brand, p.sku].some((v) => String(v || "").toLowerCase().includes(q))) &&
        (!selectedFilters.categories.length || selectedFilters.categories.includes(p.categories?.slug)) &&
        (!selectedFilters.brands.length || selectedFilters.brands.includes(p.brand)) &&
        (!selectedFilters.storage.length ||
          selectedFilters.storage.some((t) => p.name.toLowerCase().includes(t.toLowerCase()))) &&
        (selectedFilters.stock !== "in-stock" || p.stock > 0) &&
        (selectedFilters.stock !== "out-of-stock" || p.stock <= 0)
    );
    const fn = SORTS[sort].fn;
    if (fn) list = [...list].sort(fn);
    return list;
  }, [products, search, selectedFilters, sort]);

  useEffect(() => setVisible(PAGE_STEP), [search, selectedFilters, sort]);

  // Chips de filtros activos
  const chips = [
    ...(search ? [{ key: "search", label: `"${search}"`, clear: () => setSearch("") }] : []),
    ...selectedFilters.categories.map((c) => ({
      key: `c-${c}`,
      label: products.find((p) => p.categories?.slug === c)?.categories?.name || c,
      clear: () => setSelectedFilters((f) => ({ ...f, categories: f.categories.filter((x) => x !== c) })),
    })),
    ...selectedFilters.brands.map((b) => ({
      key: `b-${b}`,
      label: b,
      clear: () => setSelectedFilters((f) => ({ ...f, brands: f.brands.filter((x) => x !== b) })),
    })),
    ...selectedFilters.storage.map((s) => ({
      key: `s-${s}`,
      label: s,
      clear: () => setSelectedFilters((f) => ({ ...f, storage: f.storage.filter((x) => x !== s) })),
    })),
    ...(selectedFilters.stock
      ? [{
          key: "stock",
          label: selectedFilters.stock === "in-stock" ? "En stock" : "Agotado",
          clear: () => setSelectedFilters((f) => ({ ...f, stock: "" })),
        }]
      : []),
  ];

  const clearAll = () => {
    setSearch("");
    setSelectedFilters(emptyFilters);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  const activeCount = chips.length;

  return (
    <div>
      <NavBar />

      <main className="products-page">
        <section className="products-hero">
          <span className="section-eyebrow">Catálogo</span>
          <h1>
            Productos <span className="text-accent">disponibles</span>
          </h1>
          <p>Componentes, periféricos y hardware seleccionado.</p>
        </section>

        <section className="products-layout">
          <aside className={`filters-panel ${filtersOpen ? "open" : ""}`}>
            <div className="filters-panel-header">
              <h3>Filtros</h3>
              <button onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
                <FaTimes />
              </button>
            </div>
            <FilterSidebar onFilterChange={setSelectedFilters} selectedFilters={selectedFilters} />
            <button className="filters-apply" onClick={() => setFiltersOpen(false)}>
              Ver {filteredProducts.length} productos
            </button>
          </aside>
          {filtersOpen && <div className="filters-backdrop" onClick={() => setFiltersOpen(false)} />}

          <div className="products-content">
            <div className="products-topbar">
              <h2>
                {loading ? "Cargando..." : `${filteredProducts.length} productos`}
              </h2>
              <div className="products-topbar-actions">
                <button className="filters-toggle" onClick={() => setFiltersOpen(true)}>
                  <FaFilter /> Filtros {activeCount > 0 && <em>{activeCount}</em>}
                </button>
                <label className="sort-select">
                  <span>Ordenar</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    {Object.entries(SORTS).map(([k, s]) => (
                      <option key={k} value={k}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="filter-chips">
                {chips.map((c) => (
                  <button key={c.key} onClick={c.clear}>
                    {c.label} <FaTimes />
                  </button>
                ))}
                <button className="clear" onClick={clearAll}>
                  Limpiar todo
                </button>
              </div>
            )}

            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="product-card skeleton-card">
                    <div className="skeleton" style={{ height: 210, borderRadius: 0 }} />
                    <div className="product-info">
                      <div className="skeleton" style={{ height: 12, width: "35%" }} />
                      <div className="skeleton" style={{ height: 16, marginTop: 14 }} />
                      <div className="skeleton" style={{ height: 16, width: "70%", marginTop: 8 }} />
                      <div className="skeleton" style={{ height: 40, marginTop: 24 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="product-grid">
                  {filteredProducts.slice(0, visible).map((product) => {
                    const added = addedProductId === product.id;
                    const inStock = product.stock > 0;
                    return (
                      <article key={product.id} className="product-card">
                        <Link to={`/producto/${product.slug}`} className="product-image">
                          <img
                            src={productImage(product)}
                            alt={product.name}
                            loading="lazy"
                            onError={(e) => {
                              if (!e.currentTarget.src.endsWith(FALLBACK_IMAGE)) e.currentTarget.src = FALLBACK_IMAGE;
                            }}
                          />
                          <span className={inStock ? "stock ok" : "stock no"}>
                            {inStock ? "En stock" : "Agotado"}
                          </span>
                        </Link>

                        <div className="product-info">
                          <div className="product-meta">
                            <span className="product-brand">{product.brand}</span>
                            {product.categories?.name && (
                              <span className="product-cat">{product.categories.name}</span>
                            )}
                          </div>
                          <Link to={`/producto/${product.slug}`} className="product-name">
                            <h3>{product.name}</h3>
                          </Link>

                          <p className={`product-price ${hasPrice(product) ? "" : "ask"}`}>
                            {priceLabel(product)}
                          </p>

                          <div className="product-actions">
                            <button
                              className={`product-btn ${added ? "added" : ""}`}
                              onClick={() => handleAddToCart(product)}
                            >
                              {added ? <><FaCheck /> Agregado</> : <><FaCartPlus /> Agregar</>}
                            </button>
                            <a
                              className="product-btn whatsapp"
                              href={whatsappLink(productWhatsappText(product))}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Consultar por WhatsApp"
                              title="Consultar por WhatsApp"
                            >
                              <FaWhatsapp />
                            </a>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {visible < filteredProducts.length && (
                  <div className="load-more">
                    <p>
                      Mostrando {visible} de {filteredProducts.length}
                    </p>
                    <button onClick={() => setVisible((v) => v + PAGE_STEP)}>Mostrar más</button>
                  </div>
                )}
              </>
            ) : (
              <div className="products-empty">
                <h3>No encontramos productos</h3>
                <p>Probá con otra búsqueda o sacá algunos filtros.</p>
                {chips.length > 0 && <button onClick={clearAll}>Limpiar filtros</button>}
                <a href={whatsappLink("Hola! Estoy buscando un producto que no encontré en la web.")} target="_blank" rel="noreferrer">
                  <FaWhatsapp /> ¿No lo encontrás? Preguntanos
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProductsPage;
