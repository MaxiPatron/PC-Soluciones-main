import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaDollarSign,
  FaExclamationTriangle,
  FaImage,
  FaStar,
  FaSyncAlt,
  FaTag,
} from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { useConfirm, useToast } from "./ui";
import { formatARS } from "./pricing";

// Cotizaciones disponibles en dolarapi.com
const SOURCES = {
  oficial: "oficial (BNA)",
  mayorista: "mayorista",
  blue: "blue",
  bolsa: "MEP",
  contadoconliqui: "CCL",
  tarjeta: "tarjeta",
  cripto: "cripto",
};

export default function Dashboard({ products, categories, exchangeRate, reloadExchangeRate, reloadProducts }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, setParams] = useSearchParams();
  const [newDollar, setNewDollar] = useState(exchangeRate?.usd_ars ?? "");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.active);
    return {
      total: products.length,
      active: active.length,
      featured: products.filter((p) => p.featured).length,
      noStock: active.filter((p) => Number(p.stock) <= 0).length,
      noImage: products.filter((p) => !p.image_url?.trim()).length,
      noPrice: products.filter((p) => !Number(p.price)).length,
      noCategory: products.filter((p) => !p.category_id).length,
    };
  }, [products]);

  const byCategory = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const key = p.categories?.name || "Sin categoría";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);
  const maxCat = byCategory[0]?.[1] || 1;

  const openFiltered = (filtro) => setParams({ tab: "productos", filtro });

  const followDollar = products.filter((p) => Number(p.cost_price_usd) > 0 && !p.manual_price).length;
  const setupMissing = !exchangeRate || !("checked_at" in exchangeRate);

  const afterChange = async () => {
    await Promise.all([reloadExchangeRate(), reloadProducts()]);
    setSaving(false);
  };

  // Trae el dólar de dolarapi.com desde Supabase (misma función que usa el cron)
  const syncNow = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("sync_dollar");
    if (error) {
      setSaving(false);
      toast(
        error.code === "PGRST202"
          ? "Falta correr supabase/dollar-sync.sql en Supabase"
          : `Error al sincronizar: ${error.message}`,
        "error"
      );
      return;
    }
    toast(
      data?.changed
        ? `Dólar ${formatARS(data.previous)} → ${formatARS(data.usd_ars)}. ${data.products} precios recalculados`
        : `El dólar sigue en ${formatARS(data?.usd_ars)}. Sin cambios`,
      data?.changed ? "success" : "info"
    );
    setNewDollar(data?.usd_ars ?? newDollar);
    await afterChange();
  };

  // Cambiar qué cotización se usa (oficial, mayorista, blue...) y sincronizar
  const changeSource = async (source) => {
    const ok = await confirm({
      title: `¿Usar el dólar ${SOURCES[source]}?`,
      message: `Se va a traer la cotización del dólar ${SOURCES[source]} y se van a recalcular ${followDollar} precios.`,
      confirmText: "Cambiar",
    });
    if (!ok) return;
    setSaving(true);
    const { error } = await supabase.from("exchange_rates").update({ source }).eq("id", 1);
    if (error) {
      setSaving(false);
      toast(`Error: ${error.message}`, "error");
      return;
    }
    await syncNow();
  };

  // Carga manual: el trigger de la base recalcula los precios
  const saveManual = async () => {
    const usdArs = Number(newDollar);
    if (!usdArs || usdArs <= 0) {
      toast("Ingresá un valor de dólar válido", "error");
      return;
    }
    const ok = await confirm({
      title: "¿Cambiar el dólar a mano?",
      message: `Se van a recalcular ${followDollar} productos con un dólar de ${formatARS(usdArs)}. El cron lo va a volver a pisar con el valor real en la próxima sincronización (cada 30 min).`,
      confirmText: "Guardar",
    });
    if (!ok) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("exchange_rates")
      .update({ usd_ars: usdArs, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select();
    if (error || !data?.length) {
      setSaving(false);
      toast(
        error ? `Error: ${error.message}` : "No se pudo guardar (¿corriste supabase/dollar-sync.sql?)",
        "error"
      );
      return;
    }
    toast("Dólar guardado y precios recalculados");
    await afterChange();
  };

  const cards = [
    { label: "Productos", value: stats.total, icon: <FaBoxOpen />, sub: `${stats.active} activos` },
    { label: "Destacados", value: stats.featured, icon: <FaStar />, filtro: "destacados" },
    { label: "Categorías", value: categories.length, icon: <FaTag /> },
    {
      label: "Activos sin stock",
      value: stats.noStock,
      icon: <FaExclamationTriangle />,
      warn: stats.noStock > 0,
      filtro: "sin-stock",
    },
  ];

  const attention = [
    { label: "Sin imagen", value: stats.noImage, filtro: "sin-imagen", icon: <FaImage /> },
    { label: "Sin precio", value: stats.noPrice, filtro: "sin-precio", icon: <FaDollarSign /> },
    { label: "Sin categoría", value: stats.noCategory, filtro: "sin-categoria", icon: <FaTag /> },
    { label: "Activos sin stock", value: stats.noStock, filtro: "sin-stock", icon: <FaBoxOpen /> },
  ];

  return (
    <div className="adm-dashboard">
      <section className="adm-stats">
        {cards.map((c) => (
          <button
            key={c.label}
            className={`adm-stat ${c.warn ? "warn" : ""} ${c.filtro ? "clickable" : ""}`}
            onClick={() => c.filtro && openFiltered(c.filtro)}
            disabled={!c.filtro}
          >
            <span className="adm-stat-icon">{c.icon}</span>
            <span className="adm-stat-label">{c.label}</span>
            <strong>{c.value.toLocaleString("es-AR")}</strong>
            {c.sub && <small>{c.sub}</small>}
          </button>
        ))}
      </section>

      <div className="adm-dash-grid">
        <section className="adm-card adm-dollar">
          <header>
            <h2>Dólar {SOURCES[exchangeRate?.source] || ""}</h2>
            <span className="adm-muted">
              Actualizado:{" "}
              {exchangeRate?.updated_at
                ? new Date(exchangeRate.updated_at).toLocaleString("es-AR")
                : "—"}
            </span>
          </header>
          <p className="adm-dollar-value">
            {exchangeRate ? formatARS(exchangeRate.usd_ars) : "—"}
          </p>

          {setupMissing ? (
            <div className="adm-alert warn">
              <FaExclamationTriangle />
              <span>
                La sincronización automática no está configurada. Corré el archivo{" "}
                <code>supabase/dollar-sync.sql</code> en el SQL Editor de Supabase.
              </span>
            </div>
          ) : (
            <p className="adm-muted small">
              <span className="adm-live-dot" /> Automático cada 30 min desde dolarapi.com · último chequeo{" "}
              {exchangeRate.checked_at ? new Date(exchangeRate.checked_at).toLocaleString("es-AR") : "—"}
              <br />
              {followDollar} productos siguen al dólar ·{" "}
              {products.filter((p) => p.manual_price).length} con precio fijo
            </p>
          )}

          <div className="adm-dollar-form">
            {exchangeRate && "source" in exchangeRate && (
              <select
                className="adm-select"
                value={exchangeRate.source || "oficial"}
                disabled={saving}
                onChange={(e) => changeSource(e.target.value)}
                aria-label="Cotización a usar"
              >
                {Object.entries(SOURCES).map(([k, label]) => (
                  <option key={k} value={k}>Dólar {label}</option>
                ))}
              </select>
            )}
            <button className="adm-btn primary" disabled={saving} onClick={syncNow}>
              <FaSyncAlt className={saving ? "adm-spin" : ""} /> Sincronizar ahora
            </button>
          </div>

          <details className="adm-details">
            <summary>Cargar un valor a mano</summary>
            <div className="adm-dollar-form">
              <div className="adm-input-prefix">
                <span>$</span>
                <input
                  type="number"
                  value={newDollar}
                  onChange={(e) => setNewDollar(e.target.value)}
                  placeholder="Nuevo valor"
                />
              </div>
              <button className="adm-btn ghost" disabled={saving} onClick={saveManual}>
                Guardar y recalcular
              </button>
            </div>
          </details>
        </section>

        <section className="adm-card">
          <header>
            <h2>Necesita atención</h2>
          </header>
          <ul className="adm-attention">
            {attention.map((a) => (
              <li key={a.label}>
                <button onClick={() => openFiltered(a.filtro)} disabled={!a.value}>
                  <span className="adm-attention-icon">{a.icon}</span>
                  <span>{a.label}</span>
                  {a.value > 0 ? (
                    <em>{a.value}</em>
                  ) : (
                    <FaCheckCircle className="adm-ok" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="adm-card adm-span-2">
          <header>
            <h2>Productos por categoría</h2>
          </header>
          <ul className="adm-bars">
            {byCategory.map(([name, count]) => (
              <li key={name}>
                <span className="adm-bars-label">{name}</span>
                <span className="adm-bars-track">
                  <span style={{ width: `${(count / maxCat) * 100}%` }} />
                </span>
                <span className="adm-bars-value">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
