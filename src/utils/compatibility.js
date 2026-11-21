// Detección de compatibilidad a partir del NOMBRE del producto
// (los nombres vienen del mayorista: "CPU AMD RYZEN 5 9600X AM5 65W ...").
// Cualquier función puede devolver null = "no se pudo detectar".

const text = (product) => product?.name?.toUpperCase().replace(/\s+/g, " ") || "";

/* ============================ CPU ============================ */

export const getCpuSocket = (cpu) => {
  const name = text(cpu);
  if (!name) return null;

  if (/\bAM5\b/.test(name)) return "AM5";
  if (/\bAM4\b/.test(name)) return "AM4";
  if (/\bAM1\b/.test(name)) return "AM1";
  if (/(LGA|S)?1851|ARROW ?LAKE/.test(name)) return "LGA1851";
  if (/(LGA|S)1700|\b1700\b/.test(name)) return "LGA1700";
  if (/(LGA|S)1200|COMET ?LAKE|ROCKET ?LAKE/.test(name)) return "LGA1200";

  // Sin socket en el nombre: deducir por modelo
  const ryzen = name.match(/RYZEN \d (\d)\d{3}/);
  if (ryzen) return Number(ryzen[1]) >= 7 ? "AM5" : "AM4";

  if (/ULTRA [579] ?2\d\d/.test(name)) return "LGA1851";
  const intel = name.match(/I[3579][- ]?(\d{2})\d{3}/);
  if (intel) {
    const gen = Number(intel[1]);
    if (gen >= 12 && gen <= 14) return "LGA1700";
    if (gen === 10 || gen === 11) return "LGA1200";
  }

  return null;
};

/** true / false / null (no se sabe) */
export const cpuHasIntegratedGraphics = (cpu) => {
  const name = text(cpu);
  if (!name) return null;

  if (name.includes("INTEL")) {
    // 14100F, 12400F, 245KF → sin gráficos
    if (/\d{3,5}K?F\b/.test(name)) return false;
    return true;
  }

  if (name.includes("RYZEN")) {
    const m = name.match(/RYZEN \d (\d{4})([A-Z0-9]*)/);
    if (!m) return null;
    const suffix = m[2];
    if (suffix.includes("G")) return true; // 5600G, 5600GT, 8600G
    if (suffix.includes("F")) return false; // 7500F, 8700F
    return getCpuSocket(cpu) === "AM5"; // Ryzen 7000/9000 traen gráficos básicos; AM4 sin G no
  }

  return null;
};

/** false si el nombre dice que no trae cooler */
export const cpuIncludesCooler = (cpu) => {
  const name = text(cpu);
  if (/SIN COOLER|\bTRAY\b|S\/COOLER/.test(name)) return false;
  if (/WRAITH|COOLER|\bBOX\b/.test(name)) return true;
  return null;
};

/* ======================== Motherboard ======================== */

export const getMotherSocket = (mother) => {
  const name = text(mother);
  if (!name) return null;

  if (/1851|Z890|B860|H810/.test(name)) return "LGA1851";
  if (/1700|H610|B660|B760|H670|H770|Z690|Z790/.test(name)) return "LGA1700";
  if (/1200|H410|H510|B460|B560|H470|H570|Z490|Z590/.test(name)) return "LGA1200";
  if (/\bAM5\b|A620|B650|B840|B850|X670|X870/.test(name)) return "AM5";
  if (/\bAM4\b|A320|A520|B350|B450|B550|X370|X470|X570/.test(name)) return "AM4";

  return null;
};

export const getMotherRamType = (mother) => {
  const name = text(mother);
  if (!name) return null;

  if (/DDR5|\bD5\b/.test(name)) return "DDR5";
  if (/DDR4|\bD4\b/.test(name)) return "DDR4";

  // Por plataforma (LGA1700 tiene placas de los dos tipos)
  const socket = getMotherSocket(mother);
  if (socket === "AM4" || socket === "LGA1200") return "DDR4";
  if (socket === "AM5" || socket === "LGA1851") return "DDR5";

  return null;
};

