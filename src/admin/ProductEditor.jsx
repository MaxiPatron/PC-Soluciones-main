import { useEffect, useMemo, useRef, useState } from "react";
import { FaMagic, FaTimes } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { Field, Toggle, useConfirm, useToast } from "./ui";
import {
  costWithIvaArs,
  createSlug,
  formatARS,
  productImage,
  roundPrice,
  suggestedPriceFromCost,
} from "./pricing";

const toForm = (p) => ({
  name: p.name || "",
  slug: p.slug || "",
  brand: p.brand || "",
  category_id: p.category_id ? String(p.category_id) : "",
  description: p.description || "",
  sku: p.sku || "",
  supplier_code: p.supplier_code || "",
  cost_price_usd: p.cost_price_usd ?? "",
  iva: p.iva ?? "",
  price: p.price ?? "",
  stock: p.stock ?? 0,
  image_url: p.image_url || "",
  active: p.active ?? true,
  featured: p.featured ?? false,
  manual_price: p.manual_price ?? false,
});

export default function ProductEditor({ initial, products, categories, exchangeRate, onClose, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const isNew = !initial.id;
  const startForm = useMemo(() => toForm(initial), [initial]);
  const [form, setForm] = useState(startForm);
  // En productos existentes el slug no se toca solo (para no romper links)
  const [slugTouched, setSlugTouched] = useState(!isNew || !!initial.__isCopy);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const firstInput = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(startForm);
  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(),
    [products]
  );

  useEffect(() => {
    firstInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => setImgError(false), [form.image_url]);

  const set = (key, value) =>
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugTouched) next.slug = createSlug(value);
      return next;
    });

  /* ---------- Precio ---------- */
  const usdArs = Number(exchangeRate?.usd_ars || 0);
  const costArs = costWithIvaArs(form.cost_price_usd, form.iva, usdArs);
  const suggested = suggestedPriceFromCost(costArs);
  // Columna creada por supabase/dollar-sync.sql; si no existe todavía no la mandamos
  const hasManualCol = "manual_price" in initial || products.some((p) => "manual_price" in p);
  const followsDollar = Number(form.cost_price_usd) > 0 && usdArs > 0 && !form.manual_price;
  const effectivePrice = followsDollar ? suggested : Number(form.price) || 0;
  const margin = costArs > 0 && effectivePrice > 0 ? ((effectivePrice - costArs) / costArs) * 100 : null;

  /* ---------- Validación ---------- */
  const errors = {};
  if (!form.name.trim()) errors.name = "El nombre es obligatorio";
  if (!form.slug.trim()) errors.slug = "El slug es obligatorio";
  else if (products.some((p) => p.slug === form.slug && p.id !== initial.id))
    errors.slug = "Ya existe otro producto con este slug";
  if (form.sku.trim() && products.some((p) => p.sku === form.sku.trim() && p.id !== initial.id))
    errors.sku = "Ya existe otro producto con este SKU";
  if (Number(form.stock) < 0) errors.stock = "No puede ser negativo";
  const valid = Object.keys(errors).length === 0;
  const [showErrors, setShowErrors] = useState(false);
  const err = (k) => (showErrors || (k === "slug" && form.slug) || (k === "sku" && form.sku) ? errors[k] : null);

  const requestClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en este producto.",
        confirmText: "Descartar",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!valid) {
      setShowErrors(true);
      toast("Revisá los campos marcados", "error");
      return;
    }
    setSaving(true);

    const costUsd = Number(form.cost_price_usd) || null;
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      brand: form.brand.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      description: form.description.trim() || null,
      sku: form.sku.trim() || null,
      supplier_code: form.supplier_code.trim() || null,
      cost_price_usd: costUsd,
      iva: form.iva === "" ? null : Number(form.iva),
      price: effectivePrice,
      stock: Math.max(0, parseInt(form.stock, 10) || 0),
      image_url: form.image_url.trim() || null,
      active: form.active,
      featured: form.featured,
    };
    if (costUsd && usdArs) {
      payload.cost_price = roundPrice(costArs);
      payload.dollar_used = usdArs;
    }
    if (hasManualCol) payload.manual_price = form.manual_price;

    const { error } = isNew
      ? await supabase.from("products").insert([payload])
      : await supabase.from("products").update(payload).eq("id", initial.id);

    setSaving(false);
    if (error) {
      console.error(error);
      toast(`Error al guardar: ${error.message}`, "error");
      return;
    }
    onSaved(isNew ? "Producto creado" : "Producto actualizado");
  };

  // Esc para cerrar, Ctrl/Cmd+S para guardar
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector(".adm-modal")) return; // hay un confirm abierto
      if (e.key === "Escape") requestClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const preview = { ...form, image_url: imgError ? "" : form.image_url };

  return (
    <div className="adm-drawer-backdrop" onMouseDown={requestClose}>
      <form className="adm-drawer" onMouseDown={(e) => e.stopPropagation()} onSubmit={save} noValidate>
        <header className="adm-drawer-header">
          <div>
            <span className="adm-eyebrow">{isNew ? "Nuevo producto" : "Editar producto"}</span>
            <h2>{form.name || "Sin nombre"}</h2>
          </div>
          <button type="button" className="adm-icon-btn" onClick={requestClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </header>

        <div className="adm-drawer-body">
          <section className="adm-form-section">
            <h3>Información</h3>
            <Field label="Nombre *" error={err("name")}>
              <input ref={firstInput} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="adm-grid-2">
              <Field label="Marca">
                <input list="adm-brands" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
                <datalist id="adm-brands">
                  {brands.map((b) => <option key={b} value={b} />)}
                </datalist>
              </Field>
              <Field label="Categoría">
                <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descripción" hint={`${form.description.length} caracteres`}>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field
              label="Slug (URL)"
              error={err("slug")}
              hint={`/producto/${form.slug || "..."}`}
            >
              <div className="adm-input-action">
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", createSlug(e.target.value));
                  }}
                />
                <button
                  type="button"
                  title="Generar desde el nombre"
                  onClick={() => set("slug", createSlug(form.name))}
                >
                  <FaMagic />
                </button>
              </div>
            </Field>
          </section>

          <section className="adm-form-section">
            <h3>Precio</h3>
            <div className="adm-grid-3">
              <Field label="Costo USD (sin IVA)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cost_price_usd}
                  onChange={(e) => set("cost_price_usd", e.target.value)}
                />
              </Field>
              <Field label="IVA %">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  list="adm-iva"
                  value={form.iva}
                  onChange={(e) => set("iva", e.target.value)}
                />
                <datalist id="adm-iva">
                  <option value="10.5" />
                  <option value="21" />
                </datalist>
              </Field>
              <Field
                label="Precio de venta ARS"
                hint={followsDollar ? "Se calcula con el dólar" : null}
              >
                <input
                  type="number"
                  min="0"
                  value={followsDollar ? suggested : form.price}
                  disabled={followsDollar}
                  onChange={(e) => set("price", e.target.value)}
                />
              </Field>
            </div>

            <div className="adm-price-box">
              <div>
                <span>Dólar</span>
                <strong>{usdArs ? formatARS(usdArs) : "—"}</strong>
              </div>
              <div>
                <span>Costo c/IVA</span>
                <strong>{costArs ? formatARS(costArs) : "—"}</strong>
              </div>
              <div>
                <span>Sugerido</span>
                <strong className="accent">{suggested ? formatARS(suggested) : "—"}</strong>
              </div>
              <div>
                <span>Margen</span>
                <strong className={margin !== null && margin < 5 ? "bad" : "good"}>
                  {margin !== null ? `${margin.toFixed(1)}%` : "—"}
                </strong>
              </div>
              {!followsDollar && (
                <button
                  type="button"
                  className="adm-btn ghost small"
                  disabled={!suggested || Number(form.price) === suggested}
                  onClick={() => set("price", suggested)}
                >
                  Usar sugerido
                </button>
              )}
            </div>
            {hasManualCol && Number(form.cost_price_usd) > 0 && (
              <Toggle
                checked={form.manual_price}
                onChange={(v) => {
                  set("manual_price", v);
                  if (v && !Number(form.price)) set("price", suggested);
                }}
                label="Precio fijo (no se actualiza cuando cambia el dólar)"
              />
            )}
            {!Number(form.cost_price_usd) && (
              <p className="adm-muted small">
                Sin costo en USD el precio queda fijo. Cargá el costo para que siga al dólar.
              </p>
            )}
          </section>

          <section className="adm-form-section">
            <h3>Inventario</h3>
            <div className="adm-grid-3">
              <Field label="Stock" error={err("stock")}>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                />
              </Field>
              <Field label="SKU / Part number" error={err("sku")}>
                <input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
              </Field>
              <Field label="Código mayorista">
                <input value={form.supplier_code} onChange={(e) => set("supplier_code", e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="adm-form-section">
            <h3>Imagen</h3>
            <div className="adm-image-row">
              <div className="adm-image-preview">
                <img src={productImage(preview)} alt="" onError={() => setImgError(true)} />
                {!form.image_url && <span>Imagen de la marca</span>}
                {imgError && <span className="bad">No se pudo cargar la URL</span>}
              </div>
              <Field label="URL de la imagen" hint="Si la dejás vacía se usa el logo de la marca">
                <input
                  value={form.image_url}
                  onChange={(e) => set("image_url", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </section>

          <section className="adm-form-section">
            <h3>Visibilidad</h3>
            <div className="adm-toggles">
              <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Visible en la tienda" />
              <Toggle checked={form.featured} onChange={(v) => set("featured", v)} label="Producto destacado" />
            </div>
          </section>
        </div>

        <footer className="adm-drawer-footer">
          <span className="adm-muted small">{dirty ? "Cambios sin guardar · Ctrl+S" : "Sin cambios"}</span>
          <div>
            <button type="button" className="adm-btn ghost" onClick={requestClose}>
              Cancelar
            </button>
            <button type="submit" className="adm-btn primary" disabled={saving || (!isNew && !dirty)}>
              {saving ? "Guardando..." : isNew ? "Crear producto" : "Guardar cambios"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
