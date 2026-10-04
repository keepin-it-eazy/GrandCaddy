// src/components/home/Hero.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import hero from "../assets/hero.png";

export default function Hero() {
  return (
    <section className="bg-[#DDE2F2] py-16">
      <div className="mx-auto max-w-7xl px-8">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-center">

          {/* LEFT — copy */}
          <div className="flex-1">
            <h1 className="text-5xl font-extrabold leading-tight text-[#20212A] md:text-6xl">
              Your digital
              <br />
              <span className="text-[#0B5FFF]">concierge</span>
              <br />
              awaits.
            </h1>

            <p className="mt-8 max-w-md leading-8 text-gray-600">
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
                Browse tasks
              </Link>
            </div>
          </div>

          {/* RIGHT — image with badge */}
          <div className="relative flex flex-1 justify-center">
            <img
              src={hero}
              alt="GrandCaddy helper"
              className="w-full max-w-[420px] rounded-3xl shadow-2xl"
            />

          </div>

        </div>
      </div>
    </section>
  );
}