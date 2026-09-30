import { MapPin, Star } from "lucide-react";

import hero from "../../assets/hero.png";

const caddies = [
  {
    name: "Sarah Johnson",
    role: "Senior Care Specialist",
    location: "Johannesburg",
    rating: "4.9",
    image: hero,
  },
  {
    name: "David Smith",
    role: "Home Maintenance",
    location: "Cape Town",
    rating: "5.0",
    image: hero,
  },
  {
    name: "Emily Brown",
    role: "Companion",
    location: "Durban",
    rating: "4.8",
    image: hero,
  },
];

export default function MeetCaddies() {
  return (
    <section className="bg-[#DDE2F2] py-24">
      <div className="mx-auto max-w-7xl px-8">

        <div className="text-center">

          <h2 className="text-5xl font-bold text-[#20212A]">
            Meet Our Trusted Caddies
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Friendly, verified professionals ready to lend a helping hand.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {caddies.map((caddy) => (
            <div
              key={caddy.name}
              className="
                overflow-hidden
                rounded-[32px]
                bg-white
                shadow-lg
                transition-all
                duration-300
                hover:-translate-y-2
                hover:shadow-2xl
              "
            >

              <img
                src={caddy.image}
                alt={caddy.name}
                className="h-72 w-full object-cover"
              />

              <div className="p-8">

                <h3 className="text-2xl font-bold">
                  {caddy.name}
                </h3>

                <p className="mt-2 text-gray-500">
                  {caddy.role}
                </p>

                <div className="mt-6 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <MapPin
                      size={18}
                      className="text-[#0B5FFF]"
                    />

                    <span>{caddy.location}</span>

                  </div>

                  <div className="flex items-center gap-2">

                    <Star
                      size={18}
                      fill="#F6B14A"
                      color="#F6B14A"
                    />

                    <span>{caddy.rating}</span>

                  </div>

                </div>

                <button
                  className="
                    mt-8
                    w-full
                    rounded-full
                    bg-[#0B5FFF]
                    py-4
                    font-semibold
                    text-white
                    transition
                    hover:bg-blue-700
                  "
                >
                  View Profile
                </button>

              </div>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}