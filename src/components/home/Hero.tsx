// src/components/home/Hero.tsx
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import hero from "../assets/hero.png";

export default function Hero() {
  return (
    <section className="bg-[#DDE2F2] py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-8 lg:grid-cols-2">

        {/* LEFT — copy */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0B5FFF] shadow-sm">
            <ShieldCheck size={14} />
            Trusted by 10,000+ families
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.1] text-[#20212A] md:text-6xl">
            Your digital
            <br />
            <span className="text-[#0B5FFF]">concierge</span>
            <br />
            awaits.
          </h1>

          <p className="mt-8 max-w-md text-lg leading-8 text-gray-600">
            Professional assistance for seniors and family members,
            delivered with empathy and modern sophistication.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/post-task"
              className="inline-flex items-center gap-2 rounded-full bg-[#0B5FFF] px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700"
            >
              Post a Task
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3.5 font-semibold text-[#20212A] transition hover:border-gray-400"
            >
              Become a Caddy
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">★★★★★</span>
              <span className="font-semibold">4.9/5</span>
              <span>from 2,400+ reviews</span>
            </div>
          </div>
        </div>

        {/* RIGHT — hero image with badge */}
        <div className="relative mx-auto w-full max-w-[480px]">
          <img
            src={hero}
            alt="A GrandCaddy helping at home"
            className="w-full rounded-[32px] shadow-2xl"
          />

          <div className="absolute -bottom-6 -right-6 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#F6B14A] text-center text-sm font-bold text-[#20212A] shadow-xl">
            <span className="text-xs opacity-80">TRUSTED BY</span>
            <span className="text-xl">10K+</span>
            <span className="text-xs opacity-80">FAMILIES</span>
          </div>
        </div>
      </div>
    </section>
  );
}