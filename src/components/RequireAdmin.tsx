import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [checkState, setCheckState] = useState<{ loading: boolean; allowed: boolean }>({ loading: true, allowed: false });

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const [helperAdmin, customerAdmin] = await Promise.all([
        supabase.from("helper_verification_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("customer_verification_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      if (active) {
        setCheckState({
          loading: false,
          allowed: !!helperAdmin.data || !!customerAdmin.data,
        });
      }
    }

    void checkAdmin();
    return () => {
      active = false;
    };
  }, []);

  if (checkState.loading) {
    return <main className="min-h-screen bg-[#F8F9FC]" />;
  }

  if (!checkState.allowed) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}
