import { Link } from "react-router-dom";
import hero from "../../assets/hero.png";

export default function Hero() {
  return (
    <section className="bg-[#DDE2F2]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-8 py-20 lg:flex-row">

        {/* Left Side */}

        <div className="flex-1">

          <h1 className="text-6xl font-extrabold leading-tight text-[#20212A]">

            Get Trusted Help

            <br />

            with

            <span className="text-[#0B5FFF]">
              {" "}Everyday
              <br />
              Tasks
            </span>

          </h1>

          <p className="mt-8 max-w-lg text-lg leading-8 text-gray-600">
            GrandCaddy connects seniors and busy families
            with verified helpers for home maintenance,
            errands, and specialized care.
          </p>

          <div className="mt-10 flex flex-wrap gap-5">

            <Link
              to="/signup"
              className="rounded-full bg-[#0B5FFF] px-8 py-4 font-semibold text-white transition hover:bg-blue-700"
            >
              Post a Task for Free
            </Link>

            <Link
              to="/signup"
              className="rounded-full bg-[#F6B14A] px-8 py-4 font-semibold text-white transition hover:bg-orange-500"
            >
              Become a Caddy
            </Link>

          </div>

          <div className="mt-12 flex gap-12">

            <div>
              <h2 className="text-3xl font-bold">
                1M+
              </h2>

              <p className="text-sm uppercase tracking-wider text-gray-500">
                Customers
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold">
                4.9/5
              </h2>

              <p className="text-sm uppercase tracking-wider text-gray-500">
                User Rating
              </p>
            </div>

          </div>

        </div>

        {/* Right Side */}

        <div className="flex flex-1 justify-center">

          <img
            src={hero}
            alt="GrandCaddy"
            className="
              w-full
              max-w-md
              rounded-[32px]
              border-[6px]
              border-white
              shadow-2xl
            "
          />

        </div>

      </div>
    </section>
  );
}