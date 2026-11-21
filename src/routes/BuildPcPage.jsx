import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BsCpu,
  BsMotherboard,
  BsMemory,
  BsGpuCard,
  BsDeviceSsd,
  BsLightningCharge,
  BsPc,
} from "react-icons/bs";
import {
  FaCheck,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLink,
  FaSearch,
  FaShoppingCart,
  FaTimes,
  FaTimesCircle,
  FaUndo,
  FaWhatsapp,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useCart } from "../components/CartContext";
import "../components/BuildPcPage.css";
import { sortBuildProducts } from "../utils/sortBuildProducts";
import { productImage, whatsappLink } from "../utils/store";
import {
  checkBuild,
  checkProductForStep,
  cpuHasIntegratedGraphics,
  getCasePsuWatts,
  getPowerBreakdown,
  getProductTags,
  getRequiredWatts,
  isDesktopPsu,
  isDesktopRam,
} from "../utils/compatibility";

const STEPS = [
  { key: "cpu", title: "Procesador", short: "CPU", icon: BsCpu, slugs: ["microprocesadores"] },
  { key: "mother", title: "Motherboard", short: "Mother", icon: BsMotherboard, slugs: ["motherboards"] },
  { key: "ram", title: "Memoria RAM", short: "RAM", icon: BsMemory, slugs: ["memoria-ram"] },
  { key: "gpu", title: "Placa de video", short: "GPU", icon: BsGpuCard, slugs: ["tarjetas-graficas"] },
  { key: "storage", title: "Almacenamiento", short: "Disco", icon: BsDeviceSsd, slugs: ["almacenamiento"] },
  { key: "psu", title: "Fuente", short: "Fuente", icon: BsLightningCharge, slugs: ["fuentes"] },
  { key: "case", title: "Gabinete", short: "Gabinete", icon: BsPc, slugs: ["gabinetes"] },
];

// Productos que no tienen sentido en un armado de escritorio
const BASE_FILTERS = {
  ram: isDesktopRam,
  psu: isDesktopPsu,
};

const STORAGE_KEY = "build-pc";

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
};

// ?armado=cpu.12-mother.34-ram.56x2
const encodeBuild = (selected, ramQty) =>
  STEPS.filter((s) => selected[s.key])
    .map((s) => `${s.key}.${selected[s.key].id}${s.key === "ram" && ramQty > 1 ? `x${ramQty}` : ""}`)
    .join("-");

const decodeBuild = (str) => {
  const ids = {};
  let ramQty = 1;
  (str || "").split("-").forEach((part) => {
    const m = part.match(/^(\w+)\.(\d+)(?:x(\d))?$/);
    if (!m) return;
    ids[m[1]] = Number(m[2]);
    if (m[1] === "ram" && m[3]) ramQty = Number(m[3]);
  });
  return { ids, ramQty };
};

