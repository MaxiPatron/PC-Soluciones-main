import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Papa from "papaparse";
import {
  FaCopy,
  FaDownload,
  FaEdit,
  FaExternalLinkAlt,
  FaPlus,
  FaRegStar,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaStar,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { Toggle, useConfirm, useToast } from "./ui";
import { formatARS, formatUSD, productImage } from "./pricing";
import ProductEditor from "./ProductEditor";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "destacados", label: "Destacados" },
  { value: "sin-stock", label: "Activos sin stock" },
  { value: "sin-imagen", label: "Sin imagen" },
  { value: "sin-precio", label: "Sin precio" },
  { value: "sin-categoria", label: "Sin categoría" },
  { value: "precio-fijo", label: "Precio fijo" },
  { value: "sin-costo-usd", label: "Sin costo USD" },
];

const matchStatus = (p, status) => {
  switch (status) {
    case "activos": return p.active;
    case "inactivos": return !p.active;
    case "destacados": return p.featured;
    case "sin-stock": return p.active && Number(p.stock) <= 0;
    case "sin-imagen": return !p.image_url?.trim();
    case "sin-precio": return !Number(p.price);
    case "sin-categoria": return !p.category_id;
    case "precio-fijo": return !!p.manual_price;
    case "sin-costo-usd": return !Number(p.cost_price_usd);
    default: return true;
  }
};

const SORTERS = {
  name: (p) => (p.name || "").toLowerCase(),
  brand: (p) => (p.brand || "").toLowerCase(),
  price: (p) => Number(p.price || 0),
  cost_price_usd: (p) => Number(p.cost_price_usd || 0),
  stock: (p) => Number(p.stock || 0),
  created_at: (p) => p.created_at || "",
};

