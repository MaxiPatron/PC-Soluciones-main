// Lectura y comparación de las listas del mayorista (XML de Excel 2003).
// Sin dependencias de React: se puede probar con Node.

/* ======================= Lectura del archivo ======================= */

/**
 * Los XML del mayorista vienen mezclados: casi todo en UTF-8 pero algunas
 * letras (ej. la Ñ de "DAÑADA") en Latin-1. Decodificamos UTF-8 y cualquier
 * byte inválido lo interpretamos como Windows-1252.
 */
export function decodeMixed(buffer) {
  const b = new Uint8Array(buffer);
  const utf8 = new TextDecoder("utf-8");
  const win = new TextDecoder("windows-1252");
  const parts = [];
  let start = 0;
  let i = 0;
  while (i < b.length) {
    const c = b[i];
    let len = 0;
    if (c < 0x80) len = 1;
    else if (c >= 0xc2 && c <= 0xdf) len = 2;
    else if (c >= 0xe0 && c <= 0xef) len = 3;
    else if (c >= 0xf0 && c <= 0xf4) len = 4;
    let ok = len > 0 && i + len <= b.length;
    for (let k = 1; ok && k < len; k++) if ((b[i + k] & 0xc0) !== 0x80) ok = false;
    if (ok) {
      i += len;
      continue;
    }
    if (i > start) parts.push(utf8.decode(b.subarray(start, i)));
    parts.push(win.decode(b.subarray(i, i + 1)));
    i++;
    start = i;
  }
  if (start < b.length) parts.push(utf8.decode(b.subarray(start)));
  return parts.join("");
}

const normKey = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Lee una tabla de SpreadsheetML (Excel XML 2003) → array de filas (arrays). */
export function parseSpreadsheetXml(text, DOMParserImpl = typeof DOMParser !== "undefined" ? DOMParser : null) {
  // Sacar BOMs / basura antes de la declaración XML
  const startIdx = text.search(/<\?xml|<Workbook/);
  const clean = startIdx > 0 ? text.slice(startIdx) : text;
  const doc = new DOMParserImpl().parseFromString(clean, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("El archivo no es un XML válido de Excel.");
  }
  const rows = [];
  const rowEls = doc.getElementsByTagNameNS("*", "Row");
  for (let r = 0; r < rowEls.length; r++) {
    const cells = rowEls[r].getElementsByTagNameNS("*", "Cell");
    const row = [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const idx = cell.getAttribute("ss:Index") || cell.getAttributeNS?.("urn:schemas-microsoft-com:office:spreadsheet", "Index");
      if (idx) while (row.length < Number(idx) - 1) row.push("");
      const data = cell.getElementsByTagNameNS("*", "Data")[0];
      if (!data) {
        row.push("");
        continue;
      }
      const type = data.getAttribute("ss:Type") || "String";
      const value = data.textContent ?? "";
      row.push(type === "Number" ? Number(value) : value.trim());
    }
    rows.push(row);
  }
  return rows;
}

/* ===================== Interpretación de columnas ===================== */

const COLS = {
  code: ["codigo", "cod", "codigomayorista"],
  name: ["descripcion", "nombre", "producto"],
  price: ["precio", "lista3", "preciousd", "costo"],
  iva: ["iva", "ivaporc"],
  brand: ["gruponame", "grupo", "marca"],
  rubro: ["rubroname", "rubro"],
  partNumber: ["partnumber", "pn", "sku"],
};

