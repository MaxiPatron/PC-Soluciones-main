import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";
import "../components/BuildPcPage.css";
import {
    getCpuSocket,
    getMotherSocket,
    getRamType,
    getMotherRamType,
    getPsuWatts,
    getRequiredWatts,
} from "../utils/compatibility";
const steps = [
    { key: "cpu", title: "Procesador", slugs: ["microprocesadores"] },
    { key: "mother", title: "Motherboard", slugs: ["motherboards"] },
    { key: "ram", title: "Memoria RAM", slugs: ["memoria-ram"] },
    { key: "gpu", title: "Placa de video", slugs: ["tarjetas-graficas"] },
    { key: "storage", title: "Almacenamiento", slugs: ["almacenamiento"] },
    { key: "psu", title: "Fuente", slugs: ["fuentes"] },
    { key: "case", title: "Gabinete", slugs: ["gabinetes"] },
];

const brandImages = {
    Intel: "/brands/intel.jpeg",
    AMD: "/brands/amd.jpg",
    NVIDIA: "/brands/nvidia.png",
    Kingston: "/brands/Kingston.jpg",
    ADATA: "/brands/adata.jpg",
    XPG: "/brands/xpg.jpg",
    ASUS: "/brands/asus.jpg",
    MSI: "/brands/msi.jpg",
    Gigabyte: "/brands/gigabyte.jpg",
    Memox: "/brands/memox.jpg",
    "Western Digital": "/brands/westerndigital.jpg",
};

const getProductImage = (product) =>
    product.image_url?.trim() ||
    brandImages[product.brand] ||
    "/brands/hardwaregen.png";

