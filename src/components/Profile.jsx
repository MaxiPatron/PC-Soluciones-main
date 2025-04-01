import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Cerrar sesión
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
      } else {
        setUser(user);
        setLoading(false);
      }
    };
    getUserData();
  }, [navigate]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="p-4">
      <h2>Perfil de Usuario</h2>
      {user && (
        <>
          <p>Correo: {user.email}</p>
          <p>ID de Usuario: {user.id}</p>
          <button onClick={handleLogOut} className="btn btn-danger mt-3">
            Cerrar Sesión
          </button>
        </>
      )}
    </div>
  );
}

export default Profile;