/* ============================ RAM ============================ */

export const getRamType = (ram) => {
  const name = text(ram);
  if (name.includes("DDR5")) return "DDR5";
  if (name.includes("DDR4")) return "DDR4";
  if (name.includes("DDR3")) return "DDR3";
  return null;
};

export const isNotebookRam = (ram) => /SODIMM|SO-DIMM|SO DIMM|NOTEBOOK/.test(text(ram));

/** RAM que sirve para una PC de escritorio actual */
export const isDesktopRam = (ram) => !isNotebookRam(ram) && getRamType(ram) !== "DDR3";

export const getRamCapacityGb = (ram) => {
  const m = text(ram).match(/(\d+) ?GB/);
  return m ? Number(m[1]) : null;
};

/* =========================== Fuente =========================== */

export const getPsuWatts = (psu) => {
  const name = text(psu);

  const wattMatch = name.match(/(\d{3,4}) ?W\b/);
  if (wattMatch) return Number(wattMatch[1]);

  const modelMatch = name.match(/\bP(\d{3,4})\b/);
  if (modelMatch) return Number(modelMatch[1]);

  return null;
};

/** Excluye cargadores y fuentes chicas (12V, 5V, etc.) */
export const isDesktopPsu = (psu) => {
  const name = text(psu);
  if (/CARGADOR|\b\d{1,2}V\b|TABLET|NOTEBOOK/.test(name)) return false;
  const watts = getPsuWatts(psu);
  return !watts || watts >= 300;
};

/* ========================== Gabinete ========================== */

/** Watts de la fuente incluida en el gabinete, o null */
export const getCasePsuWatts = (pcCase) => {
  const name = text(pcCase);
  const m = name.match(/\+? ?(\d{3,4}) ?W\b/);
  return m ? Number(m[1]) : null;
};

/* ======================= Placa de video ======================= */

// Fuente recomendada por el fabricante (NVIDIA / AMD) para cada placa.
// Esos valores YA contemplan un sistema completo con un procesador gamer,
// por eso al procesador solo se le suma algo si es de muy alto consumo.
// El orden importa: las variantes (TI, SUPER, XT, XTX) van antes que el modelo base.
const GPU_PSU_TABLE = [
  // NVIDIA RTX 50
  [/5090/, 1000, "RTX 5090"],
  [/5080/, 850, "RTX 5080"],
  [/5070 ?TI/, 750, "RTX 5070 Ti"],
  [/5070/, 650, "RTX 5070"],
  [/5060 ?TI/, 600, "RTX 5060 Ti"],
  [/5060/, 550, "RTX 5060"],
  [/5050/, 550, "RTX 5050"],
  // NVIDIA RTX 40
  [/4090/, 850, "RTX 4090"],
  [/4080/, 750, "RTX 4080"],
  [/4070 ?TI/, 700, "RTX 4070 Ti"],
  [/4070/, 650, "RTX 4070"],
  [/4060/, 550, "RTX 4060"],
  // NVIDIA RTX 30 / GTX
  [/3090/, 850, "RTX 3090"],
  [/3080/, 750, "RTX 3080"],
  [/3070/, 650, "RTX 3070"],
  [/3060 ?TI/, 600, "RTX 3060 Ti"],
  [/3060/, 550, "RTX 3060"],
  [/3050/, 450, "RTX 3050"],
  [/1650|1630|GT ?1030|GT ?730|GT ?710/, 400, "placa de entrada"],
  // AMD RX 9000
  [/9070 ?XT/, 750, "RX 9070 XT"],
  [/9070/, 650, "RX 9070"],
  [/9060 ?XT/, 550, "RX 9060 XT"],
  [/9060/, 500, "RX 9060"],
  // AMD RX 7000
  [/7900 ?XTX/, 800, "RX 7900 XTX"],
  [/7900/, 750, "RX 7900 XT/GRE"],
  [/7800/, 700, "RX 7800 XT"],
  [/7700/, 700, "RX 7700 XT"],
  [/7600/, 550, "RX 7600"],
  // AMD RX 6000
  [/69[05]0/, 850, "RX 6900/6950 XT"],
  [/6800/, 750, "RX 6800"],
  [/67[05]0/, 650, "RX 6700/6750 XT"],
  [/66[05]0/, 500, "RX 6600/6650"],
  [/6500|6400/, 400, "RX 6500/6400"],
];

