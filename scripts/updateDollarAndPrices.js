// Fuerza una sincronización del dólar desde la terminal.
// Normalmente no hace falta: Supabase lo hace solo cada 30 min
// (ver supabase/dollar-sync.sql).
//
// Uso:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/updateDollarAndPrices.js
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan las variables SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

supabase.rpc("sync_dollar").then(({ data, error }) => {
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  console.log(
    data.changed
      ? `Dólar ${data.previous} -> ${data.usd_ars}. ${data.products} productos recalculados.`
      : `El dólar sigue en ${data.usd_ars}. Sin cambios.`
  );
});
