// Misma fórmula que scripts/updateDollarAndPrices.js.
// Si cambiás los márgenes allá, cambialos también acá.

export const roundPrice = (value) => Math.ceil(value / 100) * 100;

export const costWithIvaArs = (costUsd, iva, usdArs) =>
  Number(costUsd || 0) * (1 + Number(iva || 0) / 100) * Number(usdArs || 0);

export const suggestedPriceFromCost = (costArs) => {
  if (!costArs || costArs <= 0) return 0;
  if (costArs < 50000) return roundPrice(costArs + 15000);
  if (costArs < 150000) return roundPrice(costArs * 1.3);
  if (costArs < 500000) return roundPrice(costArs * 1.2);
  return roundPrice(costArs * 1.08);
};

export const formatARS = (value) =>
  Number(value || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

export const formatUSD = (value) => {
  const n = Number(value || 0);
  if (!n) return "—";
  return `U$S ${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
};

export const createSlug = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");

export { productImage } from "../utils/store";
