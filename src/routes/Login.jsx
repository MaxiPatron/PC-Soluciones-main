import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage("Revisa tu correo para confirmar tu cuenta.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="row p-4">
      <div className="col-md-4 offset-md-4">
        <form onSubmit={handleLogin} className="card card-body">
          <h2>Iniciar sesión</h2>
          {message && <p>{message}</p>}
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-control mb-2"
            placeholder="youremail@site.com"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-control mb-2"
            placeholder="******"
            required
          />
          <button type="submit" className="btn btn-primary">Login</button>
          <button onClick={handleRegister} className="btn btn-secondary">Register</button>
        </form>
      </div>
    </div>
  );
}

export default Login;