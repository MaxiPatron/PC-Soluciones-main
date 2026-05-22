import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../components/Login.css";

function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError("No se pudo actualizar la contraseña: " + error.message);
      return;
    }

    setMessage("Contraseña actualizada correctamente.");

    setTimeout(() => {
      navigate("/login");
    }, 1800);
  };

  return (
    <div className="login-background">
      <div className="login-card update-password-card">
        <div className="login-info">
          <span>PC SOLUCIONES</span>
          <h1>Nueva contraseña</h1>
          <p>Elegí una nueva contraseña segura para volver a acceder a tu cuenta.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="login-form">
          <h2>Restablecer contraseña</h2>

          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          <div className="form-group">
            <label>Nueva contraseña</label>
            <input
              type="password"
              className="login-input"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Repetir contraseña</label>
            <input
              type="password"
              className="login-input"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button">
            Guardar nueva contraseña
          </button>
        </form>
      </div>
    </div>
  );
}

export default UpdatePassword;