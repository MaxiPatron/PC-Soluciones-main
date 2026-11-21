import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaUserShield } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { useConfirm, useToast } from "./ui";

export default function UsersManager({ currentUserId }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast(`Error al obtener usuarios: ${error.message}`, "error");
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!roleFilter || (roleFilter === "admin" ? u.role === "admin" : u.role !== "admin")) &&
        (!q || [u.full_name, u.email, u.phone].some((v) => String(v || "").toLowerCase().includes(q)))
    );
  }, [users, search, roleFilter]);

  const toggleAdmin = async (u) => {
    const makeAdmin = u.role !== "admin";
    const ok = await confirm({
      title: makeAdmin ? "¿Dar permisos de admin?" : "¿Quitar permisos de admin?",
      message: makeAdmin
        ? `${u.full_name || "Este usuario"} va a poder crear, editar y eliminar productos, categorías y roles.`
        : `${u.full_name || "Este usuario"} ya no va a poder entrar al panel.`,
      confirmText: makeAdmin ? "Hacer admin" : "Quitar admin",
      danger: !makeAdmin,
    });
    if (!ok) return;
    const role = makeAdmin ? "admin" : "user";
    const { error } = await supabase.from("profiles").update({ role }).eq("id", u.id);
    if (error) return toast(`Error al cambiar el rol: ${error.message}`, "error");
    setUsers((all) => all.map((x) => (x.id === u.id ? { ...x, role } : x)));
    toast(makeAdmin ? "Ahora es admin" : "Permisos de admin quitados");
  };

  if (loading)
    return (
      <div className="adm-loading">
        <div className="adm-spinner" /> Cargando usuarios...
      </div>
    );

  const initials = (name) =>
    (name || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="adm-users">
      <div className="adm-toolbar">
        <div className="adm-search">
          <FaSearch />
          <input placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="admin">Admins</option>
          <option value="user">Usuarios</option>
        </select>
        <span className="adm-muted">
          {users.filter((u) => u.role === "admin").length} admins · {users.length} usuarios
        </span>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Registrado</th>
              <th className="right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="adm-user-cell">
                      <span className="adm-avatar">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" /> : initials(u.full_name)}
                      </span>
                      <div>
                        <span className="adm-prod-name">
                          {u.full_name || "Sin nombre"} {isMe && <span className="adm-badge">Vos</span>}
                        </span>
                        {u.email && <span className="adm-prod-sku">{u.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`adm-badge ${u.role === "admin" ? "accent" : ""}`}>
                      {u.role === "admin" && <FaUserShield />} {u.role || "user"}
                    </span>
                  </td>
                  <td className="adm-muted">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("es-AR") : "—"}
                  </td>
                  <td className="right">
                    <button
                      className={`adm-btn small ${u.role === "admin" ? "ghost" : "primary"}`}
                      onClick={() => toggleAdmin(u)}
                      disabled={isMe}
                      title={isMe ? "No podés cambiar tu propio rol" : ""}
                    >
                      {u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="adm-empty">No hay usuarios que coincidan.</div>}
      </div>
    </div>
  );
}