const gpuPsu = (gpu) => {
  const name = text(gpu);
  if (!name) return null;
  const row = GPU_PSU_TABLE.find(([re]) => re.test(name));
  return row ? { watts: row[1], label: row[2] } : { watts: 600, label: "placa de video (modelo no reconocido)" };
};

// Procesadores de muy alto consumo (200W+ en carga): margen extra
const cpuExtraWatts = (cpu) => {
  const name = text(cpu);
  if (/I9|ULTRA 9|RYZEN 9/.test(name)) return 50;
  return 0;
};

/** Desglose de la recomendación de fuente, para mostrar al cliente */
export const getPowerBreakdown = (cpu, gpu) => {
  const g = gpuPsu(gpu);
  const base = g ? g.watts : 450; // sin placa (gráficos integrados): 450W sobra
  const extra = cpuExtraWatts(cpu);
  const total = Math.ceil((base + extra) / 50) * 50;
  const parts = [g ? `${g.label}: ${g.watts}W recomendados` : "Sin placa de video: 450W alcanzan"];
  if (extra) parts.push(`+${extra}W por el procesador de alto consumo`);
  return { watts: total, detail: parts.join(" · ") };
};

export const getRequiredWatts = (cpu, gpu) => getPowerBreakdown(cpu, gpu).watts;

/* ==================== Compatibilidad por paso ==================== */

/**
 * ¿El producto es compatible con lo ya elegido?
 * Devuelve { ok: true | false | null, reason }
 *   ok=false → incompatible (se oculta por defecto)
 *   ok=null  → no se pudo verificar (se muestra con aviso)
 */
export const checkProductForStep = (stepKey, product, selected) => {
  const { cpu, mother, ram, gpu } = selected;

  if (stepKey === "cpu" && mother) {
    const a = getCpuSocket(product);
    const b = getMotherSocket(mother);
    if (a && b) return a === b ? { ok: true } : { ok: false, reason: `Socket ${a}, tu mother es ${b}` };
    return { ok: null, reason: "Verificar socket" };
  }

  if (stepKey === "mother") {
    if (cpu) {
      const a = getCpuSocket(cpu);
      const b = getMotherSocket(product);
      if (a && b && a !== b) return { ok: false, reason: `Socket ${b}, tu procesador es ${a}` };
      if (!a || !b) return { ok: null, reason: "Verificar socket" };
    }
    if (ram) {
      const a = getRamType(ram);
      const b = getMotherRamType(product);
      if (a && b && a !== b) return { ok: false, reason: `Usa ${b}, tu memoria es ${a}` };
      if (!b) return { ok: null, reason: "Verificar DDR4/DDR5" };
    }
    return { ok: true };
  }

  if (stepKey === "ram" && mother) {
    const a = getRamType(product);
    const b = getMotherRamType(mother);
    if (a && b) return a === b ? { ok: true } : { ok: false, reason: `Es ${a}, tu mother usa ${b}` };
    return { ok: null, reason: "Verificar DDR4/DDR5" };
  }

  if (stepKey === "psu" && (cpu || gpu)) {
    const watts = getPsuWatts(product);
    const need = getRequiredWatts(cpu, gpu);
    if (!watts) return { ok: null, reason: "Verificar potencia" };
    return watts >= need ? { ok: true } : { ok: false, reason: `${watts}W, recomendamos ${need}W o más` };
  }

  return { ok: true };
};

