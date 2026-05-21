import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

function UserRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener usuarios:", error.message);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdmin = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Error al cambiar el rol:", error.message);
    } else {
      fetchUsers();
    }
  };

  if (loading) return <p className="text-white">Cargando usuarios...</p>;

  return (
    <div className="container mt-5 user-roles-container">
      <h2>Gestión de Roles</h2>

      <table className="table table-dark table-striped">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name || "Sin nombre"}</td>
              <td>{u.role}</td>
              <td>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => toggleAdmin(u.id, u.role)}
                >
                  {u.role === "admin" ? "Revocar Admin" : "Asignar Admin"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserRoles;