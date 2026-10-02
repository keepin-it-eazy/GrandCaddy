// src/pages/Home.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

import Hero from "../components/home/Hero";
import Services from "../components/home/Services";
import StepSection from "../components/home/StepSection";
import Safety from "../components/home/Safety";
import Footer from "../components/home/Footer";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // decide where to send them — /helper if a helper, else /browse
        const { data: hp } = await supabase
          .from("helper_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        navigate(hp ? "/helper" : "/browse", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <main>
      <Hero />
      <Services />
      <StepSection />
      <Safety />
      <Footer />
    </main>
  );
}