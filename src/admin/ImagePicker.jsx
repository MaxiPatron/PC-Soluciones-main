import { useState } from "react";
import { FaCheck, FaGoogle, FaSearch, FaTimes } from "react-icons/fa";
import { buildQuery, rankCandidates, searchImages } from "./imageSearch";

/** Panel para buscar la foto de un producto en Google y elegir una */
export default function ImagePicker({ product, current, onPick, onClose }) {
  const [query, setQuery] = useState(() => buildQuery(product));
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(rankCandidates(await searchImages(query.trim(), 16), product));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-picker">
      <div className="adm-picker-head">
        <div className="adm-picker-search">
          <FaGoogle />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(e)}
            placeholder="SKU, marca o nombre"
            autoFocus
          />
        </div>
        <button type="button" className="adm-btn primary small" onClick={run} disabled={loading}>
          <FaSearch /> {loading ? "Buscando..." : "Buscar"}
        </button>
        <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Cerrar">
          <FaTimes />
        </button>
      </div>

      {error && <p className="adm-alert warn small">{error}</p>}
      {!results && !loading && !error && (
        <p className="adm-muted small">Cada búsqueda usa 1 del plan de SerpAPI.</p>
      )}
      {loading && (
        <div className="adm-picker-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="adm-picker-item adm-skeleton" />
          ))}
        </div>
      )}
      {results && !loading && (
        results.length ? (
          <div className="adm-picker-grid">
            {results.map((r) => (
              <button
                type="button"
                key={r.original}
                className={`adm-picker-item ${current === r.original ? "on" : ""}`}
                onClick={() => onPick(r.original)}
                title={`${r.title || ""}\n${r.source || ""} · ${r.width || "?"}×${r.height || "?"}`}
              >
                <img src={r.thumbnail} alt="" loading="lazy" />
                {current === r.original && (
                  <span className="adm-picker-check">
                    <FaCheck />
                  </span>
                )}
                <small>{r.source}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="adm-muted small">Sin resultados. Probá con otro texto (ej. marca + modelo).</p>
        )
      )}
    </div>
  );
}