const toNumber = (v) => {
  if (typeof v === "number") return v;
  const n = Number(String(v || "").replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Convierte filas crudas a productos del mayorista.
 * Devuelve { items, branches, headerFound }
 */
export function rowsToSupplierItems(rows) {
  const headerIdx = rows.findIndex((r) => {
    const keys = r.map(normKey);
    return keys.includes("codigo") && keys.some((k) => k.startsWith("descripcion"));
  });
  if (headerIdx === -1) {
    throw new Error('No encontré las columnas "Código" y "Descripción" en el archivo.');
  }
  const header = rows[headerIdx].map(normKey);
  const col = {};
  Object.entries(COLS).forEach(([key, aliases]) => {
    col[key] = header.findIndex((h) => aliases.includes(h));
  });

  // Depósitos: columnas tipo "CBA_Disponible", "ROS_Físico"...
  const branches = {};
  header.forEach((h, i) => {
    const m = h.match(/^([a-z]{2,4})(disponible|fisico|entrante)$/);
    if (!m) return;
    branches[m[1]] = branches[m[1]] || {};
    branches[m[1]][m[2]] = i;
  });

  const items = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const code = String(r[col.code] ?? "").trim();
    const name = String(r[col.name] ?? "").replace(/\s+/g, " ").trim();
    if (!code || !name) continue; // fila vacía o basura
    const stockBy = {};
    Object.entries(branches).forEach(([b, idx]) => {
      stockBy[b] = {
        disponible: toNumber(r[idx.disponible]),
        fisico: toNumber(r[idx.fisico]),
      };
    });
    items.push({
      code,
      name,
      priceUsd: toNumber(r[col.price]),
      iva: col.iva >= 0 ? toNumber(r[col.iva]) : null,
      brand: String(r[col.brand] ?? "").trim(),
      rubro: String(r[col.rubro] ?? "").trim(),
      partNumber: String(r[col.partNumber] ?? "").trim(),
      stockBy,
    });
  }
  return { items, branches: Object.keys(branches) };
}

/** Lee un File del input → { items, branches } */
export async function readSupplierFile(file) {
  const buffer = await file.arrayBuffer();
  if (/\.xml$/i.test(file.name)) {
    return rowsToSupplierItems(parseSpreadsheetXml(decodeMixed(buffer)));
  }
  // .xlsx / .xls / .csv: usamos la librería xlsx (se carga solo si hace falta)
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  return rowsToSupplierItems(rows);
}

/* ============================ Stock ============================ */

export const STOCK_MODES = {
  cba: "Disponible en Córdoba (CBA)",
  total: "Disponible en todos los depósitos",
};

export const stockFor = (item, mode) => {
  if (mode === "cba") return item.stockBy.cba?.disponible ?? 0;
  return Object.values(item.stockBy).reduce((n, s) => n + (s.disponible || 0), 0);
};

/* =========================== Comparación =========================== */

const normSku = (s) => String(s || "").trim().toUpperCase();
const SECONDARY = /CAJA DA|\bEXPO\b|\bC\.?D\.?$|\bUSAD|\bREACOND|\bOPEN BOX/i;

/** Adivina la categoría para cada rubro del mayorista */
export function guessRubroCategories(items, matchedCategoryByCode, categories) {
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const KEYWORDS = [
    [/MEMORI/, "memoria-ram"],
    [/IMP|MULTIFUN|PRINT/, "impresoras"],
    [/DISCO|SSD|ALMACEN|HDD|NVME/, "almacenamiento"],
    [/VIDEO|VGA|GRAFIC/, "tarjetas-graficas"],
    [/MOTHER|PLACA MADRE|\bMB\b/, "motherboards"],
    [/PROCESADOR|\bCPU\b|MICRO/, "microprocesadores"],
    [/FUENTE/, "fuentes"],
    [/GABINE/, "gabinetes"],
    [/MONITOR/, "monitores"],
    [/NOTEBOOK/, "notebooks"],
  ];
  const result = {};
  const rubros = [...new Set(items.map((i) => i.rubro || "(sin rubro)"))];
  for (const rubro of rubros) {
    // 1) La categoría que más usan los productos de este rubro que ya tenés cargados
    const counts = {};
    items
      .filter((i) => (i.rubro || "(sin rubro)") === rubro)
      .forEach((i) => {
        const cat = matchedCategoryByCode[i.code];
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      result[rubro] = String(top[0]);
      continue;
    }
    // 2) Por palabras clave
    const kw = KEYWORDS.find(([re]) => re.test(rubro.toUpperCase()));
    result[rubro] = kw && bySlug[kw[1]] ? String(bySlug[kw[1]]) : "";
  }
  return result;
}

/**
 * Compara el archivo con los productos de la base.
 * opts: { stockMode, updatePrice, updateStock, updateName }
 * Devuelve { changes: [...], omitted: [...], matchedCategoryByCode }
 *   change.kind: "update" | "same" | "new"
 */
export function diffSupplier(items, products, opts) {
  const byCode = new Map();
  const bySku = new Map();
  for (const p of products) {
    if (p.supplier_code && p.supplier_code !== "0") byCode.set(String(p.supplier_code).trim(), p);
    if (p.sku) bySku.set(normSku(p.sku), p);
  }

  // Part Numbers repetidos dentro del archivo
  const pnCount = {};
  items.forEach((i) => {
    const k = normSku(i.partNumber);
    if (k) pnCount[k] = (pnCount[k] || 0) + 1;
  });

  const usedProductIds = new Set();
  const changes = [];
  const omitted = [];
  const matchedCategoryByCode = {};

  // Primero los que matchean por código (identificación segura), después el resto
  const ordered = [...items].sort((a, b) => Number(byCode.has(b.code)) - Number(byCode.has(a.code)));

  for (const item of ordered) {
    const pn = normSku(item.partNumber);
    let product = byCode.get(item.code);
    let matchedBy = product ? "código" : null;

    if (!product && pn && bySku.has(pn)) {
      const candidate = bySku.get(pn);
      const candidateHasOtherCode =
        candidate.supplier_code && candidate.supplier_code !== "0" && candidate.supplier_code !== item.code;
      if (!candidateHasOtherCode && !usedProductIds.has(candidate.id)) {
        if (pnCount[pn] > 1) {
          // Part Number repetido: solo matchea la variante "normal" (no caja dañada / expo)
          const siblings = items.filter((i) => normSku(i.partNumber) === pn);
          const exact = siblings.find((i) => i.name.toUpperCase() === String(candidate.name).toUpperCase());
          const primary = exact || siblings.find((i) => !SECONDARY.test(i.name)) || siblings[0];
          if (primary === item) {
            product = candidate;
            matchedBy = "part number";
          }
        } else {
          product = candidate;
          matchedBy = "part number";
        }
      }
    }

    const stock = stockFor(item, opts.stockMode);

    if (product) {
      usedProductIds.add(product.id);
      if (product.category_id) matchedCategoryByCode[item.code] = product.category_id;
      const patch = {};
      const diff = [];
      if (!product.supplier_code || product.supplier_code === "0") patch.supplier_code = item.code;
      if ("part_number" in product && !product.part_number && item.partNumber) patch.part_number = item.partNumber;
      if (opts.updatePrice && item.priceUsd > 0) {
        if (Number(product.cost_price_usd) !== item.priceUsd) {
          patch.cost_price_usd = item.priceUsd;
          diff.push({ field: "Costo USD", from: product.cost_price_usd, to: item.priceUsd });
        }
        if (item.iva != null && Number(product.iva) !== item.iva) {
          patch.iva = item.iva;
          diff.push({ field: "IVA", from: product.iva, to: item.iva });
        }
      }
      if (opts.updateStock && Number(product.stock) !== stock) {
        patch.stock = stock;
        diff.push({ field: "Stock", from: product.stock, to: stock });
      }
      if (opts.updateName && product.name !== item.name) {
        patch.name = item.name;
        diff.push({ field: "Nombre", from: product.name, to: item.name });
      }
      changes.push({
        kind: diff.length ? "update" : "same",
        item,
        product,
        matchedBy,
        patch,
        diff,
        stock,
      });
      continue;
    }

    // No existe en la base
    if (pn && bySku.has(pn)) {
      omitted.push({ item, reason: `Part Number repetido (ya lo usa "${bySku.get(pn).name}")` });
      continue;
    }
    if (pn && pnCount[pn] > 1 && changes.some((c) => c.kind === "new" && normSku(c.item.partNumber) === pn)) {
      omitted.push({ item, reason: "Part Number repetido dentro del archivo" });
      continue;
    }
    if (!(item.priceUsd > 0)) {
      omitted.push({ item, reason: "Sin precio en el archivo" });
      continue;
    }
    changes.push({ kind: "new", item, product: null, matchedBy: null, patch: null, diff: [], stock });
  }

  return { changes, omitted, matchedCategoryByCode };
}

/* ======================= Armado de productos nuevos ======================= */

const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function buildNewProduct(item, { categoryId, stock, existingBrands, existingSlugs, hasColumn }) {
  const brandMatch = existingBrands.find((b) => b.toLowerCase() === item.brand.toLowerCase());
  const brand = brandMatch || (item.brand.length <= 4 ? item.brand.toUpperCase() : titleCase(item.brand));

  const base = `${item.name}-${item.partNumber || item.code}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");
  let slug = base;
  let n = 2;
  while (existingSlugs.has(slug)) slug = `${base}-${n++}`;
  existingSlugs.add(slug);

  const product = {
    name: item.name,
    slug,
    sku: item.partNumber || item.code,
    supplier_code: item.code,
    brand,
    category_id: categoryId ? Number(categoryId) : null,
    cost_price_usd: item.priceUsd,
    iva: item.iva ?? 21,
    stock,
    price: 0, // lo calcula la base con el dólar del día
    active: true,
    featured: false,
  };
  if (hasColumn("part_number")) product.part_number = item.partNumber || null;
  if (hasColumn("supplier_name")) product.supplier_name = "Mayorista";
  if (hasColumn("supplier_stock")) product.supplier_stock = stock;
  if (hasColumn("last_sync")) product.last_sync = new Date().toISOString();
  return product;
}
