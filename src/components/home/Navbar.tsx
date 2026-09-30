import { Bell, CircleUserRound } from "lucide-react";
import Logo from "../Logo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">

        {/* Left */}

        <div className="flex items-center gap-16">

          <Logo />

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">

            <a
              href="#"
              className="text-[#0B5FFF] border-b-2 border-[#0B5FFF] pb-1"
            >
              Home
            </a>

            <a href="#">Services</a>

            <a href="#">How It Works</a>

            <a href="#">Safety</a>

          </nav>

        </div>

        {/* Right */}

        <div className="flex items-center gap-5">

          <Bell
            size={20}
            className="cursor-pointer"
          />

          <CircleUserRound
            size={22}
            className="cursor-pointer"
          />

          <button
            className="
              rounded-full
              bg-[#0B5FFF]
              px-6
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-blue-700
            "
          >
            Post a Task
          </button>

        </div>

      </div>

    </header>
  );
}