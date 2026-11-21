const text = (product) => product?.name?.toUpperCase() || "";

const sortByValue = (products, getValue, sortOrder) => {
  return [...products].sort((a, b) => {
    const result = getValue(a) - getValue(b);
    return sortOrder === "asc" ? result : -result;
  });
};

const getRamCapacity = (product) => {
  const name = text(product);
  const match = name.match(/(\d+)\s?GB/);
  return match ? Number(match[1]) : 0;
};

const getGpuModel = (product) => {
  const name = text(product);
  const match = name.match(
    /(3050|3060|3070|3080|3090|4050|4060|4070|4080|4090|5050|5060|5070|5080|5090|6500|6600|6650|7600|7700|7800|7900|9060|9070)/
  );

  return match ? Number(match[1]) : 0;
};

const getPsuWattsValue = (product) => {
  const name = text(product);

  const wattMatch = name.match(/(\d{3,4})\s?W/);
  if (wattMatch) return Number(wattMatch[1]);

  const modelMatch = name.match(/P(\d{3,4})/);
  if (modelMatch) return Number(modelMatch[1]);

  return 0;
};
const getStorageCapacity = (product) => {
  const name = text(product);

  const tbMatch = name.match(/(\d+(?:\.\d+)?)\s?TB/);
  if (tbMatch) return Number(tbMatch[1]) * 1000;

  const gbMatch = name.match(/(\d+)\s?GB/);
  if (gbMatch) return Number(gbMatch[1]);

  return 0;
};

const getMotherRank = (product) => {
  const name = text(product);

  if (name.includes("A520")) return 520;
  if (name.includes("B450")) return 450;
  if (name.includes("B550")) return 550;
  if (name.includes("A620")) return 620;
  if (name.includes("B650")) return 650;
  if (name.includes("B850")) return 850;
  if (name.includes("X670")) return 670;
  if (name.includes("X870")) return 870;

  if (name.includes("H610")) return 610;
  if (name.includes("B660")) return 660;
  if (name.includes("B760")) return 760;
  if (name.includes("B860")) return 860;
  if (name.includes("Z690")) return 690;
  if (name.includes("Z790")) return 790;
  if (name.includes("Z890")) return 890;

  return 0;
};

const getCpuRank = (product) => {
  const name = text(product);

  if (name.includes("RYZEN 3")) return 3000;
  if (name.includes("RYZEN 5")) return 5000;
  if (name.includes("RYZEN 7")) return 7000;
  if (name.includes("RYZEN 9")) return 9000;

  if (name.includes("I3")) return 1300;
  if (name.includes("I5")) return 1500;
  if (name.includes("I7")) return 1700;
  if (name.includes("I9")) return 1900;

  if (name.includes("ULTRA 5")) return 2500;
  if (name.includes("ULTRA 7")) return 2700;
  if (name.includes("ULTRA 9")) return 2900;

  return 0;
};

export const sortBuildProducts = (products, stepKey, sortOrder = "asc") => {
  if (stepKey === "cpu") {
    return sortByValue(products, getCpuRank, sortOrder);
  }

  if (stepKey === "ram") {
    return sortByValue(products, getRamCapacity, sortOrder);
  }

  if (stepKey === "gpu") {
    return sortByValue(products, getGpuModel, sortOrder);
  }

  if (stepKey === "psu") {
    return sortByValue(products, getPsuWattsValue, sortOrder);
  }
  
  if (stepKey === "storage") {
  return sortByValue(products, getStorageCapacity, sortOrder);
}

if (stepKey === "mother") {
  return sortByValue(products, getMotherRank, sortOrder);
}

  return products;
};