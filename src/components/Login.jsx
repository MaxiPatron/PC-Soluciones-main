import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Login.css";  // Importamos el archivo de estilos

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");

    try {
      let response;
      if (isRegister) {
        response = await supabase.auth.signUp({ email, password });
      } else {
        response = await supabase.auth.signInWithPassword({ email, password });
      }

      if (response.error) throw response.error;

      if (isRegister) {
        alert("¡Registro exitoso! Revisa tu correo para confirmar la cuenta.");
      }

      navigate("/profile");
    } catch (err) {
      if (err.status === 422) {
        setError("El formato del correo o la contraseña no es válido.");
      } else if (err.status === 400) {
        setError("El usuario ya está registrado o la contraseña es incorrecta.");
      } else {
        setError("Error al autenticar: " + err.message);
      }
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) navigate("/profile");
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="login-background">
      <div className="login-container">
        <form onSubmit={handleAuth} className="login-form">
          <h2>{isRegister ? "Registrarse" : "Iniciar Sesión"}</h2>
          {error && <p className="error-message">{error}</p>}
          <label htmlFor="email">Correo Electrónico:</label>
          <input
            type="email"
            value={email}
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            placeholder="youremail@site.com"
            required
          />
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            value={password}
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            placeholder="********"
            required
          />
          <button type="submit" className="login-button">
            {isRegister ? "Registrarse" : "Iniciar Sesión"}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="toggle-button"
          >
            {isRegister ? "¿Ya tienes una cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
