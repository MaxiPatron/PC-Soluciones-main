const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const DOLLAR_API_URL = "https://dolarapi.com/v1/dolares/mayorista";

const roundPrice = (value) => Math.ceil(value / 100) * 100;

async function updateDollarAndPrices() {
  const response = await fetch(DOLLAR_API_URL);

  if (!response.ok) {
    throw new Error("No se pudo obtener el dólar");
  }

  const dollarData = await response.json();

  const usdArs = Number(dollarData.venta);

  if (!usdArs || Number.isNaN(usdArs)) {
    throw new Error("Dólar inválido");
  }

  console.log("Dólar mayorista:", usdArs);

  await supabase
    .from("exchange_rates")
    .update({
      usd_ars: usdArs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  const { data: products, error } = await supabase
    .from("products")
    .select("id, cost_price_usd, iva, price")
    .not("cost_price_usd", "is", null);

  if (error) throw error;

  for (const product of products) {
    const costUsd = Number(product.cost_price_usd || 0);
    const iva = Number(product.iva || 0);

    if (costUsd <= 0) continue;

    const costWithIvaArs = costUsd * (1 + iva / 100) * usdArs;

    let suggestedPrice;

    if (costWithIvaArs < 50000) {
      suggestedPrice = costWithIvaArs + 15000;
    } else if (costWithIvaArs < 150000) {
      suggestedPrice = costWithIvaArs * 1.3;
    } else if (costWithIvaArs < 500000) {
      suggestedPrice = costWithIvaArs * 1.2;
    } else {
      suggestedPrice = costWithIvaArs * 1.08;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({
        cost_price: roundPrice(costWithIvaArs),
        price: roundPrice(suggestedPrice),
        dollar_used: usdArs,
        last_sync: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateError) {
      console.error("Error producto", product.id, updateError.message);
    }
  }

  console.log("Dólar y precios actualizados");
}

updateDollarAndPrices().catch((error) => {
  console.error(error);
  process.exit(1);
});