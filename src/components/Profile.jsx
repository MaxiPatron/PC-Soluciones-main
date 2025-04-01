import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import "./Profile.css";
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
    let updateData = { full_name: fullName, phone: phone };
    if (password) {
      updateData.password = password;
    }

    const { error } = await supabase.auth.updateUser(updateData);
    if (!error) {
      alert("Perfil actualizado correctamente");
      setPassword("");
    } else {
      alert("Error al actualizar el perfil");
    }
  };

  if (loading) return <div className="text-center mt-5 text-white">Cargando...</div>;

  return (
    <div className="profile-container d-flex justify-content-center align-items-center vh-100">
      <div className="profile-card p-4 text-center">
        <h3 className="text-center mb-4">Perfil de Usuario</h3>
        {user && (
          <>
            <div className="form-group mb-3">
              <label>Nombre:</label>
              <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label>Correo Electrónico:</label>
              <input type="email" className="form-control" value={user.email} disabled />
            </div>
            <div className="form-group mb-3">
              <label>Teléfono:</label>
              <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label>Nueva Contraseña:</label>
              <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="d-flex justify-content-between">
              <button onClick={handleSaveChanges} className="btn btn-primary">Guardar Cambios</button>
              <button onClick={handleLogOut} className="btn btn-primary">Cerrar Sesión</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
