import { useEffect, useMemo, useRef, useState } from "react";
import { FaCheck, FaExclamationTriangle, FaImage, FaSave, FaSearch, FaStop, FaGoogle } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { useConfirm, useToast } from "./ui";
import { productImage } from "./pricing";
import { buildQuery, getSerpAccount, rankCandidates, searchImages } from "./imageSearch";
import ImagePicker from "./ImagePicker";

const BATCHES = [10, 25, 50, 100];

export default function ImagesManager({ products, categories, reloadProducts }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [account, setAccount] = useState(null);
  const [category, setCategory] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [batch, setBatch] = useState(25);
  const [results, setResults] = useState([]); // {product, query, candidates, chosen, include, status, error}
  const [running, setRunning] = useState(null); // {done,total}
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);
  const stopRef = useRef(false);

  useEffect(() => {
    getSerpAccount().then(setAccount);
  }, []);

  const pending = useMemo(() => {
    const inResults = new Set(results.map((r) => r.product.id));
    return products
      .filter((p) => !inResults.has(p.id))
      .filter((p) => !onlyMissing || !p.image_url?.trim())
      .filter((p) => !onlyInStock || (p.active && Number(p.stock) > 0))
      .filter((p) => !category || String(p.category_id) === category)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.stock) - Number(a.stock));
  }, [products, results, onlyMissing, onlyInStock, category]);

  const missingTotal = products.filter((p) => !p.image_url?.trim()).length;

  const patchResult = (id, patch) =>
    setResults((rs) => rs.map((r) => (r.product.id === id ? { ...r, ...patch } : r)));

  /* ---------- Buscar ---------- */
  const run = async () => {
    const list = pending.slice(0, batch);
    if (!list.length) return;
    const left = account?.searches_left;
    const ok = await confirm({
      title: `¿Buscar imágenes para ${list.length} productos?`,
      message:
        `Usa ${list.length} búsquedas de SerpAPI` +
        (left != null ? ` (te quedan ${left} este mes).` : ".") +
        " Después revisás las fotos antes de guardarlas.",
      confirmText: "Buscar",
    });
    if (!ok) return;

    stopRef.current = false;
    setResults((rs) => [
      ...list.map((p) => ({ product: p, query: buildQuery(p), candidates: [], chosen: null, include: false, status: "pending" })),
      ...rs,
    ]);
    setRunning({ done: 0, total: list.length });

    let done = 0;
    for (let i = 0; i < list.length; i += 2) {
      if (stopRef.current) break;
      await Promise.all(
        list.slice(i, i + 2).map(async (p) => {
          patchResult(p.id, { status: "loading" });
          try {
            const ranked = rankCandidates(await searchImages(buildQuery(p), 12), p);
            const best = ranked.find((c) => c.score > -5);
            patchResult(p.id, {
              candidates: ranked,
              chosen: best?.original || null,
              include: !!best,
              status: best ? "done" : "empty",
            });
          } catch (err) {
            patchResult(p.id, { status: "error", error: err.message });
            if (/Falta/.test(err.message)) stopRef.current = true;
          }
        })
      );
      done = Math.min(i + 2, list.length);
      setRunning({ done, total: list.length });
    }
    setRunning(null);
    getSerpAccount().then(setAccount);
    // quitar los que quedaron sin buscar (si se detuvo)
    setResults((rs) => rs.filter((r) => r.status !== "pending"));
  };

  /* ---------- Guardar ---------- */
  const toSave = results.filter((r) => r.include && r.chosen);

  const save = async () => {
    setSaving(true);
    const errors = [];
    for (let i = 0; i < toSave.length; i += 8) {
      await Promise.all(
        toSave.slice(i, i + 8).map(async (r) => {
          const { error } = await supabase.from("products").update({ image_url: r.chosen }).eq("id", r.product.id);
          if (error) errors.push(r.product.name);
        })
      );
    }
    const savedIds = new Set(toSave.map((r) => r.product.id));
    setResults((rs) => rs.filter((r) => !savedIds.has(r.product.id) || errors.includes(r.product.name)));
    await reloadProducts();
    setSaving(false);
    toast(
      errors.length ? `${toSave.length - errors.length} guardadas, ${errors.length} con error` : `${toSave.length} imágenes guardadas`,
      errors.length ? "error" : "success"
    );
  };

  /* ---------- Render ---------- */
  const notConfigured = account && !account.configured;

  return (
    <div className="adm-images">
      <section className="adm-card adm-images-head">
        <div className="adm-images-stats">
          <div>
            <span>Productos sin imagen</span>
            <strong>{missingTotal}</strong>
          </div>
          <div>
            <span>Búsquedas disponibles</span>
            <strong>{account?.searches_left ?? "—"}</strong>
            {account?.plan_searches && <small>de {account.plan_searches} por mes</small>}
          </div>
        </div>

        {notConfigured ? (
          <div className="adm-alert warn">
            <FaExclamationTriangle />
            <span>
              {account.missingSql ? (
                <>Corré <code>supabase/image-search.sql</code> en Supabase y cargá tu clave de SerpAPI (las instrucciones están en el archivo).</>
              ) : (
                <>Falta cargar tu clave de SerpAPI. Las instrucciones están en <code>supabase/image-search.sql</code>.</>
              )}
            </span>
          </div>
        ) : (
          <div className="adm-images-controls">
            <select className="adm-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className="adm-check">
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Solo sin imagen
            </label>
            <label className="adm-check">
              <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} /> Solo activos con stock
            </label>
            <select className="adm-select" value={batch} onChange={(e) => setBatch(Number(e.target.value))}>
              {BATCHES.map((n) => (
                <option key={n} value={n}>De a {n}</option>
              ))}
            </select>
            {running ? (
              <button className="adm-btn ghost" onClick={() => (stopRef.current = true)}>
                <FaStop /> Detener
              </button>
            ) : (
              <button className="adm-btn primary" onClick={run} disabled={!pending.length}>
                <FaSearch /> Buscar {Math.min(batch, pending.length)} de {pending.length}
              </button>
            )}
          </div>
        )}

        {running && (
          <div className="adm-progress">
            <div style={{ width: `${(running.done / running.total) * 100}%` }} />
            <span>Buscando… {running.done}/{running.total}</span>
          </div>
        )}
      </section>

      {results.length === 0 ? (
        <div className="adm-empty">
          <FaImage style={{ fontSize: "2rem" }} />
          Elegí los filtros y tocá <strong>Buscar</strong>. Se busca en Google por el SKU de cada producto y se elige
          automáticamente la foto que mejor coincide. Vas a poder revisarlas antes de guardar.
        </div>
      ) : (
        <div className="adm-images-grid">
          {results.map((r) => (
            <article key={r.product.id} className={`adm-image-card ${r.include ? "on" : ""} ${r.status}`}>
              <div className="adm-image-card-main">
                {r.status === "loading" || r.status === "pending" ? (
                  <div className="adm-skeleton" />
                ) : r.chosen ? (
                  <img
                    src={r.candidates.find((c) => c.original === r.chosen)?.thumbnail || r.chosen}
                    alt=""
                  />
                ) : (
                  <div className="adm-image-card-empty">
                    {r.status === "error" ? r.error : "No se encontró imagen"}
                  </div>
                )}
                {r.chosen && (
                  <label className="adm-image-card-include">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => patchResult(r.product.id, { include: e.target.checked })}
                    />
                    Guardar
                  </label>
                )}
              </div>
              <div className="adm-image-card-info">
                <span className="adm-prod-name">{r.product.name}</span>
                <span className="adm-prod-sku">{r.product.sku}</span>
              </div>
              {r.candidates.length > 1 && (
                <div className="adm-image-card-alts">
                  {r.candidates.slice(0, 6).map((c) => (
                    <button
                      key={c.original}
                      className={c.original === r.chosen ? "on" : ""}
                      onClick={() => patchResult(r.product.id, { chosen: c.original, include: true })}
                      title={`${c.source || ""} · ${c.width || "?"}×${c.height || "?"}`}
                    >
                      <img src={c.thumbnail} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              <div className="adm-image-card-actions">
                {r.product.image_url && (
                  <span className="adm-muted small" title="Imagen actual">
                    <img src={productImage(r.product)} alt="" className="adm-image-current" /> actual
                  </span>
                )}
                <button className="adm-link" onClick={() => setPickerFor(pickerFor === r.product.id ? null : r.product.id)}>
                  <FaGoogle /> Otra búsqueda
                </button>
              </div>
              {pickerFor === r.product.id && (
                <ImagePicker
                  product={r.product}
                  current={r.chosen}
                  onPick={(url) => {
                    patchResult(r.product.id, { chosen: url, include: true, status: "done" });
                    setPickerFor(null);
                  }}
                  onClose={() => setPickerFor(null)}
                />
              )}
            </article>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="adm-import-actionbar">
          <span className="adm-muted">
            {toSave.length} de {results.length} imágenes seleccionadas
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="adm-btn ghost" onClick={() => setResults([])} disabled={saving || !!running}>
              Descartar todo
            </button>
            <button className="adm-btn primary" onClick={save} disabled={saving || !!running || !toSave.length}>
              {saving ? "Guardando..." : <><FaSave /> Guardar {toSave.length}</>}
            </button>
          </div>
        </div>
      )}
      {toSave.length > 0 && !saving && (
        <p className="adm-muted small" style={{ textAlign: "center" }}>
          <FaCheck /> Revisá que cada foto sea del producto correcto antes de guardar.
        </p>
      )}
    </div>
  );
}
