import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import "./Profile.css"

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Cerrar sesión
  const handleLogOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate("/login");
      } else {
        setUser(user);
        setFullName(user.user_metadata?.full_name || "");
        setPhone(user.user_metadata?.phone || "");
        setLoading(false);
      }
    };
    getUserData();
  }, [navigate]);

  const handleSaveChanges = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone: phone }
    });
    if (!error) {
      alert("Perfil actualizado correctamente");
    } else {
      alert("Error al actualizar el perfil");
    }
  };

  const handleChangePassword = async () => {
    if (password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        alert("Contraseña actualizada correctamente");
        setPassword("");
      } else {
        alert("Error al actualizar la contraseña");
      }
    }
  };

  if (loading) return <div className="text-center mt-5 text-white">Cargando...</div>;

  return (
    <div className="profile-container d-flex justify-content-center align-items-center vh-100">
      <div className="profile-card p-4">
        <h3 className="text-center">Perfil de Usuario</h3>
        {user && (
          <>
            <div className="form-group">
              <label>Nombre:</label>
              <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Correo Electrónico:</label>
              <input type="email" className="form-control" value={user.email} disabled />
            </div>
            <div className="form-group">
              <label>Teléfono:</label>
              <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nueva Contraseña:</label>
              <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button onClick={handleSaveChanges} className="btn btn-success w-100 mt-3">Guardar Cambios</button>
            <button onClick={handleChangePassword} className="btn btn-warning w-100 mt-2">Actualizar Contraseña</button>
            <button onClick={handleLogOut} className="btn btn-primary w-100 mt-3">Cerrar Sesión</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;

