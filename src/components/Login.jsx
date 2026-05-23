import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    city: "",
    province: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!form.email) {
      setError("Ingresá tu correo para recuperar la contraseña.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError("No se pudo enviar el correo: " + error.message);
      return;
    }

    setMessage("Te enviamos un correo para cambiar tu contraseña.");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isRegister) {
        if (form.password !== form.confirmPassword) {
          setError("Las contraseñas no coinciden.");
          return;
        }

        if (form.password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName,
              phone: form.phone,
              city: form.city,
              province: form.province,
            },
          },
        });

        if (error) throw error;

        const user = data.user;

        if (user) {
          await supabase.from("profiles").upsert({
            id: user.id,
            full_name: form.fullName,
            phone: form.phone,
            city: form.city,
            province: form.province,
            role: "user",
          });
        }

        setMessage("Registro exitoso. Revisá tu correo para confirmar la cuenta.");
        setIsRegister(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      navigate("/profile");
    } catch (err) {
      setError("Error al autenticar: " + err.message);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) navigate("/profile");
    };

    checkUser();
  }, [navigate]);

  return (
    <div className="login-background">
      <div className="login-card">
        <div className="login-info">
          <span>PC SOLUCIONES</span>
          <h1>{isRegister ? "Creá tu cuenta" : "Bienvenido de nuevo"}</h1>
          <p>
            Accedé a tu perfil, consultá productos y recibí asesoramiento
            personalizado para tu próximo setup.
          </p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          <h2>{isRegister ? "Registrarse" : "Iniciar sesión"}</h2>

          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          {isRegister && (
            <>
              <div className="form-group">
                <label>Nombre y apellido</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="Nombre y Apellido"
                  required
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="351..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="login-input"
                    placeholder="Ciudad"
                  />
                </div>

                <div className="form-group">
                  <label>Provincia</label>
                  <input
                    type="text"
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    className="login-input"
                    placeholder="Provincia"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="login-input"
              placeholder="tuemail@gmail.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                className="login-input"
                placeholder="********"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Repetir contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="login-input"
                placeholder="********"
                required
              />
            </div>
          )}

          {!isRegister && (
            <button
              type="button"
              className="forgot-button"
              onClick={handleForgotPassword}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button type="submit" className="login-button">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setMessage("");
            }}
            className="toggle-button"
          >
            {isRegister
              ? "¿Ya tenés una cuenta? Iniciá sesión"
              : "¿No tenés cuenta? Registrate"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;