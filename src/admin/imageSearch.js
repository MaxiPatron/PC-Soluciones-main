import { supabase } from "../utils/supabaseClient";

const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Texto de búsqueda: el SKU (Part Number) identifica el producto.
 * Si el SKU es un código interno (solo números, ej. Hiksemi "324102111")
 * o muy corto, agregamos el nombre para que Google lo encuentre.
 */
export const buildQuery = (p) => {
  const sku = String(p.sku || p.part_number || "").replace(/\(.*?\)/g, "").trim();
  const brand = String(p.brand || "").trim();
  const weakSku = !sku || /^\d+$/.test(sku) || sku.length < 5;
  const name = String(p.name || "")
    .replace(/\b(BOX|TRAY|SIN COOLER|BLISTER|\(I\))\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (weakSku ? `${brand} ${name}` : `${sku} ${brand}`).replace(/\s+/g, " ").trim();
};

const BAD_SOURCES = /pinterest|facebook|fbcdn|instagram|tiktok|youtube|ytimg|lookaside|x\.com|twitter|reddit|aliexpress|alicdn/i;

/** Ordena las imágenes: primero las que mencionan el SKU, grandes y de sitios confiables */
export const rankCandidates = (candidates, product) => {
  const sku = norm(product.sku || product.part_number);
  const brand = norm(product.brand);
  return [...(candidates || [])]
    .map((c) => {
      const text = norm(`${c.title} ${c.original}`);
      let score = 0;
      if (sku && sku.length >= 5 && text.includes(sku)) score += 6;
      if (brand && text.includes(brand)) score += 1;
      if (c.width >= 500) score += 2;
      else if (c.width >= 300) score += 1;
      else if (c.width && c.width < 200) score -= 3;
      const ratio = c.width && c.height ? c.width / c.height : 1;
      if (ratio > 0.6 && ratio < 1.8) score += 1;
      if (BAD_SOURCES.test(`${c.source} ${c.original}`)) score -= 10;
      if (/\.gif(\?|$)/i.test(c.original)) score -= 2;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);
};

const friendlyError = (error) => {
  const msg = error?.message || String(error);
  if (error?.code === "PGRST202" || (/search_product_images/.test(msg) && /not find|no existe/i.test(msg)))
    return "Falta correr supabase/image-search.sql en Supabase.";
  return msg;
};

export async function searchImages(query, limit = 12) {
  const { data, error } = await supabase.rpc("search_product_images", { p_query: query, p_limit: limit });
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

export async function getSerpAccount() {
  const { data, error } = await supabase.rpc("serpapi_account");
  if (error) return { configured: false, missingSql: true };
  return data;
}