const BuildPcPage = () => {
    const [products, setProducts] = useState([]);
    const [selected, setSelected] = useState({});
    const [activeStep, setActiveStep] = useState("cpu");
    const [search, setSearch] = useState("");
    const [ramQuantity, setRamQuantity] = useState(1);
    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from("products")
                .select(`
          *,
          categories (
            name,
            slug
          )
        `)
                .eq("active", true)
                .gt("stock", 0);

            if (error) {
                console.error("Error cargando productos:", error);
                return;
            }

            setProducts(data || []);
        };

        fetchProducts();
    }, []);

    const currentStep = steps.find((step) => step.key === activeStep);

    const getProductsByStep = (step) => {
        let list = products.filter((product) =>
            step.slugs.includes(product.categories?.slug)
        );

        if (step.key === "mother" && selected.cpu) {
            const cpuSocket = getCpuSocket(selected.cpu);

            if (cpuSocket) {
                list = list.filter((mother) => {
                    const motherSocket = getMotherSocket(mother);
                    return motherSocket === cpuSocket;
                });
            }
        }

        if (step.key === "ram" && selected.mother) {
            const motherRamType = getMotherRamType(selected.mother);

            if (motherRamType) {
                list = list.filter((ram) => {
                    const ramType = getRamType(ram);
                    return ramType === motherRamType;
                });
            }
        }

        if (step.key === "psu" && (selected.cpu || selected.gpu)) {
            const requiredWatts = getRequiredWatts(selected.cpu, selected.gpu);

            list = list.filter((psu) => {
                const psuWatts = getPsuWatts(psu);

                if (!psuWatts) return false;

                return psuWatts >= requiredWatts;
            });
        }

        list = list.filter((product) =>
            product.name.toLowerCase().includes(search.toLowerCase()) ||
            product.brand?.toLowerCase().includes(search.toLowerCase()) ||
            product.sku?.toLowerCase().includes(search.toLowerCase())
        );

        return list;
    };

    const handleSelect = (stepKey, product) => {
        if (stepKey === "ram") {
            if (selected.ram?.id === product.id) {
                setSelected((prev) => {
                    const copy = { ...prev };
                    delete copy.ram;
                    return copy;
                });

                setRamQuantity(1);
                return;
            }

            setSelected((prev) => ({
                ...prev,
                ram: product,
            }));

            const currentIndex = steps.findIndex(
                (step) => step.key === stepKey
            );

            const nextStep = steps[currentIndex + 1];

            if (nextStep) {
                setActiveStep(nextStep.key);
                setSearch("");
            }

            return;
        }

        if (selected[stepKey]?.id === product.id) {
            setSelected((prev) => {
                const copy = { ...prev };
                delete copy[stepKey];
                return copy;
            });

            return;
        }

        setSelected((prev) => ({
            ...prev,
            [stepKey]: product,
        }));

        const currentIndex = steps.findIndex(
            (step) => step.key === stepKey
        );

        const nextStep = steps[currentIndex + 1];

        if (nextStep) {
            setActiveStep(nextStep.key);
            setSearch("");
        }
    };

    const whatsappText = encodeURIComponent(
        `Hola! Quiero consultar por este armado:\n\n${steps
            .filter((step) => selected[step.key])
            .map((step) => {
                const item = selected[step.key];
                if (step.key === "ram") {
                    return `${step.title}: ${item.name} x${ramQuantity} - SKU: ${item.sku || "Sin SKU"}`;
                }
                return `${step.title}: ${item.name} - SKU: ${item.sku || "Sin SKU"}`;
            })
            .join("\n")}`
    );

    const activeProducts = currentStep ? getProductsByStep(currentStep) : [];

    return (
        <>
            <NavBar />

            <main className="build-page">
                <section className="build-hero">
                    <span>ARMÁ TU PC</span>
                    <h1>Elegí tus componentes</h1>
                    <p>
                        Seleccioná pieza por pieza y mandanos tu armado para confirmar
                        disponibilidad, compatibilidad y precio final.
                    </p>
                </section>

                <section className="build-layout">
                    <div className="build-main">
                        <div className="build-section-header">
                            <div>
                                <span>Paso actual</span>
                                <h2>{currentStep?.title}</h2>
                            </div>

                            <input
                                type="text"
                                placeholder={`Buscar ${currentStep?.title?.toLowerCase()}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="build-products-grid">
                            {activeProducts.map((product) => (
                                <button
                                    key={product.id}
                                    className={
                                        selected[activeStep]?.id === product.id
                                            ? "build-product-card active"
                                            : "build-product-card"
                                    }
                                    onClick={() => handleSelect(activeStep, product)}
                                >
                                    <img src={getProductImage(product)} alt={product.name} />

                                    <div>
                                        <span>{product.brand || "Sin marca"}</span>
                                        <h3>{product.name}</h3>
                                        <small>SKU: {product.sku || "Sin SKU"}</small>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <aside className="build-summary">
                        <h2>Tu armado</h2>

                        {steps.map((step) => (
                            <button
                                type="button"
                                className={
                                    activeStep === step.key
                                        ? "summary-item active"
                                        : "summary-item"
                                }
                                key={step.key}
                                onClick={() => {
                                    setActiveStep(step.key);
                                    setSearch("");
                                }}
                            >
                                <span>{step.title}</span>
                                <strong>
                                    {step.key === "ram"
                                        ? selected.ram
                                            ? `${selected.ram.name} (${ramQuantity} módulo${ramQuantity > 1 ? "s" : ""})`
                                            : "No seleccionado"
                                        : selected[step.key]?.name || "No seleccionado"}
                                </strong>
                                {step.key === "ram" && selected.ram && (
                                    <div className="ram-selector">
                                        <button
                                            type="button"
                                            className={ramQuantity === 1 ? "active" : ""}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRamQuantity(1);
                                            }}
                                        >
                                            1 RAM
                                        </button>

                                        <button
                                            type="button"
                                            className={ramQuantity === 2 ? "active" : ""}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRamQuantity(2);
                                            }}
                                        >
                                            2 RAM
                                        </button>
                                    </div>
                                )}
                            </button>
                        ))}
                        <a
                            className="build-whatsapp"
                            href={`https://wa.me/5493513256553?text=${whatsappText}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Consultar armado
                        </a>
                    </aside>
                </section>
            </main>
        </>
    );
};

export default BuildPcPage;