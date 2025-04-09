// src/components/UserRoles.jsx
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

function UserRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");

    if (error) {
      console.error("Error al obtener usuarios:", error.message);
    } else {
      setUsers(data);
    }

    setLoading(false);
  };

  const toggleAdmin = async (userId, currentStatus) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentStatus })
      .eq("id", userId);

    if (error) {
      console.error("Error al cambiar el rol:", error.message);
    } else {
      fetchUsers();
    }
  };

  if (loading) return <p className="text-white">Cargando usuarios...</p>;

  return (
    <div className="user-roles-container p-4">
      <h4 className="text-white mb-3">Gestión de Roles de Usuarios</h4>
      <table className="table table-dark table-striped">
        <thead>
          <tr>
            <th>Email</th>
            <th>Nombre</th>
            <th>Es Admin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.full_name}</td>
              <td>{u.is_admin ? "Sí" : "No"}</td>
              <td>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => toggleAdmin(u.id, u.is_admin)}
                >
                  {u.is_admin ? "Revocar Admin" : "Asignar Admin"}
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
