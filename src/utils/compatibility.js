const text = (product) => product?.name?.toUpperCase() || "";

export const getCpuSocket = (cpu) => {
  const name = text(cpu);

  if (name.includes("AM5")) return "AM5";
  if (name.includes("AM4")) return "AM4";

  if (
    name.includes("1851") ||
    name.includes("S1851") ||
    name.includes("LGA1851") ||
    name.includes("ARROW LAKE")
  ) {
    return "LGA1851";
  }

  if (
    name.includes("1700") ||
    name.includes("S1700") ||
    name.includes("LGA1700")
  ) {
    return "LGA1700";
  }

  return null;
};

export const getMotherSocket = (mother) => {
  const name = text(mother);

  if (
    name.includes("1851") ||
    name.includes("LGA1851") ||
    name.includes("Z890") ||
    name.includes("B860")
  ) {
    return "LGA1851";
  }

  if (
    name.includes("1700") ||
    name.includes("LGA1700") ||
    name.includes("H610") ||
    name.includes("B660") ||
    name.includes("B760") ||
    name.includes("Z690") ||
    name.includes("Z790")
  ) {
    return "LGA1700";
  }

  if (
    name.includes("AM5") ||
    name.includes("A620") ||
    name.includes("B650") ||
    name.includes("B850") ||
    name.includes("X670") ||
    name.includes("X870")
  ) {
    return "AM5";
  }

  if (
    name.includes("AM4") ||
    name.includes("A520") ||
    name.includes("B450") ||
    name.includes("B550") ||
    name.includes("X570")
  ) {
    return "AM4";
  }

  return null;
};

export const getRamType = (ram) => {
  const name = text(ram);

  if (name.includes("DDR5")) return "DDR5";
  if (name.includes("DDR4")) return "DDR4";

  return null;
};

export const getMotherRamType = (mother) => {
  const name = text(mother);

  if (name.includes("DDR5") || name.includes("D5")) return "DDR5";
  if (name.includes("DDR4") || name.includes("D4")) return "DDR4";

  return null;
};

export const getPsuWatts = (psu) => {
  const name = text(psu);

  const wattMatch = name.match(/(\d{3,4})\s?W/);
  if (wattMatch) return Number(wattMatch[1]);

  const modelMatch = name.match(/P(\d{3,4})/);
  if (modelMatch) return Number(modelMatch[1]);

  return null;
};

export const getRequiredWatts = (cpu, gpu) => {
  const cpuName = text(cpu);
  const gpuName = text(gpu);

  let watts = 500;

  // NVIDIA gama alta
  if (gpuName.includes("5090") || gpuName.includes("4090")) watts = 1000;
  else if (gpuName.includes("5080") || gpuName.includes("4080")) watts = 850;
  else if (gpuName.includes("5070") || gpuName.includes("4070")) watts = 750;
  else if (gpuName.includes("5060") || gpuName.includes("4060")) watts = 650;

  // AMD RX gama alta / media
  if (gpuName.includes("9070") || gpuName.includes("7900")) watts = 850;
  else if (gpuName.includes("7800") || gpuName.includes("7700")) watts = 750;
  else if (gpuName.includes("7600") || gpuName.includes("6650") || gpuName.includes("6600")) watts = 650;

  // Extra por CPU potente
  if (cpuName.includes("RYZEN 9") || cpuName.includes("I9")) watts += 100;
  else if (cpuName.includes("RYZEN 7") || cpuName.includes("I7")) watts += 50;

  return watts;
};

export const checkCompatibility = (selected) => {
  const errors = [];
  const warnings = [];

  const cpu = selected.cpu;
  const mother = selected.mother;
  const ram = selected.ram;
  const gpu = selected.gpu;
  const psu = selected.psu;

  if (cpu && mother) {
    const cpuSocket = getCpuSocket(cpu);
    const motherSocket = getMotherSocket(mother);

    if (cpuSocket && motherSocket && cpuSocket !== motherSocket) {
      errors.push(`El procesador es ${cpuSocket} y la motherboard es ${motherSocket}.`);
    }

    if (!cpuSocket || !motherSocket) {
      warnings.push("No se pudo detectar con seguridad el socket del procesador o motherboard.");
    }
  }

  if (ram && mother) {
    const ramType = getRamType(ram);
    const motherRamType = getMotherRamType(mother);

    if (ramType && motherRamType && ramType !== motherRamType) {
      errors.push(`La memoria es ${ramType} y la motherboard soporta ${motherRamType}.`);
    }

    if (!ramType || !motherRamType) {
      warnings.push("No se pudo detectar con seguridad si la RAM y motherboard son DDR4 o DDR5.");
    }
  }

  if (psu && (cpu || gpu)) {
    const psuWatts = getPsuWatts(psu);
    const requiredWatts = getRequiredWatts(cpu, gpu);

    if (psuWatts && psuWatts < requiredWatts) {
      errors.push(`La fuente es de ${psuWatts}W y el armado recomienda mínimo ${requiredWatts}W.`);
    }

    if (!psuWatts) {
      warnings.push("No se pudo detectar la potencia de la fuente.");
    }
  }

  return {
    compatible: errors.length === 0,
    errors,
    warnings,
  };
};