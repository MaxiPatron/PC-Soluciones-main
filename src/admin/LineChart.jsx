import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Gráfico de línea simple en SVG, con hover (línea vertical + tooltip).
 * points: [{ x: Date, y: number }] ordenados por fecha.
 * step: dibuja escalones (para precios, que cambian de golpe).
 * baseline: valor de referencia dibujado como línea punteada (ej. 100).
 */
export default function LineChart({
  points,
  height = 220,
  format = (v) => v,
  formatDate = (d) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
  step = false,
  baseline = null,
  label = "Gráfico",
}) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 14, right: 16, bottom: 28, left: 64 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const geo = useMemo(() => {
    if (!points.length) return null;
    const xs = points.map((p) => p.x.getTime());
    const ys = points.map((p) => p.y);
    if (baseline != null) ys.push(baseline);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    if (minX === maxX) {
      minX -= 86400000;
      maxX += 86400000;
    }
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    const span = maxY - minY || Math.abs(maxY) * 0.05 || 1;
    minY -= span * 0.12;
    maxY += span * 0.12;

    const sx = (t) => pad.left + ((t - minX) / (maxX - minX)) * w;
    const sy = (v) => pad.top + (1 - (v - minY) / (maxY - minY)) * h;

    let d = "";
    points.forEach((p, i) => {
      const X = sx(p.x.getTime());
      const Y = sy(p.y);
      if (i === 0) d += `M${X},${Y}`;
      else if (step) d += `H${X}V${Y}`;
      else d += `L${X},${Y}`;
    });

    // 4 líneas de grilla horizontales
    const ticksY = Array.from({ length: 4 }, (_, i) => minY + ((i + 0.5) * (maxY - minY)) / 4);
    // hasta 6 fechas en el eje X
    const nX = Math.min(6, points.length);
    const ticksX = Array.from({ length: nX }, (_, i) =>
      nX === 1 ? minX : minX + (i * (maxX - minX)) / (nX - 1)
    );

    return { sx, sy, d, ticksY, ticksX };
  }, [points, baseline, step, w, h, pad.left, pad.top]);

  if (!points.length) {
    return <div className="adm-chart-empty">Todavía no hay datos para este período.</div>;
  }

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(geo.sx(p.x.getTime()) - mx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover != null ? points[hover] : null;
  const hx = hp ? geo.sx(hp.x.getTime()) : 0;
  const hy = hp ? geo.sy(hp.y) : 0;
  const last = points[points.length - 1];

  return (
    <div className="adm-chart" ref={wrapRef}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {geo.ticksY.map((v, i) => (
          <g key={i}>
            <line className="adm-chart-grid" x1={pad.left} x2={width - pad.right} y1={geo.sy(v)} y2={geo.sy(v)} />
            <text className="adm-chart-tick" x={pad.left - 8} y={geo.sy(v)} textAnchor="end" dominantBaseline="middle">
              {format(v)}
            </text>
          </g>
        ))}
        {geo.ticksX.map((t, i) => (
          <text
            key={i}
            className="adm-chart-tick"
            x={geo.sx(t)}
            y={height - 8}
            textAnchor={i === 0 ? "start" : i === geo.ticksX.length - 1 ? "end" : "middle"}
          >
            {formatDate(new Date(t))}
          </text>
        ))}
        {baseline != null && (
          <line
            className="adm-chart-baseline"
            x1={pad.left}
            x2={width - pad.right}
            y1={geo.sy(baseline)}
            y2={geo.sy(baseline)}
          />
        )}

        <path className="adm-chart-line" d={geo.d} />
        <circle className="adm-chart-dot" cx={geo.sx(last.x.getTime())} cy={geo.sy(last.y)} r="4" />

        {hp && (
          <g>
            <line className="adm-chart-cross" x1={hx} x2={hx} y1={pad.top} y2={pad.top + h} />
            <circle className="adm-chart-dot hover" cx={hx} cy={hy} r="5" />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className="adm-chart-tip"
          style={{
            left: Math.min(Math.max(hx, 70), width - 70),
            top: Math.max(hy - 12, 0),
          }}
        >
          <span>{hp.x.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</span>
          <strong>{format(hp.y)}</strong>
          {hp.note && <small>{hp.note}</small>}
        </div>
      )}
    </div>
  );
}
