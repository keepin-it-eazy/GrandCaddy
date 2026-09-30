import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
} from "react-icons/fa";

import Logo from "../Logo";

export default function Footer() {
  return (
    <footer className="bg-[#20212A] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-8 py-16 md:grid-cols-4">

        {/* Logo & Description */}

        <div>
          <Logo />

          <p className="mt-5 leading-7 text-gray-400">
            GrandCaddy connects seniors and families with trusted companions,
            making everyday life safer, easier, and more enjoyable.
          </p>
        </div>

        {/* Company */}

        <div>
          <h3 className="mb-4 font-bold">Company</h3>

          <ul className="space-y-3 text-gray-400">
            <li>
              <Link to="/" className="hover:text-white">
                Home
              </Link>
            </li>

            <li>
              <Link to="/login" className="hover:text-white">
                Login
              </Link>
            </li>

            <li>
              <Link to="/signup" className="hover:text-white">
                Sign Up
              </Link>
            </li>

            <li>
              <a
                href="mailto:info@grandcaddy.com"
                className="hover:text-white"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>

        {/* Services */}

        <div>
          <h3 className="mb-4 font-bold">Services</h3>

          <ul className="space-y-3 text-gray-400">
            <li>Companionship</li>
            <li>Transportation</li>
            <li>Shopping Assistance</li>
            <li>Home Support</li>
          </ul>
        </div>

        {/* Social */}

        <div>
          <h3 className="mb-4 font-bold">Connect</h3>

          <div className="flex gap-5">

            <a href="#" aria-label="Facebook">
              <FaFacebook className="transition hover:text-[#0B5FFF]" />
            </a>

            <a href="#" aria-label="Instagram">
              <FaInstagram className="transition hover:text-[#0B5FFF]" />
            </a>

            <a href="#" aria-label="LinkedIn">
              <FaLinkedin className="transition hover:text-[#0B5FFF]" />
            </a>

            <a
              href="mailto:info@grandcaddy.com"
              aria-label="Email"
            >
              <Mail className="transition hover:text-[#0B5FFF]" />
            </a>

          </div>
        </div>

      </div>

      <div className="border-t border-gray-700 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} GrandCaddy. All rights reserved.
      </div>
    </footer>
  );
}