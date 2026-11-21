import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";

/* ---------- Toasts ---------- */

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, type = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const icons = {
    success: <FaCheckCircle />,
    error: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast ${t.type}`}>
            {icons[t.type]}
            <span>{t.message}</span>
            <button
              aria-label="Cerrar"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Confirm dialog ---------- */

const ConfirmContext = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setState({ ...opts, resolve });
      }),
    []
  );

  const close = (value) => {
    state?.resolve(value);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="adm-modal-backdrop" onClick={() => close(false)}>
          <div className="adm-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{state.title}</h3>
            {state.message && <p>{state.message}</p>}
            <div className="adm-modal-actions">
              <button className="adm-btn ghost" onClick={() => close(false)}>
                Cancelar
              </button>
              <button
                className={`adm-btn ${state.danger ? "danger" : "primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/* ---------- Small pieces ---------- */

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className={`adm-toggle ${disabled ? "disabled" : ""}`}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="adm-toggle-track" />
      {label && <span className="adm-toggle-label">{label}</span>}
    </label>
  );
}

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={`adm-field ${error ? "has-error" : ""} ${className}`}>
      <span className="adm-field-label">{label}</span>
      {children}
      {error ? (
        <span className="adm-field-error">{error}</span>
      ) : (
        hint && <span className="adm-field-hint">{hint}</span>
      )}
    </label>
  );
}
