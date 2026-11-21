import { useMemo, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaPlusCircle,
  FaSyncAlt,
  FaTimes,
  FaBan,
  FaEquals,
} from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { Toggle, useConfirm, useToast } from "./ui";
import {
  STOCK_MODES,
  buildNewProduct,
  diffSupplier,
  guessRubroCategories,
  readSupplierFile,
} from "./supplierParser";
import { costWithIvaArs, formatUSD, roundPrice, suggestedPriceFromCost } from "./pricing";

const TABS = [
  { key: "update", label: "Con cambios", icon: <FaSyncAlt /> },
  { key: "new", label: "Nuevos", icon: <FaPlusCircle /> },
  { key: "missing", label: "No vienen en el archivo", icon: <FaBan /> },
  { key: "same", label: "Sin cambios", icon: <FaEquals /> },
  { key: "omitted", label: "Omitidos", icon: <FaExclamationTriangle /> },
];

const fmt = (field, v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "Costo USD") return formatUSD(v);
  if (field === "IVA") return `${Number(v)}%`;
  return String(v);
};

// Corre promesas de a "size" en paralelo, avisando el progreso
async function inBatches(list, size, fn, onProgress) {
  const results = [];
  for (let i = 0; i < list.length; i += size) {
    const chunk = list.slice(i, i + size);
    results.push(...(await Promise.all(chunk.map(fn))));
    onProgress?.(Math.min(i + size, list.length));
  }
  return results;
}

