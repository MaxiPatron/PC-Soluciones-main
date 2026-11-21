// Utilidades compartidas de la tienda (imágenes, precios, WhatsApp).

// La tienda muestra "Consultar precio" a propósito: la idea es que el cliente
// escriba por WhatsApp (ahí se genera la interacción y se confirma el precio).
// Poné true solo si algún día querés publicar los precios.
export const SHOW_PRICES = false;

export const WHATSAPP_NUMBER = "5493513256553";

export const whatsappLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const productWhatsappText = (p) =>
  `Hola! Quiero consultar por este producto: ${p.name} - SKU: ${p.sku || "Sin SKU"}`;

export const BRAND_IMAGES = {
  Intel: "/brands/intel.jpeg",
  AMD: "/brands/amd.jpg",
  NVIDIA: "/brands/nvidia.png",
  Kingston: "/brands/Kingston.jpg",
  Corsair: "/brands/corsair.jpg",
  ADATA: "/brands/adata.jpg",
  XPG: "/brands/xpg.jpg",
  ASUS: "/brands/asus.jpg",
  MSI: "/brands/msi.jpg",
  Gigabyte: "/brands/gigabyte.jpg",
  Biostar: "/brands/biostar.jpg",
  "Cooler Master": "/brands/coolermaster.jpg",
  Thermaltake: "/brands/thermaltake.jpg",
  Gamemax: "/brands/gamemax.jpg",
  Lexar: "/brands/lexar.jpg",
  Lenovo: "/brands/lenovo.jpg",
  Microsoft: "/brands/microsoft.jpg",
  Dahua: "/brands/dahua.jpg",
  Hikvision: "/brands/hikvision.jpg",
  Hiksemi: "/brands/Hiksemi.jpg",
  Memox: "/brands/memox.jpg",
  HP: "/brands/hp.jpg",
  HPE: "/brands/hpe.jpg",
  Dell: "/brands/dell.jpg",
  Acer: "/brands/acer.jpg",
  Samsung: "/brands/samsung.jpg",
  Philips: "/brands/philips.jpg",
  Noblex: "/brands/noblex.jpg",
  Sandisk: "/brands/sandisk.jpg",
  "Western Digital": "/brands/westerndigital.jpg",
};

export const FALLBACK_IMAGE = "/brands/hardwaregen.png";

export const productImage = (p) =>
  p?.image_url?.trim() || BRAND_IMAGES[p?.brand] || FALLBACK_IMAGE;

export const formatPrice = (value) =>
  Number(value || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

export const hasPrice = (p) => SHOW_PRICES && Number(p?.price) > 0;

export const priceLabel = (p) => (hasPrice(p) ? formatPrice(p.price) : "Consultar precio");
