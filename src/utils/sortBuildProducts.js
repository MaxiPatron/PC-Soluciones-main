const text = (product) => product?.name?.toUpperCase() || "";

export const sortBuildProducts = (products, stepKey) => {
  const list = [...products];

  if (stepKey === "cpu") {
    return list.sort((a, b) => {
      const aName = text(a);
      const bName = text(b);

      const getRank = (name) => {
        if (name.includes("RYZEN 9")) return 9000;
        if (name.includes("RYZEN 7")) return 7000;
        if (name.includes("RYZEN 5")) return 5000;
        if (name.includes("RYZEN 3")) return 3000;

        if (name.includes("ULTRA 9")) return 2900;
        if (name.includes("ULTRA 7")) return 2700;
        if (name.includes("ULTRA 5")) return 2500;

        if (name.includes("I9")) return 1900;
        if (name.includes("I7")) return 1700;
        if (name.includes("I5")) return 1500;
        if (name.includes("I3")) return 1300;

        return 0;
      };

      return getRank(bName) - getRank(aName);
    });
  }

  if (stepKey === "gpu") {
    return list.sort((a, b) => {
      const getGpu = (name) => {
        const match = name.match(/(3050|3060|4060|4070|4080|4090|5060|5070|5080|5090|6600|6650|7600|7700|7800|7900|9060|9070)/);

        return match ? Number(match[1]) : 0;
      };

      return getGpu(text(b)) - getGpu(text(a));
    });
  }

  if (stepKey === "psu") {
    return list.sort((a, b) => {
      const wattsA =
        Number(text(a).match(/(\d{3,4})W/)?.[1]) || 0;

      const wattsB =
        Number(text(b).match(/(\d{3,4})W/)?.[1]) || 0;

      return wattsB - wattsA;
    });
  }

  if (stepKey === "ram") {
    return list.sort((a, b) => {
      const mhzA =
        Number(text(a).match(/(\d{4,5})MHZ/)?.[1]) || 0;

      const mhzB =
        Number(text(b).match(/(\d{4,5})MHZ/)?.[1]) || 0;

      return mhzB - mhzA;
    });
  }

  return list;
};