import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaShoppingCart,
  FaSignOutAlt,
  FaUserShield,
  FaWhatsapp,
  FaBoxOpen,
  FaChevronRight,
  FaLock,
  FaUser,
} from "react-icons/fa";
import { BsPc } from "react-icons/bs";
import { supabase } from "../utils/supabaseClient";
import { useCart } from "./CartContext";
import { whatsappLink } from "../utils/store";
import "./Profile.css";

const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
];

const FIELDS = ["full_name", "phone", "city", "province"];

const passwordStrength = (pw) => {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(4, Math.max(1, score));
  return { score: level, label: ["", "Débil", "Aceptable", "Buena", "Muy buena"][level] };
};

const readSavedBuild = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("build-pc"));
    return saved?.selected ? Object.keys(saved.selected).length : 0;
  } catch {
    return 0;
  }
};

function Status({ status }) {
  if (!status) return null;
  return (
    <p className={`profile-status ${status.type}`} role="status">
      {status.type === "ok" ? <FaCheckCircle /> : <FaExclamationCircle />} {status.text}
    </p>
  );
}

function Profile() {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("user");
  const [initial, setInitial] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "", city: "", province: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState(null);

  const buildParts = useMemo(readSavedBuild, []);
  const cartUnits = cart.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        navigate("/login");
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, city, province, role")
        .eq("id", user.id)
        .maybeSingle();

      const meta = user.user_metadata || {};
      const loaded = Object.fromEntries(FIELDS.map((f) => [f, data?.[f] || meta[f] || ""]));
      setProfile(loaded);
      setInitial(loaded);
      setRole(data?.role || "user");
      setLoading(false);
    })();
  }, [navigate]);

  const dirty = initial && FIELDS.some((f) => (profile[f] || "") !== (initial[f] || ""));
  const completed = FIELDS.filter((f) => String(profile[f] || "").trim()).length;
  const phoneDigits = profile.phone.replace(/\D/g, "");
  const phoneInvalid = profile.phone && (phoneDigits.length < 8 || phoneDigits.length > 15);

  const handleChange = (e) => {
    setProfileStatus(null);
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      setProfileStatus({ type: "error", text: "Ingresá tu nombre." });
      return;
    }
    if (phoneInvalid) {
      setProfileStatus({ type: "error", text: "Revisá el teléfono (código de área + número)." });
      return;
    }

    setSaving(true);
    const clean = Object.fromEntries(FIELDS.map((f) => [f, String(profile[f] || "").trim()]));

    // Nunca mandamos "role": el rol solo lo cambia un admin desde el panel
    const [{ error: metaError }, { error: profileError }] = await Promise.all([
      supabase.auth.updateUser({ data: clean }),
      supabase.from("profiles").upsert({ id: user.id, ...clean }),
    ]);
    setSaving(false);

    if (metaError || profileError) {
      setProfileStatus({ type: "error", text: "No se pudieron guardar los cambios. Probá de nuevo." });
      return;
    }
    setProfile(clean);
    setInitial(clean);
    setProfileStatus({ type: "ok", text: "Datos guardados." });
  };

  const strength = passwordStrength(password);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus(null);
    if (password.length < 8) {
      setPwStatus({ type: "error", text: "La contraseña tiene que tener al menos 8 caracteres." });
      return;
    }
    if (password !== password2) {
      setPwStatus({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwSaving(false);
    if (error) {
      setPwStatus({
        type: "error",
        text: /different|same/i.test(error.message)
          ? "La nueva contraseña tiene que ser distinta a la actual."
          : "No se pudo cambiar la contraseña. Probá de nuevo.",
      });
      return;
    }
    setPassword("");
    setPassword2("");
    setPwStatus({ type: "ok", text: "Contraseña actualizada." });
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-wrapper">
          <div className="skeleton" style={{ height: 150, borderRadius: 24 }} />
          <div className="profile-grid" style={{ marginTop: 24 }}>
            <div className="skeleton" style={{ height: 420, borderRadius: 24 }} />
            <div className="skeleton" style={{ height: 300, borderRadius: 24 }} />
          </div>
        </div>
      </main>
    );
  }

  const initials =
    profile.full_name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || user.email[0].toUpperCase();

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="profile-page">
      <div className="profile-wrapper">
        {/* ---------- Encabezado ---------- */}
        <section className="profile-hero">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-hero-info">
            <span className="section-eyebrow">Mi cuenta</span>
            <h1>{profile.full_name ? `Hola, ${profile.full_name.split(" ")[0]}` : "Tu perfil"}</h1>
            <p>{user.email}</p>
            <div className="profile-badges">
              <span className={`profile-role ${role === "admin" ? "admin" : ""}`}>
                {role === "admin" ? <><FaUserShield /> Administrador</> : <><FaUser /> Cliente</>}
              </span>
              {memberSince && <span className="profile-since">Desde {memberSince}</span>}
            </div>
          </div>
          <div className="profile-hero-actions">
            {role === "admin" && (
              <Link to="/ProductsForm" className="profile-btn ghost">
                <FaUserShield /> Panel admin
              </Link>
            )}
            <button onClick={handleLogOut} className="profile-btn danger">
              <FaSignOutAlt /> Cerrar sesión
            </button>
          </div>
        </section>

        <div className="profile-grid">
          <div className="profile-col">
            {/* ---------- Datos ---------- */}
            <form className="profile-card" onSubmit={handleSaveProfile} noValidate>
              <header className="profile-card-head">
                <div>
                  <h2>Datos personales</h2>
                  <p>Los usamos para responder tus consultas más rápido.</p>
                </div>
                <div className="profile-complete" title={`${completed} de ${FIELDS.length} datos completos`}>
                  <span>{Math.round((completed / FIELDS.length) * 100)}%</span>
                  <div>
                    <i style={{ width: `${(completed / FIELDS.length) * 100}%` }} />
                  </div>
                </div>
              </header>

              <div className="profile-form">
                <label className="profile-field">
                  <span>Nombre y apellido</span>
                  <input
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleChange}
                    autoComplete="name"
                    placeholder="Juan Pérez"
                  />
                </label>

                <label className="profile-field">
                  <span>Correo electrónico</span>
                  <input type="email" value={user.email} disabled />
                  <small>El email no se puede cambiar desde acá.</small>
                </label>

                <label className={`profile-field ${phoneInvalid ? "invalid" : ""}`}>
                  <span>Teléfono / WhatsApp</span>
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    placeholder="351 123-4567"
                  />
                  <small>{phoneInvalid ? "Ingresá código de área + número." : "Código de área + número, sin el 0 ni el 15."}</small>
                </label>

                <div className="profile-row">
                  <label className="profile-field">
                    <span>Provincia</span>
                    <select name="province" value={profile.province} onChange={handleChange}>
                      <option value="">Elegí tu provincia</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      {profile.province && !PROVINCES.includes(profile.province) && (
                        <option value={profile.province}>{profile.province}</option>
                      )}
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Ciudad</span>
                    <input
                      name="city"
                      value={profile.city}
                      onChange={handleChange}
                      autoComplete="address-level2"
                      placeholder="Córdoba"
                    />
                  </label>
                </div>

                <div className="profile-actions">
                  <Status status={profileStatus} />
                  <button type="submit" className="profile-btn primary" disabled={saving || !dirty}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </form>

            {/* ---------- Seguridad ---------- */}
            <form className="profile-card" onSubmit={handleChangePassword} noValidate>
              <header className="profile-card-head">
                <div>
                  <h2>
                    <FaLock /> Seguridad
                  </h2>
                  <p>Cambiá tu contraseña. Usá al menos 8 caracteres.</p>
                </div>
              </header>

              <div className="profile-form">
                <div className="profile-row">
                  <label className="profile-field">
                    <span>Nueva contraseña</span>
                    <div className="profile-pw">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPwStatus(null);
                        }}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPw ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </label>

                  <label className={`profile-field ${password2 && password2 !== password ? "invalid" : ""}`}>
                    <span>Repetir contraseña</span>
                    <input
                      type={showPw ? "text" : "password"}
                      value={password2}
                      onChange={(e) => {
                        setPassword2(e.target.value);
                        setPwStatus(null);
                      }}
                      autoComplete="new-password"
                    />
                    {password2 && password2 !== password && <small>No coinciden.</small>}
                  </label>
                </div>

                {password && (
                  <div className={`profile-strength s${strength.score}`}>
                    <div>
                      {[1, 2, 3, 4].map((i) => (
                        <i key={i} className={i <= strength.score ? "on" : ""} />
                      ))}
                    </div>
                    <span>{strength.label}</span>
                  </div>
                )}

                <div className="profile-actions">
                  <Status status={pwStatus} />
                  <button type="submit" className="profile-btn primary" disabled={pwSaving || !password || !password2}>
                    {pwSaving ? "Cambiando..." : "Cambiar contraseña"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ---------- Lateral ---------- */}
          <aside className="profile-col">
            <section className="profile-card">
              <h2 className="profile-side-title">Tu actividad</h2>
              <ul className="profile-links">
                <li>
                  <Link to="/armar-pc">
                    <span className="profile-link-icon"><BsPc /></span>
                    <span>
                      <strong>Tu armado</strong>
                      <small>{buildParts ? `${buildParts} de 7 componentes elegidos` : "Todavía no empezaste uno"}</small>
                    </span>
                    <FaChevronRight />
                  </Link>
                </li>
                <li>
                  <Link to="/carrito">
                    <span className="profile-link-icon"><FaShoppingCart /></span>
                    <span>
                      <strong>Carrito de consulta</strong>
                      <small>{cartUnits ? `${cartUnits} producto${cartUnits > 1 ? "s" : ""}` : "Vacío"}</small>
                    </span>
                    <FaChevronRight />
                  </Link>
                </li>
                <li>
                  <Link to="/productos">
                    <span className="profile-link-icon"><FaBoxOpen /></span>
                    <span>
                      <strong>Catálogo</strong>
                      <small>Ver todos los productos</small>
                    </span>
                    <FaChevronRight />
                  </Link>
                </li>
              </ul>
            </section>

            <section className="profile-card profile-help">
              <h2 className="profile-side-title">¿Necesitás ayuda?</h2>
              <p>Escribinos por WhatsApp y te asesoramos con tu compra o tu armado.</p>
              <a
                href={whatsappLink(
                  `Hola! Soy ${profile.full_name || user.email} y quería hacer una consulta.`
                )}
                target="_blank"
                rel="noreferrer"
                className="profile-btn primary full"
              >
                <FaWhatsapp /> Escribinos
              </a>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Profile;
