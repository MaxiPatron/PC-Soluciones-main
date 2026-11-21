import { useMemo, useState } from "react";
import { FaCheck, FaEdit, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { Field, useConfirm, useToast } from "./ui";
import { createSlug } from "./pricing";

const empty = { name: "", slug: "", description: "" };

export default function CategoriesManager({ categories, products, reloadCategories, reloadProducts }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(empty);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(empty);

  const counts = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p.category_id) map[p.category_id] = (map[p.category_id] || 0) + 1;
    });
    return map;
  }, [products]);

  const slugTaken = (slug, exceptId) => categories.some((c) => c.slug === slug && c.id !== exceptId);

  const create = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      slug: (form.slug || createSlug(form.name)).trim(),
      description: form.description.trim() || null,
    };
    if (!payload.name) return toast("El nombre es obligatorio", "error");
    if (slugTaken(payload.slug)) return toast("Ya existe una categoría con ese slug", "error");

    const { error } = await supabase.from("categories").insert([payload]);
    if (error) return toast(`Error al crear: ${error.message}`, "error");
    toast("Categoría creada");
    setForm(empty);
    setSlugTouched(false);
    reloadCategories();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ name: c.name || "", slug: c.slug || "", description: c.description || "" });
  };

  const saveEdit = async (c) => {
    const payload = {
      name: editForm.name.trim(),
      slug: editForm.slug.trim() || createSlug(editForm.name),
      description: editForm.description.trim() || null,
    };
    if (!payload.name) return toast("El nombre es obligatorio", "error");
    if (slugTaken(payload.slug, c.id)) return toast("Ya existe una categoría con ese slug", "error");
    if (c.slug && payload.slug !== c.slug) {
      const ok = await confirm({
        title: "¿Cambiar el slug?",
        message: `Los links a /productos?categoria=${c.slug} y el armador de PC dependen de este slug. Si lo cambiás, revisá que sigan funcionando.`,
        confirmText: "Cambiar igual",
      });
      if (!ok) return;
    }
    const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
    if (error) return toast(`Error al guardar: ${error.message}`, "error");
    toast("Categoría actualizada");
    setEditingId(null);
    await reloadCategories();
    reloadProducts();
  };

  const remove = async (c) => {
    const count = counts[c.id] || 0;
    if (count > 0) {
      toast(`No se puede eliminar: tiene ${count} productos. Movelos a otra categoría primero.`, "error");
      return;
    }
    const ok = await confirm({
      title: "¿Eliminar categoría?",
      message: `"${c.name}" se va a eliminar definitivamente.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast(`Error al eliminar: ${error.message}`, "error");
    toast("Categoría eliminada");
    reloadCategories();
  };

  return (
    <div className="adm-categories">
      <form className="adm-card adm-cat-form" onSubmit={create}>
        <header>
          <h2>Nueva categoría</h2>
        </header>
        <div className="adm-grid-3">
          <Field label="Nombre *">
            <input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: slugTouched ? f.slug : createSlug(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Slug" hint="Se usa en la URL y en los filtros">
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: createSlug(e.target.value) }));
              }}
            />
          </Field>
          <Field label="Descripción">
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
        </div>
        <button className="adm-btn primary" type="submit">
          <FaPlus /> Agregar categoría
        </button>
      </form>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Descripción</th>
              <th className="num">Productos</th>
              <th className="right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) =>
              editingId === c.id ? (
                <tr key={c.id} className="editing">
                  <td>
                    <input
                      className="adm-inline-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                  </td>
                  <td>
                    <input
                      className="adm-inline-input"
                      value={editForm.slug}
                      onChange={(e) => setEditForm((f) => ({ ...f, slug: createSlug(e.target.value) }))}
                    />
                  </td>
                  <td>
                    <input
                      className="adm-inline-input"
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(c)}
                    />
                  </td>
                  <td className="num">{counts[c.id] || 0}</td>
                  <td className="right">
                    <div className="adm-row-actions">
                      <button onClick={() => saveEdit(c)} title="Guardar" className="ok">
                        <FaCheck />
                      </button>
                      <button onClick={() => setEditingId(null)} title="Cancelar">
                        <FaTimes />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    {c.slug ? <code>{c.slug}</code> : <span className="adm-badge warn">Sin slug</span>}
                  </td>
                  <td className="adm-muted">{c.description || "—"}</td>
                  <td className="num">{counts[c.id] || 0}</td>
                  <td className="right">
                    <div className="adm-row-actions">
                      <button onClick={() => startEdit(c)} title="Editar">
                        <FaEdit />
                      </button>
                      <button className="danger" onClick={() => remove(c)} title="Eliminar">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {categories.length === 0 && <div className="adm-empty">Todavía no hay categorías.</div>}
      </div>
    </div>
  );
}