const BuildPcPage = () => {
  const { addToCart } = useCart();
  const [params, setParams] = useSearchParams();
  const saved = useRef(loadSaved());

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(saved.current?.selected || {});
  const [ramQuantity, setRamQuantity] = useState(saved.current?.ramQuantity || 1);
  const [skipped, setSkipped] = useState(saved.current?.skipped || {});
  const [activeStep, setActiveStep] = useState("cpu");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [notice, setNotice] = useState(null);
  const mainRef = useRef(null);

  /* ---------- Carga ---------- */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, brand, sku, image_url, stock, featured, categories(name, slug)")
        .eq("active", true)
        .gt("stock", 0);

      if (error) {
        console.error("Error cargando productos:", error);
        setLoading(false);
        return;
      }
      const list = data || [];
      setProducts(list);

      const byId = new Map(list.map((p) => [p.id, p]));
      const fromUrl = params.get("armado");

      if (fromUrl) {
        // Armado compartido por link
        const { ids, ramQty } = decodeBuild(fromUrl);
        const next = {};
        Object.entries(ids).forEach(([k, id]) => byId.has(id) && (next[k] = byId.get(id)));
        setSelected(next);
        setRamQuantity(ramQty);
        setSkipped({});
        const firstMissing = STEPS.find((s) => !next[s.key]);
        setActiveStep(firstMissing?.key || "case");
      } else {
        // Armado guardado: refrescar datos y sacar lo que ya no hay en stock
        const prev = saved.current?.selected || {};
        const next = {};
        Object.entries(prev).forEach(([k, p]) => p && byId.has(p.id) && (next[k] = byId.get(p.id)));
        setSelected(next);
        const firstMissing = STEPS.find((s) => !next[s.key]);
        setActiveStep(firstMissing?.key || "case");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar en el navegador
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected, ramQuantity, skipped }));
    } catch {
      // sin almacenamiento disponible
    }
  }, [selected, ramQuantity, skipped, loading]);

  /* ---------- Pasos ---------- */
  const currentIndex = STEPS.findIndex((s) => s.key === activeStep);
  const currentStep = STEPS[currentIndex];

  const isOptional = (key) => {
    if (key === "gpu") return cpuHasIntegratedGraphics(selected.cpu) !== false;
    if (key === "psu") return !!getCasePsuWatts(selected.case);
    return false;
  };

  const isDone = (key) => !!selected[key] || (skipped[key] && isOptional(key));

  const goTo = (key) => {
    setActiveStep(key);
    setSearch("");
    setShowIncompatible(false);
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goNext = (fromKey = activeStep) => {
    const from = STEPS.findIndex((s) => s.key === fromKey);
    const next = STEPS.slice(from + 1).find((s) => !isDone(s.key)) || STEPS[from + 1];
    if (next) goTo(next.key);
  };

  /* ---------- Productos del paso ---------- */
  const { visibleProducts, hiddenCount, totalInStep } = useMemo(() => {
    if (!currentStep) return { visibleProducts: [], hiddenCount: 0, totalInStep: 0 };
    const q = search.trim().toLowerCase();
    const base = BASE_FILTERS[currentStep.key];

    const inStep = products
      .filter((p) => currentStep.slugs.includes(p.categories?.slug))
      .filter((p) => !base || base(p));

    const withCheck = inStep
      .filter(
        (p) => !q || [p.name, p.brand, p.sku].some((v) => String(v || "").toLowerCase().includes(q))
      )
      .map((p) => ({ product: p, check: checkProductForStep(currentStep.key, p, selected) }));

    const compatible = withCheck.filter((x) => x.check.ok !== false);
    const incompatible = withCheck.filter((x) => x.check.ok === false);

    const sortList = (list) => {
      const sorted = sortBuildProducts(list.map((x) => x.product), currentStep.key, sortOrder);
      const map = new Map(list.map((x) => [x.product.id, x]));
      return sorted.map((p) => map.get(p.id));
    };

    return {
      visibleProducts: [...sortList(compatible), ...(showIncompatible ? sortList(incompatible) : [])],
      hiddenCount: incompatible.length,
      totalInStep: inStep.length,
    };
  }, [products, currentStep, search, selected, sortOrder, showIncompatible]);

  /* ---------- Selección ---------- */
  const handleSelect = (product) => {
    const key = activeStep;
    if (selected[key]?.id === product.id) {
      removeStep(key);
      return;
    }
    const next = { ...selected, [key]: product };
    setSelected(next);
    setSkipped((s) => ({ ...s, [key]: false }));
    if (key === "ram") setRamQuantity((q) => q || 1);

    // Avisar si lo elegido rompe algo que ya estaba elegido
    const problems = checkBuild(next).filter((x) => x.level === "error");
    setNotice(problems.length ? problems[0].text : null);

    goNext(key);
  };

  const removeStep = (key) => {
    setSelected((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    if (key === "ram") setRamQuantity(1);
    setNotice(null);
  };

  const skipStep = () => {
    setSkipped((s) => ({ ...s, [activeStep]: true }));
    removeStep(activeStep);
    goNext();
  };

  const resetBuild = () => {
    setSelected({});
    setSkipped({});
    setRamQuantity(1);
    setNotice(null);
    setParams({});
    goTo("cpu");
  };

  /* ---------- Resumen ---------- */
  const issues = checkBuild(selected);
  const errors = issues.filter((i) => i.level === "error");
  const doneCount = STEPS.filter((s) => isDone(s.key)).length;
  const missing = STEPS.filter((s) => !isDone(s.key));
  const selectedCount = Object.keys(selected).length;
  const shareUrl = `${window.location.origin}/armar-pc?armado=${encodeBuild(selected, ramQuantity)}`;

  const whatsappMessage =
    "Hola! Quiero consultar por este armado:\n\n" +
    STEPS.filter((s) => selected[s.key])
      .map((s) => {
        const item = selected[s.key];
        const qty = s.key === "ram" && ramQuantity > 1 ? ` x${ramQuantity}` : "";
        return `• ${s.title}: ${item.name}${qty}\n  SKU: ${item.sku || "Sin SKU"}`;
      })
      .join("\n") +
    (missing.length ? `\n\nMe falta elegir: ${missing.map((s) => s.title).join(", ")}` : "") +
    (errors.length ? `\n\n⚠ La web marcó: ${errors.map((e) => e.text).join(" ")}` : "") +
    `\n\nLink del armado: ${shareUrl}`;

  const [cartAdded, setCartAdded] = useState(false);
  const addAllToCart = () => {
    STEPS.forEach((s) => {
      const p = selected[s.key];
      if (p) addToCart(p, s.key === "ram" ? ramQuantity : 1);
    });
    setNotice(null);
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  };

  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá el link de tu armado:", shareUrl);
    }
  };

  const needW = getRequiredWatts(selected.cpu, selected.gpu);
  const stepHint =
    activeStep === "gpu" && selected.cpu
      ? cpuHasIntegratedGraphics(selected.cpu) === false
        ? "Tu procesador no tiene gráficos integrados: vas a necesitar una placa de video."
        : "Tu procesador tiene gráficos integrados: la placa de video es opcional."
      : activeStep === "psu" && (selected.cpu || selected.gpu)
      ? `Para tu armado recomendamos una fuente de ${needW}W o más (${getPowerBreakdown(selected.cpu, selected.gpu).detail}).`
      : activeStep === "psu" && getCasePsuWatts(selected.case)
      ? "Tu gabinete ya incluye fuente: este paso es opcional."
      : activeStep === "ram" && selected.mother
      ? "Te mostramos solo las memorias compatibles con tu motherboard."
      : activeStep === "mother" && selected.cpu
      ? "Te mostramos solo las motherboards compatibles con tu procesador."
      : null;

  return (
    <>
      <NavBar />

      <main className="build-page">
        <section className="build-hero">
          <span className="section-eyebrow">Armá tu PC</span>
          <h1>
            Elegí tus <span className="text-accent">componentes</span>
          </h1>
          <p>
            Elegí pieza por pieza: te mostramos solo lo compatible con lo que ya elegiste. Cuando termines,
            mandanos el armado por WhatsApp y te confirmamos disponibilidad y precio.
          </p>
        </section>

        {/* ---------- Pasos ---------- */}
        <nav className="build-stepper" aria-label="Pasos del armado">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = isDone(s.key);
            return (
              <button
                key={s.key}
                className={`build-step ${activeStep === s.key ? "active" : ""} ${done ? "done" : ""}`}
                onClick={() => goTo(s.key)}
              >
                <span className="build-step-icon">
                  {done ? <FaCheck /> : <Icon />}
                </span>
                <span className="build-step-text">
                  <small>Paso {i + 1}</small>
                  {s.short}
                </span>
              </button>
            );
          })}
          <div className="build-stepper-bar">
            <span style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
          </div>
        </nav>

        <section className="build-layout">
          <div className="build-main" ref={mainRef}>
            <div className="build-section-header">
              <div>
                <span className="build-step-label">
                  Paso {currentIndex + 1} de {STEPS.length}
                  {isOptional(activeStep) && <em>Opcional</em>}
                </span>
                <h2>{currentStep.title}</h2>
              </div>

              <div className="build-tools">
                <div className="build-search">
                  <FaSearch />
                  <input
                    type="search"
                    placeholder={`Buscar ${currentStep.title.toLowerCase()}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Orden">
                  <option value="asc">Gama: menor a mayor</option>
                  <option value="desc">Gama: mayor a menor</option>
                </select>
              </div>
            </div>

            {stepHint && (
              <p className="build-hint">
                <FaInfoCircle /> {stepHint}
              </p>
            )}

            {notice && (
              <div className="build-notice">
                <FaExclamationTriangle />
                <span>{notice}</span>
                <button onClick={() => setNotice(null)} aria-label="Cerrar">
                  <FaTimes />
                </button>
              </div>
            )}

            {loading ? (
              <div className="build-products-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="build-product-card skeleton-card">
                    <div className="skeleton" style={{ height: 130 }} />
                    <div className="skeleton" style={{ height: 12, width: "40%", marginTop: 12 }} />
                    <div className="skeleton" style={{ height: 14, marginTop: 10 }} />
                    <div className="skeleton" style={{ height: 14, width: "70%", marginTop: 6 }} />
                  </div>
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="build-empty">
                <h3>
                  {totalInStep === 0
                    ? `No hay ${currentStep.title.toLowerCase()} en stock ahora`
                    : search
                    ? "No hay resultados para tu búsqueda"
                    : `No hay ${currentStep.title.toLowerCase()} compatibles en stock`}
                </h3>
                <p>Consultanos: podemos conseguirlo o sugerirte una alternativa.</p>
                <div>
                  {hiddenCount > 0 && (
                    <button onClick={() => setShowIncompatible(true)}>Ver los {hiddenCount} no compatibles</button>
                  )}
                  <a
                    href={whatsappLink(`Hola! Estoy armando una PC y busco: ${currentStep.title}.`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaWhatsapp /> Consultar
                  </a>
                </div>
              </div>
            ) : (
              <div className="build-products-grid">
                {visibleProducts.map(({ product, check }) => {
                  const isSelected = selected[activeStep]?.id === product.id;
                  const tags = getProductTags(activeStep, product);
                  return (
                    <div
                      key={product.id}
                      className={`build-product-card ${isSelected ? "active" : ""} ${check.ok === false ? "incompatible" : ""}`}
                    >
                      <button className="build-product-select" onClick={() => handleSelect(product)}>
                        <span className="build-product-img">
                          <img src={productImage(product)} alt="" loading="lazy" />
                          {isSelected && (
                            <span className="build-selected-badge">
                              <FaCheck /> Elegido
                            </span>
                          )}
                        </span>
                        <span className="build-product-brand">{product.brand || "Sin marca"}</span>
                        <span className="build-product-name">{product.name}</span>
                        {tags.length > 0 && (
                          <span className="build-tags">
                            {tags.map((t) => (
                              <em key={t}>{t}</em>
                            ))}
                          </span>
                        )}
                        {check.ok === false && (
                          <span className="build-check bad">
                            <FaTimesCircle /> {check.reason}
                          </span>
                        )}
                        {check.ok === null && (
                          <span className="build-check unknown">
                            <FaInfoCircle /> {check.reason}
                          </span>
                        )}
                      </button>
                      <Link
                        to={`/producto/${product.slug}`}
                        target="_blank"
                        className="build-product-more"
                        title="Ver detalle en otra pestaña"
                      >
                        Ver detalle <FaExternalLinkAlt />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && hiddenCount > 0 && visibleProducts.length > 0 && (
              <button className="build-toggle-incompatible" onClick={() => setShowIncompatible((v) => !v)}>
                {showIncompatible
                  ? "Ocultar los no compatibles"
                  : `Ocultamos ${hiddenCount} que no son compatibles con tu armado · Ver igual`}
              </button>
            )}

            <div className="build-step-nav">
              <button disabled={currentIndex === 0} onClick={() => goTo(STEPS[currentIndex - 1].key)}>
                <FaChevronLeft /> Anterior
              </button>
              {isOptional(activeStep) && !selected[activeStep] && (
                <button className="ghost" onClick={skipStep}>
                  No lo necesito
                </button>
              )}
              {currentIndex < STEPS.length - 1 && (
                <button className="next" onClick={() => goTo(STEPS[currentIndex + 1].key)}>
                  Siguiente <FaChevronRight />
                </button>
              )}
            </div>
          </div>

          {/* ---------- Resumen ---------- */}
          <aside className="build-summary" id="build-summary">
            <div className="build-summary-head">
              <h2>Tu armado</h2>
              <span>
                {doneCount}/{STEPS.length}
              </span>
            </div>
            <div className="build-progress">
              <span style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
            </div>

            <ul className="summary-list">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const item = selected[s.key];
                const skippedHere = skipped[s.key] && isOptional(s.key) && !item;
                return (
                  <li key={s.key} className={`summary-item ${activeStep === s.key ? "active" : ""}`}>
                    <button className="summary-main" onClick={() => goTo(s.key)}>
                      <span className="summary-thumb">
                        {item ? <img src={productImage(item)} alt="" /> : <Icon />}
                      </span>
                      <span className="summary-text">
                        <small>{s.title}</small>
                        <strong className={item ? "" : "empty"}>
                          {item ? item.name : skippedHere ? "No necesito" : "Elegir"}
                        </strong>
                      </span>
                    </button>
                    {item && (
                      <button className="summary-remove" onClick={() => removeStep(s.key)} aria-label={`Quitar ${s.title}`}>
                        <FaTimes />
                      </button>
                    )}
                    {s.key === "ram" && item && (
                      <div className="ram-selector">
                        <span>Módulos:</span>
                        {[1, 2, 4].map((n) => (
                          <button
                            key={n}
                            className={ramQuantity === n ? "active" : ""}
                            onClick={() => setRamQuantity(n)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {issues.length > 0 && (
              <ul className="build-issues">
                {issues.map((i) => (
                  <li key={i.text} className={i.level}>
                    {i.level === "error" ? (
                      <FaTimesCircle />
                    ) : i.level === "warning" ? (
                      <FaExclamationTriangle />
                    ) : (
                      <FaInfoCircle />
                    )}
                    <span>{i.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {selectedCount > 0 && errors.length === 0 && missing.length === 0 && (
              <p className="build-ok">
                <FaCheckCircle /> ¡Armado completo y compatible!
              </p>
            )}

            <a
              className={`build-whatsapp ${selectedCount === 0 ? "disabled" : ""}`}
              href={selectedCount ? whatsappLink(whatsappMessage) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={selectedCount === 0}
            >
              <FaWhatsapp /> Consultar armado
            </a>

            <div className="build-secondary-actions">
              <button onClick={addAllToCart} disabled={!selectedCount}>
                {cartAdded ? <><FaCheck /> Agregado</> : <><FaShoppingCart /> Al carrito</>}
              </button>
              <button onClick={copyLink} disabled={!selectedCount}>
                {copied ? <><FaCheck /> Copiado</> : <><FaLink /> Copiar link</>}
              </button>
              <button onClick={resetBuild} disabled={!selectedCount && !Object.values(skipped).some(Boolean)}>
                <FaUndo /> Reiniciar
              </button>
            </div>
            <p className="build-disclaimer">
              La compatibilidad se calcula a partir del nombre de cada producto. Antes de confirmar la compra la
              revisamos con vos por WhatsApp.
            </p>
          </aside>
        </section>

        {/* Barra fija en celular */}
        <a href="#build-summary" className="build-mobile-bar">
          <span>
            Tu armado <strong>{doneCount}/{STEPS.length}</strong>
            {errors.length > 0 && <em><FaExclamationTriangle /> {errors.length}</em>}
          </span>
          <span>Ver resumen</span>
        </a>
      </main>
      <Footer />
    </>
  );
};

export default BuildPcPage;
