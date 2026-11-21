const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

// Uso: node --env-file=.env.scripts scripts/importPrinters.js
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan claves: corré el script con --env-file=.env.scripts");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_NAME = "./impresoras.xml";
const CATEGORY_ID_IMPRESORAS = 10;
const DOLLAR_USED = 1425;

const cleanNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  return Number(
    String(value)
      .replace("U$S", "")
      .replace("$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
      .trim()
  );
};

const createSlug = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replaceAll(" ", "-")
    .replace(/[^\w-]+/g, "");

const getValue = (row, possibleNames) => {
  for (const name of possibleNames) {
    if (
      row[name] !== undefined &&
      row[name] !== null &&
      row[name] !== ""
    ) {
      return row[name];
    }
  }

  return "";
};

const buildDescription = (name) =>
  `${name}. Impresora disponible para consulta. Verificar disponibilidad, conectividad y compatibilidad según necesidad.`;

async function importPrinters() {
  const workbook = XLSX.readFile(FILE_NAME);

  const sheetName = workbook.SheetNames[0];

  const rows = XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName],
    {
      defval: "",
    }
  );

  console.log(`Filas encontradas: ${rows.length}`);

  if (rows.length > 0) {
    console.log("\nCOLUMNAS DETECTADAS:");
    console.log(Object.keys(rows[0]));

    console.log("\nPRIMERA FILA:");
    console.log(rows[0]);
  }

  let imported = 0;
  let skippedNoData = 0;
  let skippedNoStock = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const supplierCode = getValue(row, [
        "Código",
        "Codigo",
        "codigo",
        "CODIGO",
        "Código mayorista",
        "Codigo mayorista",
      ]);

      const name = getValue(row, [
        "Descripción",
        "Descripcion",
        "descripcion",
        "DESCRIPCION",
        "Nombre producto",
        "Producto",
      ]);

      const partNumber =
        getValue(row, [
          "Part Number",
          "Part number",
          "PART NUMBER",
          "PartNumber",
          "SKU",
          "sku",
        ]) || supplierCode;

      if (!name || !partNumber) {
        skippedNoData++;
        continue;
      }

      const costUsd = cleanNumber(
        getValue(row, [
          "Precio",
          "precio",
          "Precio USD",
          "lista3",
        ])
      );

      const iva = cleanNumber(
        getValue(row, [
          "IVA",
          "IVA %",
          "iva",
        ])
      );

      const usdWithTax = costUsd * (1 + iva / 100);

      const costArs = usdWithTax * DOLLAR_USED;

      const stock =
        cleanNumber(
          getValue(row, [
            "CBA_Disponible",
            "CBA Disponible",
          ])
        ) ||
        cleanNumber(
          getValue(row, [
            "CBA_Físico",
            "CBA_Fisico",
          ])
        ) ||
        cleanNumber(
          getValue(row, [
            "LUG_Disponible",
            "LUG Disponible",
          ])
        ) ||
        cleanNumber(
          getValue(row, [
            "ROS_Disponible",
            "ROS Disponible",
          ])
        ) ||
        cleanNumber(
          getValue(row, [
            "MZA_Disponible",
            "MZA Disponible",
          ])
        ) ||
        0;

      if (stock <= 0) {
        skippedNoStock++;
        continue;
      }

      const brand =
        getValue(row, [
          "Grupo Name",
          "Grupo_Name",
          "Grupo",
          "Marca",
        ]) || "Sin marca";

      const product = {
        sku: String(partNumber).trim(),
        supplier_code: String(supplierCode || "").trim(),
        supplier_name: "Mayorista",
        name: String(name).trim(),
        slug: createSlug(`${name}-${partNumber}`),
        description: buildDescription(name),
        brand: String(brand).trim(),
        category_id: CATEGORY_ID_IMPRESORAS,
        cost_price_usd: costUsd,
        iva,
        usd_with_tax: usdWithTax,
        dollar_used: DOLLAR_USED,
        cost_price: Math.round(costArs),
        price: null,
        stock,
        supplier_stock: stock,
        active: true,
        featured: false,
        last_sync: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("products")
        .upsert(product, {
          onConflict: "sku",
        });

      if (error) {
        errors++;
        console.error(
          "Error:",
          product.name,
          error.message
        );
      } else {
        imported++;
        console.log("OK:", product.name);
      }
    } catch (err) {
      errors++;
      console.error(
        "Error general:",
        err.message
      );
      const fs = require("fs");

      const xml = fs.readFileSync("./impresoras.xml", "utf8");

      console.log(xml.substring(0, 3000));
    }
  }

  console.log("\n========================");
  console.log("RESUMEN");
  console.log("========================");
  console.log("Importados:", imported);
  console.log("Sin nombre/SKU:", skippedNoData);
  console.log("Sin stock:", skippedNoStock);
  console.log("Errores:", errors);
  console.log("========================");
}

importPrinters();