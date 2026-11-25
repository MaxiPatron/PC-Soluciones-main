import { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowDown, FaArrowUp, FaDollarSign, FaEquals, FaSearch, FaTimes } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { formatARS, formatUSD, productImage } from "./pricing";
import LineChart from "./LineChart";

const PERIODS = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "1 año" },
];

const CURRENCIES = {
  ars: { label: "Precio de venta (ARS)", short: "precio de venta", fmt: formatARS },
  usd: { label: "Costo mayorista (USD)", short: "costo en USD", fmt: formatUSD },
};

// Variaciones menores a esto se consideran "sin cambios" (redondeos)
const EPS = 0.05;

const pctText = (v) =>
  `${v > 0 ? "+" : ""}${v.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const Change = ({ pct }) => {
  if (pct == null || Number.isNaN(pct)) return <span className="adm-muted">—</span>;
  const dir = pct > EPS ? "up" : pct < -EPS ? "down" : "flat";
  return (
    <span className={`adm-change ${dir}`}>
      {dir === "up" ? <FaArrowUp /> : dir === "down" ? <FaArrowDown /> : <FaEquals />}
      {pctText(pct)}
    </span>
  );
};

const isMissingSetup = (error) =>
  error?.code === "PGRST202" ||
  error?.code === "42P01" ||
  /price_changes|price_index|price_history|dollar_history/.test(error?.message || "");

export default function PriceStats({ products, categories }) {
  const [days, setDays] = useState(30);
  const [currency, setCurrency] = useState("ars");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setupMissing, setSetupMissing] = useState(false);
  const [changes, setChanges] = useState([]);
  const [index, setIndex] = useState([]);
  const [dollar, setDollar] = useState([]);

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const [history, setHistory] = useState([]);
  const productRef = useRef(null);

  const fmt = CURRENCIES[currency].fmt;

  /* ---------- Carga de datos ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [ch, ix, dl, dlPrev] = await Promise.all([
        supabase.rpc("price_changes", { p_days: days, p_currency: currency }),
        supabase.rpc("price_index", {
          p_days: days,
          p_currency: currency,
          p_category: category ? Number(category) : null,
        }),
        supabase
          .from("dollar_history")
          .select("changed_at, usd_ars")
          .gte("changed_at", since)
          .order("changed_at", { ascending: true })
          .limit(2000),
        supabase
          .from("dollar_history")
          .select("changed_at, usd_ars")
          .lt("changed_at", since)
          .order("changed_at", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;

      const firstError = ch.error || ix.error || dl.error;
      if (firstError) {
        console.error(firstError);
        if (isMissingSetup(firstError)) setSetupMissing(true);
        else setError(firstError.message);
        setLoading(false);
        return;
      }
      setSetupMissing(false);
      setChanges(ch.data || []);
      setIndex(ix.data || []);
      // El valor que tenía el dólar al empezar el período va como primer punto
      const prev = dlPrev.data?.[0];
      setDollar([...(prev ? [{ ...prev, changed_at: since }] : []), ...(dl.data || [])]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days, currency, category]);

  // Historial del producto elegido
  useEffect(() => {
    if (!picked) return;
    let cancelled = false;
    supabase
      .from("price_history")
      .select("changed_at, price, cost_usd, dollar")
      .eq("product_id", picked.id)
      .order("changed_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setHistory(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [picked]);

  /* ---------- Cálculos ---------- */
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const rows = useMemo(
    () =>
      changes
        .map((c) => {
          const p = byId.get(c.product_id);
          const s = Number(c.start_value);
          const e = Number(c.end_value);
          return p && s > 0 ? { p, s, e, pct: ((e - s) / s) * 100, n: c.changes } : null;
        })
        .filter(Boolean),
    [changes, byId]
  );

  const scoped = useMemo(
    () => (category ? rows.filter((r) => String(r.p.category_id) === category) : rows),
    [rows, category]
  );

  const summary = useMemo(() => {
    const up = scoped.filter((r) => r.pct > EPS).length;
    const down = scoped.filter((r) => r.pct < -EPS).length;
    const avg = scoped.length ? scoped.reduce((a, r) => a + r.pct, 0) / scoped.length : null;
    return { up, down, same: scoped.length - up - down, avg };
  }, [scoped]);

  const byCategory = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.p.category_id ?? "none";
      if (!map.has(key)) map.set(key, { key, name: catName.get(r.p.category_id) || "Sin categoría", list: [] });
      map.get(key).list.push(r);
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        total: g.list.length,
        up: g.list.filter((r) => r.pct > EPS).length,
        down: g.list.filter((r) => r.pct < -EPS).length,
        avg: g.list.reduce((a, r) => a + r.pct, 0) / g.list.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [rows, catName]);

  const maxAbsCat = Math.max(1, ...byCategory.map((g) => Math.abs(g.avg)));

  const topUp = useMemo(
    () => scoped.filter((r) => r.pct > EPS).sort((a, b) => b.pct - a.pct).slice(0, 8),
    [scoped]
  );
  const topDown = useMemo(
    () => scoped.filter((r) => r.pct < -EPS).sort((a, b) => a.pct - b.pct).slice(0, 8),
    [scoped]
  );

  const indexPoints = useMemo(
    () => index.map((r) => ({ x: new Date(`${r.bucket}T12:00:00`), y: Number(r.idx), note: `${r.products} productos` })),
    [index]
  );
  const indexChange = indexPoints.length > 1 ? indexPoints[indexPoints.length - 1].y - 100 : null;

  const dollarPoints = useMemo(
    () => dollar.map((r) => ({ x: new Date(r.changed_at), y: Number(r.usd_ars) })),
    [dollar]
  );
  const dollarStart = dollarPoints[0]?.y;
  const dollarNow = dollarPoints[dollarPoints.length - 1]?.y;
  const dollarPct = dollarStart && dollarNow ? ((dollarNow - dollarStart) / dollarStart) * 100 : null;

  // Producto individual
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) => [p.name, p.sku, p.brand].some((v) => String(v || "").toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, products]);

  const historyPoints = useMemo(() => {
    const key = currency === "usd" ? "cost_usd" : "price";
    const pts = history
      .filter((h) => Number(h[key]) > 0)
      .map((h) => ({
        x: new Date(h.changed_at),
        y: Number(h[key]),
        note: h.dollar ? `Dólar ${formatARS(h.dollar)}` : null,
      }));
    // estirar el último valor hasta hoy
    if (pts.length) pts.push({ ...pts[pts.length - 1], x: new Date() });
    return pts;
  }, [history, currency]);

  const historyRows = useMemo(() => {
    const key = currency === "usd" ? "cost_usd" : "price";
    const list = history.filter((h) => Number(h[key]) > 0);
    return list
      .map((h, i) => {
        const prev = i > 0 ? Number(list[i - 1][key]) : null;
        const v = Number(h[key]);
        return { ...h, v, pct: prev ? ((v - prev) / prev) * 100 : null };
      })
      // si cambió la otra moneda pero esta no, no es un cambio para mostrar
      .filter((h) => h.pct == null || Math.abs(h.pct) > 0.001)
      .reverse();
  }, [history, currency]);

  const pick = (p) => {
    setPicked(p);
    setQuery("");
    setHistory([]);
    setTimeout(() => productRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  /* ---------- Render ---------- */
  if (setupMissing) {
    return (
      <div className="adm-card">
        <div className="adm-alert warn">
          Falta activar el historial de precios. Abrí Supabase → SQL Editor, pegá todo el archivo{" "}
          <code>supabase/price-history.sql</code> y dale a Run. Después recargá esta página.
        </div>
      </div>
    );
  }

  const noMovement = !loading && scoped.length > 0 && summary.up + summary.down === 0;

  return (
    <div className="adm-prices">
      <div className="adm-prices-controls">
        <div className="adm-seg" role="group" aria-label="Período">
          {PERIODS.map((p) => (
            <button key={p.days} className={days === p.days ? "active" : ""} onClick={() => setDays(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        <select className="adm-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {Object.entries(CURRENCIES).map(([k, c]) => (
            <option key={k} value={k}>{c.label}</option>
          ))}
        </select>
        <select className="adm-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {loading && <div className="adm-spinner" aria-label="Cargando" />}
      </div>

      {error && <div className="adm-alert">No se pudieron cargar las estadísticas: {error}</div>}

      {noMovement && (
        <div className="adm-alert ok small">
          En este período no se registraron cambios de {CURRENCIES[currency].short}. El historial arranca el día que
          corriste <code>price-history.sql</code> y se va llenando solo con cada cambio del dólar o importación del
          mayorista.
        </div>
      )}

      {/* ---------- Resumen ---------- */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat-icon"><FaDollarSign /></span>
          <span className="adm-stat-label">Dólar</span>
          <strong>{dollarNow ? formatARS(dollarNow) : "—"}</strong>
          <small>
            <Change pct={dollarPct} /> en el período
          </small>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-icon up"><FaArrowUp /></span>
          <span className="adm-stat-label">Subieron</span>
          <strong>{summary.up}</strong>
          <small>productos</small>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-icon down"><FaArrowDown /></span>
          <span className="adm-stat-label">Bajaron</span>
          <strong>{summary.down}</strong>
          <small>productos</small>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-icon"><FaEquals /></span>
          <span className="adm-stat-label">Variación promedio</span>
          <strong>{summary.avg == null ? "—" : pctText(summary.avg)}</strong>
          <small>{summary.same} sin cambios</small>
        </div>
      </div>

      <div className="adm-dash-grid">
        <section className="adm-card">
          <header>
            <h2>Evolución de precios</h2>
            {indexChange != null && <Change pct={indexChange} />}
          </header>
          <p className="adm-muted small adm-chart-help">
            Promedio del {CURRENCIES[currency].short}
            {category ? ` en ${catName.get(Number(category)) || "la categoría"}` : " de todos los productos"}. 100 = cómo
            estaban al inicio del período; 105 = 5% más caros.
          </p>
          <LineChart
            points={indexPoints}
            baseline={100}
            format={(v) => v.toFixed(1)}
            label="Índice de precios"
          />
        </section>

        <section className="adm-card">
          <header>
            <h2>Dólar</h2>
            <Change pct={dollarPct} />
          </header>
          <p className="adm-muted small adm-chart-help">Cotización usada para calcular los precios en pesos.</p>
          <LineChart
            points={dollarPoints}
            step
            format={(v) => `$${Math.round(v).toLocaleString("es-AR")}`}
            label="Evolución del dólar"
          />
        </section>

        {/* ---------- Por categoría ---------- */}
        <section className="adm-card adm-span-2">
          <header>
            <h2>Por categoría</h2>
            <span className="adm-muted small">Tocá una para filtrar todo por esa categoría</span>
          </header>
          {byCategory.length === 0 ? (
            <div className="adm-chart-empty">Sin datos.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-cat-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th className="num">Productos</th>
                    <th className="num">Subieron</th>
                    <th className="num">Bajaron</th>
                    <th className="num">Variación prom.</th>
                    <th className="adm-diverge-head" aria-hidden="true"></th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((g) => (
                    <tr
                      key={g.key}
                      className={`clickable ${String(g.key) === category ? "selected" : ""}`}
                      onClick={() => g.key !== "none" && setCategory(String(g.key) === category ? "" : String(g.key))}
                    >
                      <td>{g.name}</td>
                      <td className="num">{g.total}</td>
                      <td className="num">{g.up || <span className="adm-muted">0</span>}</td>
                      <td className="num">{g.down || <span className="adm-muted">0</span>}</td>
                      <td className="num"><Change pct={g.avg} /></td>
                      <td>
                        <div className="adm-diverge" title={pctText(g.avg)}>
                          <span className="adm-diverge-mid" />
                          {Math.abs(g.avg) > EPS && (
                            <span
                              className={`adm-diverge-bar ${g.avg > 0 ? "up" : "down"}`}
                              style={{ width: `${(Math.abs(g.avg) / maxAbsCat) * 50}%` }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Más subas / bajas ---------- */}
        {[
          { title: "Las que más subieron", list: topUp, empty: "Ningún producto subió en este período." },
          { title: "Las que más bajaron", list: topDown, empty: "Ningún producto bajó en este período." },
        ].map((box) => (
          <section className="adm-card" key={box.title}>
            <header>
              <h2>{box.title}</h2>
            </header>
            {box.list.length === 0 ? (
              <div className="adm-chart-empty">{box.empty}</div>
            ) : (
              <ul className="adm-movers">
                {box.list.map((r) => (
                  <li key={r.p.id}>
                    <button onClick={() => pick(r.p)}>
                      <img src={productImage(r.p)} alt="" loading="lazy" />
                      <span className="adm-movers-name">
                        {r.p.name}
                        <small>
                          {fmt(r.s)} → {fmt(r.e)}
                        </small>
                      </span>
                      <Change pct={r.pct} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* ---------- Producto individual ---------- */}
        <section className="adm-card adm-span-2" ref={productRef}>
          <header>
            <h2>Historial de un producto</h2>
          </header>

          <div className="adm-product-search">
            <div className="adm-search">
              <FaSearch />
              <input
                placeholder="Buscá un producto por nombre, SKU o marca..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
                  <FaTimes />
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <ul className="adm-suggest">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => pick(p)}>
                      <img src={productImage(p)} alt="" loading="lazy" />
                      <span>
                        {p.name}
                        <small>{p.sku}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!picked ? (
            <div className="adm-chart-empty">
              Elegí un producto (o tocá uno de las listas de arriba) para ver cómo cambió su precio.
            </div>
          ) : (
            <div className="adm-product-history">
              <div className="adm-product-history-head">
                <img src={productImage(picked)} alt="" />
                <div>
                  <strong>{picked.name}</strong>
                  <span className="adm-muted small">
                    {picked.sku} · ahora {currency === "usd" ? formatUSD(picked.cost_price_usd) : formatARS(picked.price)}
                  </span>
                </div>
                <button className="adm-btn ghost small" onClick={() => setPicked(null)}>
                  <FaTimes /> Cerrar
                </button>
              </div>

              <LineChart
                points={historyPoints}
                step
                format={(v) => (currency === "usd" ? formatUSD(v) : formatARS(v))}
                formatDate={(d) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                label={`Historial de ${picked.name}`}
              />

              {historyRows.length > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th className="num">{currency === "usd" ? "Costo USD" : "Precio"}</th>
                        <th className="num">Cambio</th>
                        <th className="num">Dólar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.slice(0, 30).map((h, i) => (
                        <tr key={i}>
                          <td>
                            {new Date(h.changed_at).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="num">{fmt(h.v)}</td>
                          <td className="num">
                            {h.pct == null ? <span className="adm-muted small">inicio</span> : <Change pct={h.pct} />}
                          </td>
                          <td className="num">{h.dollar ? formatARS(h.dollar) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