export default function ProductsManager({ products, setProducts, categories, exchangeRate, reloadProducts }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState(params.get("filtro") || "");
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // null | {} (nuevo) | producto

  // Si llegamos desde el resumen con ?filtro=...
  useEffect(() => {
    const f = params.get("filtro");
    if (f !== null) setStatus(f);
  }, [params]);

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (!q ||
          [p.name, p.sku, p.brand, p.supplier_code, p.slug].some((v) =>
            String(v || "").toLowerCase().includes(q)
          )) &&
        (!category || (category === "none" ? !p.category_id : String(p.category_id) === category)) &&
        (!brand || p.brand === brand) &&
        matchStatus(p, status)
    );
    const get = SORTERS[sort.key];
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => (get(a) > get(b) ? dir : get(a) < get(b) ? -dir : 0));
  }, [products, search, category, brand, status, sort]);

  useEffect(() => setPage(1), [search, category, brand, status, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = search || category || brand || status;

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setBrand("");
    setStatus("");
    if (params.get("filtro") !== null) setParams({ tab: "productos" });
  };

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const SortIcon = ({ k }) =>
    sort.key !== k ? <FaSort className="adm-sort-idle" /> : sort.dir === "asc" ? <FaSortUp /> : <FaSortDown />;

  /* ---------- Selección ---------- */
  const allPageSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const togglePage = () => {
    const next = new Set(selected);
    pageItems.forEach((p) => (allPageSelected ? next.delete(p.id) : next.add(p.id)));
    setSelected(next);
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  /* ---------- Updates ---------- */
  const patchLocal = (ids, patch) =>
    setProducts((all) => all.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)));

  // Actualización optimista: cambia en pantalla y revierte si falla
  const quickUpdate = async (prod, patch) => {
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, prod[k]]));
    patchLocal([prod.id], patch);
    const { error } = await supabase.from("products").update(patch).eq("id", prod.id);
    if (error) {
      patchLocal([prod.id], before);
      toast("No se pudo guardar el cambio", "error");
    }
  };

  const bulkUpdate = async (patch, label) => {
    const ids = [...selected];
    const { error } = await supabase.from("products").update(patch).in("id", ids);
    if (error) {
      toast("Error en la acción masiva", "error");
      return;
    }
    patchLocal(ids, patch);
    toast(`${ids.length} productos ${label}`);
  };

  const deleteProducts = async (ids) => {
    const one = ids.length === 1 ? products.find((p) => p.id === ids[0]) : null;
    const ok = await confirm({
      title: one ? "¿Eliminar producto?" : `¿Eliminar ${ids.length} productos?`,
      message: one
        ? `"${one.name}" se va a borrar definitivamente. Si solo querés ocultarlo, desactivalo.`
        : "Esta acción no se puede deshacer. Si solo querés ocultarlos, desactivalos.",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) {
      toast("Error al eliminar", "error");
      return;
    }
    setProducts((all) => all.filter((p) => !ids.includes(p.id)));
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    toast(ids.length === 1 ? "Producto eliminado" : `${ids.length} productos eliminados`);
  };

  const duplicate = (prod) => {
    const { id, created_at, categories: _c, ...rest } = prod;
    setEditing({
      ...rest,
      name: `${prod.name} (copia)`,
      slug: `${prod.slug}-copia`,
      sku: "",
      __isCopy: true,
    });
  };

  const exportCsv = () => {
    const rows = filtered.map((p) => ({
      id: p.id,
      nombre: p.name,
      sku: p.sku || "",
      marca: p.brand || "",
      categoria: p.categories?.name || "",
      costo_usd: p.cost_price_usd || "",
      iva: p.iva || "",
      costo_ars: p.cost_price || "",
      precio: p.price || "",
      stock: p.stock,
      activo: p.active ? "si" : "no",
      destacado: p.featured ? "si" : "no",
      slug: p.slug,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `productos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onSaved = async (msg) => {
    setEditing(null);
    toast(msg);
    await reloadProducts();
  };

  return (
    <div className="adm-products">
      <div className="adm-toolbar">
        <div className="adm-search">
          <FaSearch />
          <input
            placeholder="Buscar por nombre, SKU, marca o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda">
              <FaTimes />
            </button>
          )}
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          <option value="none">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="adm-toolbar-actions">
          <button className="adm-btn ghost" onClick={exportCsv} title="Exportar resultados a CSV">
            <FaDownload /> CSV
          </button>
          <button className="adm-btn primary" onClick={() => setEditing({})}>
            <FaPlus /> Nuevo producto
          </button>
        </div>
      </div>

      <div className="adm-results-bar">
        <span>
          <strong>{filtered.length.toLocaleString("es-AR")}</strong> de {products.length.toLocaleString("es-AR")} productos
        </span>
        {hasFilters && (
          <button className="adm-link" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="adm-bulk">
          <span>{selected.size} seleccionados</span>
          <button onClick={() => bulkUpdate({ active: true }, "activados")}>Activar</button>
          <button onClick={() => bulkUpdate({ active: false }, "desactivados")}>Desactivar</button>
          <button onClick={() => bulkUpdate({ featured: true }, "destacados")}>Destacar</button>
          <button onClick={() => bulkUpdate({ featured: false }, "sin destacar")}>Quitar destacado</button>
          <button className="danger" onClick={() => deleteProducts([...selected])}>
            <FaTrash /> Eliminar
          </button>
          <button className="adm-bulk-close" onClick={() => setSelected(new Set())} aria-label="Deseleccionar">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th className="adm-col-check">
                <input type="checkbox" checked={allPageSelected} onChange={togglePage} />
              </th>
              <th className="sortable" onClick={() => toggleSort("name")}>
                Producto <SortIcon k="name" />
              </th>
              <th className="sortable" onClick={() => toggleSort("brand")}>
                Marca <SortIcon k="brand" />
              </th>
              <th>Categoría</th>
              <th className="sortable num" onClick={() => toggleSort("cost_price_usd")}>
                Costo <SortIcon k="cost_price_usd" />
              </th>
              <th className="sortable num" onClick={() => toggleSort("price")}>
                Precio <SortIcon k="price" />
              </th>
              <th className="sortable num" onClick={() => toggleSort("stock")}>
                Stock <SortIcon k="stock" />
              </th>
              <th className="center">Activo</th>
              <th className="center">Dest.</th>
              <th className="right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => (
              <tr key={p.id} className={`${!p.active ? "inactive" : ""} ${selected.has(p.id) ? "selected" : ""}`}>
                <td className="adm-col-check">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                </td>
                <td>
                  <div className="adm-prod-cell" onClick={() => setEditing(p)}>
                    <img src={productImage(p)} alt="" loading="lazy" />
                    <div>
                      <span className="adm-prod-name">{p.name}</span>
                      <span className="adm-prod-sku">{p.sku || "Sin SKU"}</span>
                    </div>
                  </div>
                </td>
                <td>{p.brand || <span className="adm-muted">—</span>}</td>
                <td>
                  {p.categories?.name || <span className="adm-badge warn">Sin categoría</span>}
                </td>
                <td className="num">
                  <span>{formatUSD(p.cost_price_usd)}</span>
                  {p.iva ? <span className="adm-sub">IVA {Number(p.iva)}%</span> : null}
                </td>
                <td className="num">
                  {Number(p.price) ? (
                    <>
                      <strong>{formatARS(p.price)}</strong>
                      {p.manual_price && Number(p.cost_price_usd) > 0 && (
                        <span className="adm-sub" title="No sigue al dólar">Precio fijo</span>
                      )}
                    </>
                  ) : (
                    <span className="adm-badge warn">Sin precio</span>
                  )}
                </td>
                <td className="num">
                  <StockInput product={p} onSave={(stock) => quickUpdate(p, { stock })} />
                </td>
                <td className="center">
                  <Toggle checked={p.active} onChange={(v) => quickUpdate(p, { active: v })} />
                </td>
                <td className="center">
                  <button
                    className={`adm-star ${p.featured ? "on" : ""}`}
                    onClick={() => quickUpdate(p, { featured: !p.featured })}
                    title={p.featured ? "Quitar destacado" : "Destacar"}
                  >
                    {p.featured ? <FaStar /> : <FaRegStar />}
                  </button>
                </td>
                <td className="right">
                  <div className="adm-row-actions">
                    <button onClick={() => setEditing(p)} title="Editar">
                      <FaEdit />
                    </button>
                    <button onClick={() => duplicate(p)} title="Duplicar">
                      <FaCopy />
                    </button>
                    <a href={`/producto/${p.slug}`} target="_blank" rel="noreferrer" title="Ver en la tienda">
                      <FaExternalLinkAlt />
                    </a>
                    <button className="danger" onClick={() => deleteProducts([p.id])} title="Eliminar">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pageItems.length === 0 && (
          <div className="adm-empty">
            No hay productos que coincidan.
            {hasFilters && (
              <button className="adm-link" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className="adm-pagination">
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>{n} por página</option>
          ))}
        </select>
        <div>
          <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
          <span>
            Página {page} de {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>

      {editing && (
        <ProductEditor
          initial={editing}
          products={products}
          categories={categories}
          exchangeRate={exchangeRate}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function StockInput({ product, onSave }) {
  const [value, setValue] = useState(product.stock ?? 0);
  useEffect(() => setValue(product.stock ?? 0), [product.stock]);

  const commit = () => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setValue(n);
    if (n !== Number(product.stock)) onSave(n);
  };

  return (
    <input
      className={`adm-stock-input ${Number(product.stock) <= 0 ? "zero" : ""}`}
      type="number"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
