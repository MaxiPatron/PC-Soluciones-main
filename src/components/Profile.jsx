import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    city: "",
    province: "",
    role: "user",
  });

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const getUserData = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        navigate("/login");
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, city, province, role")
        .eq("id", user.id)
        .single();

      setProfile({
        full_name:
          profileData?.full_name ||
          user.user_metadata?.full_name ||
          "",
        phone:
          profileData?.phone ||
          user.user_metadata?.phone ||
          "",
        city:
          profileData?.city ||
          user.user_metadata?.city ||
          "",
        province:
          profileData?.province ||
          user.user_metadata?.province ||
          "",
        role: profileData?.role || "user",
      });

      setLoading(false);
    };

    getUserData();
  }, [navigate]);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: profile.full_name,
        phone: profile.phone,
        city: profile.city,
        province: profile.province,
      },
    });

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      province: profile.province,
      role: profile.role || "user",
    });

    if (metadataError || profileError) {
      alert("Error al actualizar el perfil");
      return;
    }

    alert("Perfil actualizado correctamente");
  };

  const handleChangePassword = async () => {
    if (!password) {
      alert("Ingrese una nueva contraseña");
      return;
    }

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert("Error al actualizar la contraseña");
      return;
    }

    alert("Contraseña actualizada correctamente");
    setPassword("");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <p className="profile-loading">Cargando perfil...</p>
      </div>
    );
  }

  const initials =
    profile.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <main className="profile-page">
      <section className="profile-wrapper">
        <div className="profile-header">
          <span>MI CUENTA</span>
          <h1>Perfil de usuario</h1>
          <p>Gestioná tus datos personales y la seguridad de tu cuenta.</p>
        </div>

        <div className="profile-grid">
          <aside className="profile-summary">
            <div className="profile-avatar">{initials}</div>

            <h2>{profile.full_name || "Usuario"}</h2>
            <p>{user.email}</p>

            <span className="profile-role">
              {profile.role === "admin" ? "Administrador" : "Cliente"}
            </span>

            <button onClick={handleLogOut} className="profile-logout">
              Cerrar sesión
            </button>
          </aside>

          <section className="profile-panel">
            <h3>Datos personales</h3>

            <div className="profile-form">
              <div className="profile-field">
                <label>Nombre y apellido</label>
                <input
                  type="text"
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="profile-field">
                <label>Correo electrónico</label>
                <input type="email" value={user.email} disabled />
              </div>

              <div className="profile-field">
                <label>Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="profile-row">
                <div className="profile-field">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={profile.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="profile-field">
                  <label>Provincia</label>
                  <input
                    type="text"
                    name="province"
                    value={profile.province}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button onClick={handleSaveProfile} className="profile-main-btn">
                Guardar cambios
              </button>
            </div>

            <div className="profile-security">
              <h3>Seguridad</h3>

              <div className="profile-field">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  placeholder="********"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button onClick={handleChangePassword} className="profile-secondary-btn">
                Cambiar contraseña
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Profile;