export default function SupplierImport({ products, categories, exchangeRate, reloadProducts }) {
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [items, setItems] = useState(null);
  const [readError, setReadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Por defecto: stock disponible en Córdoba. Se recuerda la última elección.
  const [stockMode, setStockModeState] = useState(() => {
    try {
      return localStorage.getItem("import-stock-mode") || "cba";
    } catch {
      return "cba";
    }
  });
  const setStockMode = (v) => {
    setStockModeState(v);
    try {
      localStorage.setItem("import-stock-mode", v);
    } catch {
      // sin almacenamiento: no pasa nada
    }
  };
  const [updatePrice, setUpdatePrice] = useState(true);
  const [updateStock, setUpdateStock] = useState(true);
  const [updateName, setUpdateName] = useState(false);
  const [createNew, setCreateNew] = useState(true);
  const [onlyNewWithStock, setOnlyNewWithStock] = useState(true);
  const [zeroMissing, setZeroMissing] = useState(false);
  const [rubroMap, setRubroMap] = useState({});

  const [tab, setTab] = useState("update");
  const [excluded, setExcluded] = useState(new Set());
  const [applying, setApplying] = useState(null); // {done,total,label}
  const [result, setResult] = useState(null);

  const hasColumn = (k) => products.length > 0 && k in products[0];

  /* ---------- Leer archivo ---------- */
  const handleFile = async (f) => {
    if (!f) return;
    setReadError(null);
    setResult(null);
    setExcluded(new Set());
    try {
      const { items: parsed } = await readSupplierFile(f);
      if (!parsed.length) throw new Error("El archivo no tiene productos.");
      setFile(f);
      setItems(parsed);
      // Sugerir categoría por rubro
      const pre = diffSupplier(parsed, products, { stockMode, updatePrice, updateStock, updateName });
      setRubroMap(guessRubroCategories(parsed, pre.matchedCategoryByCode, categories));
      setTab(pre.changes.some((c) => c.kind === "update") ? "update" : "new");
    } catch (e) {
      console.error(e);
      setReadError(e.message || "No se pudo leer el archivo.");
      setItems(null);
      setFile(null);
    }
  };

  const reset = () => {
    setFile(null);
    setItems(null);
    setResult(null);
    setExcluded(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  /* ---------- Comparación ---------- */
  const analysis = useMemo(() => {
    if (!items) return null;
    const d = diffSupplier(items, products, { stockMode, updatePrice, updateStock, updateName });
    const updates = d.changes.filter((c) => c.kind === "update");
    const same = d.changes.filter((c) => c.kind === "same");
    const codeOnly = same.filter((c) => Object.keys(c.patch).length > 0);
    const newOnes = d.changes.filter((c) => c.kind === "new");
    const newVisible = onlyNewWithStock ? newOnes.filter((c) => c.stock > 0) : newOnes;
    const newSkippedNoStock = newOnes.length - newVisible.length;

    // Productos de las mismas categorías que no vinieron en el archivo
    const mappedCats = new Set(Object.values(rubroMap).filter(Boolean).map(Number));
    const matchedIds = new Set(d.changes.filter((c) => c.product).map((c) => c.product.id));
    const missing = products.filter(
      (p) => mappedCats.has(Number(p.category_id)) && !matchedIds.has(p.id) && Number(p.stock) > 0
    );

    return { ...d, updates, same, codeOnly, newOnes: newVisible, newSkippedNoStock, missing };
  }, [items, products, stockMode, updatePrice, updateStock, updateName, onlyNewWithStock, rubroMap]);

  const rowKey = (kind, x) => `${kind}:${x.item?.code ?? x.id}`;
  const isIncluded = (kind, x) => !excluded.has(rowKey(kind, x));
  const toggleRow = (kind, x) =>
    setExcluded((s) => {
      const n = new Set(s);
      const k = rowKey(kind, x);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const selected = analysis && {
    updates: analysis.updates.filter((c) => isIncluded("update", c)),
    newOnes: createNew ? analysis.newOnes.filter((c) => isIncluded("new", c)) : [],
    missing: zeroMissing ? analysis.missing.filter((p) => isIncluded("missing", p)) : [],
  };
  const totalToApply = selected ? selected.updates.length + selected.newOnes.length + selected.missing.length : 0;

  /* ---------- Aplicar ---------- */
  const usd = Number(exchangeRate?.usd_ars || 0);

  // Calculamos el precio también acá por si la base todavía no tiene el trigger
  const withPrice = (patch, product) => {
    const costUsd = patch.cost_price_usd ?? product?.cost_price_usd;
    const iva = patch.iva ?? product?.iva;
    if (!usd || !(Number(costUsd) > 0) || !("cost_price_usd" in patch || "iva" in patch)) return patch;
    const cost = costWithIvaArs(costUsd, iva, usd);
    const out = { ...patch, cost_price: roundPrice(cost), dollar_used: usd };
    if (!product?.manual_price) out.price = suggestedPriceFromCost(cost);
    return out;
  };

  const apply = async () => {
    const { updates, newOnes, missing } = selected;
    const codeOnly = analysis.codeOnly;
    const ok = await confirm({
      title: "¿Aplicar la importación?",
      message: [
        updates.length && `${updates.length} productos se actualizan`,
        newOnes.length && `${newOnes.length} productos nuevos se crean`,
        missing.length && `${missing.length} productos quedan con stock 0`,
        codeOnly.length && `${codeOnly.length} productos reciben su código de mayorista`,
      ]
        .filter(Boolean)
        .join(" · "),
      confirmText: "Aplicar",
    });
    if (!ok) return;

    const errors = [];
    const now = new Date().toISOString();
    const extra = (patch) => ({
      ...patch,
      ...(hasColumn("last_sync") ? { last_sync: now } : {}),
      ...(hasColumn("supplier_stock") && "stock" in patch ? { supplier_stock: patch.stock } : {}),
    });

    // 1) Actualizaciones (incluye completar códigos)
    const toUpdate = [...updates, ...codeOnly];
    setApplying({ done: 0, total: toUpdate.length, label: "Actualizando productos" });
    await inBatches(
      toUpdate,
      8,
      async (c) => {
        const { error } = await supabase
          .from("products")
          .update(extra(withPrice(c.patch, c.product)))
          .eq("id", c.product.id);
        if (error) errors.push(`${c.product.name}: ${error.message}`);
      },
      (done) => setApplying((a) => ({ ...a, done }))
    );

    // 2) Nuevos
    if (newOnes.length) {
      const existingBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
      const existingSlugs = new Set(products.map((p) => p.slug));
      const rows = newOnes.map((c) =>
        withPrice(
          buildNewProduct(c.item, {
            categoryId: rubroMap[c.item.rubro || "(sin rubro)"],
            stock: c.stock,
            existingBrands,
            existingSlugs,
            hasColumn,
          }),
          null
        )
      );
      setApplying({ done: 0, total: rows.length, label: "Creando productos nuevos" });
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from("products").insert(chunk);
        if (error) errors.push(`Nuevos (${chunk.length}): ${error.message}`);
        setApplying((a) => ({ ...a, done: Math.min(i + 50, rows.length) }));
      }
    }

    // 3) Los que no vinieron → stock 0
    if (missing.length) {
      setApplying({ done: 0, total: missing.length, label: "Poniendo stock 0" });
      const { error } = await supabase
        .from("products")
        .update(extra({ stock: 0 }))
        .in("id", missing.map((p) => p.id));
      if (error) errors.push(`Stock 0: ${error.message}`);
    }

    setApplying(null);
    await reloadProducts();
    setResult({
      updated: toUpdate.length,
      created: newOnes.length,
      zeroed: missing.length,
      errors,
    });
    if (errors.length) {
      const ivaHint = errors.some((e) => /integer/i.test(e));
      toast(
        ivaHint
          ? "Error: la columna IVA no acepta decimales. Corré supabase/dollar-sync.sql y reintentá."
          : `Importación con ${errors.length} errores`,
        "error"
      );
    } else {
      toast("Importación aplicada");
    }
  };

  /* ---------- Render ---------- */
  if (!items) {
    return (
      <div className="adm-import">
        <div
          className={`adm-dropzone ${dragOver ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <FaCloudUploadAlt />
          <h2>Subí la lista del mayorista</h2>
          <p>Arrastrá el archivo .xml que descargás de la página del mayorista, o hacé clic para elegirlo.</p>
          <span className="adm-muted small">También acepta .xlsx y .csv con las mismas columnas</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,.xlsx,.xls,.csv"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {readError && (
          <div className="adm-alert warn">
            <FaExclamationTriangle /> <span>{readError}</span>
          </div>
        )}
        <section className="adm-card adm-import-help">
          <h3>¿Cómo identifica los productos?</h3>
          <ol>
            <li>Primero por el <strong>Código</strong> del mayorista (ej. 49314).</li>
            <li>
              Si el producto todavía no tiene código, por el <strong>Part Number</strong> (= SKU, ej. KF432C16BB/16), y le
              completa el código para la próxima.
            </li>
            <li>
              Antes de guardar te muestra todos los cambios: nada se modifica hasta que tocás <strong>Aplicar</strong>.
            </li>
          </ol>
        </section>
      </div>
    );
  }

  const { updates, same, newOnes, missing, omitted, newSkippedNoStock } = analysis;
  const counts = {
    update: updates.length,
    new: createNew ? newOnes.length : 0,
    missing: zeroMissing ? missing.length : 0,
    same: same.length,
    omitted: omitted.length,
  };
  const rubros = Object.keys(rubroMap);

  return (
    <div className="adm-import">
      {/* ---------- Archivo ---------- */}
      <div className="adm-import-file">
        <FaFileAlt />
        <div>
          <strong>{file?.name}</strong>
          <span className="adm-muted small">
            {items.length} productos en el archivo · {rubros.length} rubro{rubros.length > 1 ? "s" : ""}
          </span>
        </div>
        <button className="adm-btn ghost small" onClick={reset} disabled={!!applying}>
          <FaTimes /> Cambiar archivo
        </button>
      </div>

      {result && (
        <div className={`adm-alert ${result.errors.length ? "warn" : "ok"}`}>
          {result.errors.length ? <FaExclamationTriangle /> : <FaCheckCircle />}
          <span>
            Listo: {result.updated} actualizados · {result.created} nuevos · {result.zeroed} con stock 0.
            {result.errors.length > 0 && (
              <>
                <br />
                {result.errors.slice(0, 5).map((e) => (
                  <small key={e} style={{ display: "block" }}>{e}</small>
                ))}
              </>
            )}
          </span>
        </div>
      )}

      <div className="adm-import-grid">
        {/* ---------- Opciones ---------- */}
        <section className="adm-card">
          <header>
            <h2>Qué actualizar</h2>
          </header>
          <div className="adm-import-options">
            <Toggle checked={updatePrice} onChange={setUpdatePrice} label="Costo en USD e IVA (el precio se recalcula solo)" />
            <Toggle checked={updateStock} onChange={setUpdateStock} label="Stock" />
            {updateStock && (
              <label className="adm-import-select">
                <span>Stock a usar</span>
                <select className="adm-select" value={stockMode} onChange={(e) => setStockMode(e.target.value)}>
                  {Object.entries(STOCK_MODES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            <Toggle checked={updateName} onChange={setUpdateName} label="Nombre (pisa los nombres que editaste a mano)" />
            <hr />
            <Toggle checked={createNew} onChange={setCreateNew} label="Crear los productos nuevos" />
            {createNew && (
              <Toggle checked={onlyNewWithStock} onChange={setOnlyNewWithStock} label="Solo los nuevos que tienen stock" />
            )}
            <Toggle
              checked={zeroMissing}
              onChange={setZeroMissing}
              label="Poner stock 0 a los de estas categorías que no vienen en el archivo"
            />
            {zeroMissing && (
              <p className="adm-muted small">
                Usalo solo si el archivo trae la categoría completa (ej. todas las memorias). Si filtraste en la página
                del mayorista, desactivalo.
              </p>
            )}
          </div>
        </section>

        <section className="adm-card">
          <header>
            <h2>Categoría de los nuevos</h2>
          </header>
          <p className="adm-muted small" style={{ marginBottom: 12 }}>
            Según el rubro del mayorista. La sugerimos según dónde tenés cargados productos parecidos.
          </p>
          <div className="adm-import-rubros">
            {rubros.map((r) => (
              <label key={r}>
                <span>{r}</span>
                <select
                  className="adm-select"
                  value={rubroMap[r] || ""}
                  onChange={(e) => setRubroMap((m) => ({ ...m, [r]: e.target.value }))}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {!usd && (
            <p className="adm-alert warn small">
              <FaExclamationTriangle /> No hay dólar cargado: los precios se van a calcular cuando se sincronice.
            </p>
          )}
        </section>
      </div>

      {/* ---------- Resultado de la comparación ---------- */}
      <div className="adm-import-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.icon} {t.label} <em>{counts[t.key]}</em>
          </button>
        ))}
      </div>

      <div className="adm-table-wrap adm-import-table">
        {tab === "update" && (
          <ImportTable
            rows={updates}
            empty="Ningún producto cambia."
            included={(c) => isIncluded("update", c)}
            onToggle={(c) => toggleRow("update", c)}
            render={(c) => (
              <>
                <td>
                  <span className="adm-prod-name">{c.product.name}</span>
                  <span className="adm-prod-sku">
                    {c.item.code} · {c.item.partNumber || "sin PN"} · por {c.matchedBy}
                  </span>
                </td>
                <td>
                  <div className="adm-diff">
                    {c.diff.map((d) => (
                      <span key={d.field}>
                        <b>{d.field}</b> {fmt(d.field, d.from)} → <strong>{fmt(d.field, d.to)}</strong>
                      </span>
                    ))}
                  </div>
                </td>
              </>
            )}
          />
        )}

        {tab === "new" &&
          (createNew ? (
            <ImportTable
              rows={newOnes}
              empty="No hay productos nuevos."
              included={(c) => isIncluded("new", c)}
              onToggle={(c) => toggleRow("new", c)}
              footer={newSkippedNoStock > 0 && `${newSkippedNoStock} nuevos sin stock no se muestran (opción "Solo los nuevos que tienen stock").`}
              render={(c) => (
                <>
                  <td>
                    <span className="adm-prod-name">{c.item.name}</span>
                    <span className="adm-prod-sku">
                      {c.item.code} · {c.item.partNumber || "sin PN"} · {c.item.brand}
                    </span>
                  </td>
                  <td>
                    <div className="adm-diff">
                      <span><b>Costo</b> {formatUSD(c.item.priceUsd)} + IVA {c.item.iva}%</span>
                      <span><b>Stock</b> {c.stock}</span>
                      <span>
                        <b>Categoría</b>{" "}
                        {categories.find((x) => String(x.id) === rubroMap[c.item.rubro || "(sin rubro)"])?.name || "Sin categoría"}
                      </span>
                    </div>
                  </td>
                </>
              )}
            />
          ) : (
            <div className="adm-empty">Activá "Crear los productos nuevos" para cargarlos.</div>
          ))}

        {tab === "missing" &&
          (zeroMissing ? (
            <ImportTable
              rows={missing}
              empty="Todos los productos de estas categorías vienen en el archivo."
              included={(p) => isIncluded("missing", p)}
              onToggle={(p) => toggleRow("missing", p)}
              render={(p) => (
                <>
                  <td>
                    <span className="adm-prod-name">{p.name}</span>
                    <span className="adm-prod-sku">{p.sku}</span>
                  </td>
                  <td>
                    <div className="adm-diff">
                      <span><b>Stock</b> {p.stock} → <strong>0</strong></span>
                    </div>
                  </td>
                </>
              )}
            />
          ) : (
            <div className="adm-empty">
              {missing.length} productos de estas categorías no vienen en el archivo. No se tocan (activá la opción si querés
              ponerles stock 0).
            </div>
          ))}

        {tab === "same" && (
          <ImportTable
            rows={same}
            empty="—"
            readOnly
            render={(c) => (
              <>
                <td>
                  <span className="adm-prod-name">{c.product.name}</span>
                  <span className="adm-prod-sku">{c.item.code} · {c.item.partNumber}</span>
                </td>
                <td className="adm-muted">
                  {Object.keys(c.patch).length ? "Se completa el código de mayorista" : "Sin cambios"}
                </td>
              </>
            )}
          />
        )}

        {tab === "omitted" && (
          <ImportTable
            rows={omitted}
            empty="No se omitió nada."
            readOnly
            render={(o) => (
              <>
                <td>
                  <span className="adm-prod-name">{o.item.name}</span>
                  <span className="adm-prod-sku">{o.item.code} · {o.item.partNumber || "sin PN"}</span>
                </td>
                <td className="adm-muted">{o.reason}</td>
              </>
            )}
          />
        )}
      </div>

      {/* ---------- Barra de acción ---------- */}
      <div className="adm-import-actionbar">
        {applying ? (
          <div className="adm-progress" style={{ flex: 1, marginTop: 0 }}>
            <div style={{ width: `${applying.total ? (applying.done / applying.total) * 100 : 100}%` }} />
            <span>
              {applying.label}… {applying.done}/{applying.total}
            </span>
          </div>
        ) : (
          <>
            <span className="adm-muted">
              {totalToApply
                ? `${selected.updates.length} a actualizar · ${selected.newOnes.length} nuevos${
                    selected.missing.length ? ` · ${selected.missing.length} a stock 0` : ""
                  }`
                : analysis.codeOnly.length
                ? `Solo se completan ${analysis.codeOnly.length} códigos de mayorista`
                : "No hay nada para aplicar"}
            </span>
            <button
              className="adm-btn primary"
              onClick={apply}
              disabled={!totalToApply && !analysis.codeOnly.length}
            >
              <FaCheckCircle /> Aplicar cambios
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ImportTable({ rows, render, included, onToggle, empty, readOnly, footer }) {
  const [limit, setLimit] = useState(100);
  if (!rows.length) return <div className="adm-empty">{empty}</div>;
  return (
    <>
      <table className="adm-table">
        <tbody>
          {rows.slice(0, limit).map((r, i) => (
            <tr key={r.item?.code ?? r.id ?? i} className={!readOnly && !included(r) ? "inactive" : ""}>
              {!readOnly && (
                <td className="adm-col-check">
                  <input type="checkbox" checked={included(r)} onChange={() => onToggle(r)} />
                </td>
              )}
              {render(r)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && (
        <div className="adm-empty">
          <button className="adm-link" onClick={() => setLimit((l) => l + 200)}>
            Mostrar más ({rows.length - limit} restantes)
          </button>
        </div>
      )}
      {footer && <p className="adm-muted small" style={{ padding: "10px 14px" }}>{footer}</p>}
    </>
  );
}
