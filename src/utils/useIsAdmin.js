import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("🔎 Usuario actual:", user);

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        console.log("📋 Resultado query profiles:", data, error);

        if (!error && data?.is_admin) {
          setIsAdmin(true);
        }
      }

      setLoading(false);
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}