/** Etiquetas cortas para mostrar en la tarjeta del producto */
export const getProductTags = (stepKey, product) => {
  const tags = [];
  if (stepKey === "cpu") {
    const s = getCpuSocket(product);
    if (s) tags.push(s);
    const igpu = cpuHasIntegratedGraphics(product);
    if (igpu === true) tags.push("Gráficos integrados");
    if (igpu === false) tags.push("Requiere placa de video");
    if (cpuIncludesCooler(product) === false) tags.push("Sin cooler");
  }
  if (stepKey === "mother") {
    const s = getMotherSocket(product);
    if (s) tags.push(s);
    const r = getMotherRamType(product);
    if (r) tags.push(r);
    if (/M-?ATX|MATX/.test(text(product))) tags.push("Micro-ATX");
    else if (/\bITX\b/.test(text(product))) tags.push("Mini-ITX");
    else if (/\bATX\b/.test(text(product))) tags.push("ATX");
  }
  if (stepKey === "ram") {
    const r = getRamType(product);
    if (r) tags.push(r);
    const gb = getRamCapacityGb(product);
    if (gb) tags.push(`${gb} GB`);
  }
  if (stepKey === "psu") {
    const w = getPsuWatts(product);
    if (w) tags.push(`${w}W`);
    const cert = text(product).match(/80 ?\+? ?(PLUS )?(BRONZE|GOLD|PLATINUM|WHITE|TITANIUM)/);
    if (cert) tags.push(`80+ ${cert[2][0]}${cert[2].slice(1).toLowerCase()}`);
  }
  if (stepKey === "case") {
    const w = getCasePsuWatts(product);
    if (w) tags.push(`Incluye fuente ${w}W`);
  }
  if (stepKey === "storage") {
    const name = text(product);
    if (/NVME|M\.2/.test(name)) tags.push("M.2 NVMe");
    else if (/SSD/.test(name)) tags.push("SSD SATA");
    else if (/HDD|DISCO/.test(name)) tags.push("HDD");
  }
  return tags;
};

/* ==================== Chequeo del armado completo ==================== */

/**
 * Devuelve una lista de { level: "error" | "warning" | "info", text }
 */
export const checkBuild = (selected) => {
  const out = [];
  const { cpu, mother, ram, gpu, psu } = selected;
  const pcCase = selected.case;

  if (cpu && mother) {
    const a = getCpuSocket(cpu);
    const b = getMotherSocket(mother);
    if (a && b && a !== b) out.push({ level: "error", text: `El procesador es ${a} y la motherboard es ${b}.` });
    else if (!a || !b) out.push({ level: "warning", text: "No pudimos verificar el socket del procesador y la motherboard." });
  }

  if (ram && mother) {
    const a = getRamType(ram);
    const b = getMotherRamType(mother);
    if (a && b && a !== b) out.push({ level: "error", text: `La memoria es ${a} y la motherboard usa ${b}.` });
    else if (!a || !b) out.push({ level: "warning", text: "No pudimos verificar si la motherboard usa DDR4 o DDR5." });
  }

  if (cpu && !gpu && cpuHasIntegratedGraphics(cpu) === false) {
    out.push({ level: "error", text: "Este procesador no tiene gráficos integrados: necesitás una placa de video." });
  }

  if (cpu && cpuIncludesCooler(cpu) === false) {
    out.push({ level: "warning", text: "El procesador no trae cooler. Consultanos por uno compatible." });
  }

  const need = getRequiredWatts(cpu, gpu);
  const casePsu = getCasePsuWatts(pcCase);
  if (psu) {
    const watts = getPsuWatts(psu);
    if (watts && watts < need) out.push({ level: "error", text: `La fuente es de ${watts}W y recomendamos ${need}W o más.` });
    else if (!watts) out.push({ level: "warning", text: "No pudimos detectar la potencia de la fuente." });
  } else if (casePsu) {
    if (casePsu < need) out.push({ level: "warning", text: `El gabinete trae fuente de ${casePsu}W; para este armado recomendamos ${need}W.` });
    else out.push({ level: "info", text: `El gabinete incluye fuente de ${casePsu}W.` });
  }

  if ((cpu || gpu) && !psu && !casePsu) {
    out.push({ level: "info", text: `Potencia recomendada: ${need}W.` });
  }

  return out;
};
