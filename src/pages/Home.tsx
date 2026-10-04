// src/pages/Home.tsx
import Hero from "../components/Hero";
import Services from "../components/home/Services";
import StepSection from "../components/home/StepSection";
import Safety from "../components/home/Safety";
import Footer from "../components/home/Footer";

export default function Home() {
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