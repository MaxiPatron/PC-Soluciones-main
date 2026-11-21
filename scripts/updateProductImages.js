const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Uso: node --env-file=.env.scripts scripts/updateProductImages.js
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan claves: corré el script con --env-file=.env.scripts");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORIES_TO_SEARCH = [
  "motherboards",
  "fuentes",
  "almacenamiento",
  "tarjetas gráficas",
];

const MAX_SEARCHES = 240;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldSearchCategory = (product) => {
  const categoryName = product.categories?.name?.toLowerCase() || "";

  return CATEGORIES_TO_SEARCH.some((category) =>
    categoryName.includes(category)
  );
};

async function searchImage(product) {
  const query = `${product.sku} ${product.brand} ${product.name}`;

  const { data } = await axios.get("https://serpapi.com/search.json", {
    params: {
      engine: "google_images",
      q: query,
      api_key: SERP_API_KEY,
    },
  });

  const image =
    data.images_results?.find((img) =>
      img.original?.startsWith("http")
    )?.original || null;

  return image;
}

async function updateProductImages() {
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      brand,
      image_url,
      categories (
        name
      )
    `)
    .is("image_url", null)
    .not("sku", "is", null)
    .limit(500);

  if (error) {
    console.error(error);
    return;
  }

  let searchesUsed = 0;

  for (const product of products) {
    if (!shouldSearchCategory(product)) continue;

    if (searchesUsed >= MAX_SEARCHES) {
      console.log(`Límite alcanzado: ${MAX_SEARCHES} búsquedas`);
      break;
    }

    try {
      console.log(
        `Buscando (${searchesUsed + 1}/${MAX_SEARCHES}):`,
        product.name
      );

      const imageUrl = await searchImage(product);
      searchesUsed++;

      if (!imageUrl) {
        console.log("Sin imagen:", product.name);
        continue;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", product.id);

      if (updateError) {
        console.error("Error actualizando:", product.name, updateError.message);
      } else {
        console.log("Imagen OK:", product.name);
      }

      await sleep(1200);
    } catch (err) {
      searchesUsed++;
      console.error("Error:", product.name, err.message);
    }
  }

  console.log(`Proceso terminado. Búsquedas usadas: ${searchesUsed}`);
}

updateProductImages();