import {
  BrushCleaning,
  ShoppingCart,
  Trees,
  Wrench,
  Paintbrush,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    title: "Cleaning",
    icon: BrushCleaning,
    bg: "bg-[#E8E7FF]",
    color: "text-[#386BFF]",
  },
  {
    title: "Shopping",
    icon: ShoppingCart,
    bg: "bg-[#FFE8BC]",
    color: "text-[#F5A623]",
  },
  {
    title: "Gardening",
    icon: Trees,
    bg: "bg-[#DFF8E5]",
    color: "text-[#4CAF50]",
  },
  {
    title: "Handyman",
    icon: Wrench,
    bg: "bg-[#FFDCDC]",
    color: "text-[#F25F5C]",
  },
  {
    title: "Painting",
    icon: Paintbrush,
    bg: "bg-[#E6E3FF]",
    color: "text-[#6C63FF]",
  },
];

export default function Services() {
  return (
    <section className="bg-[#DDE2F2] py-12">

      <div className="mx-auto max-w-7xl rounded-[36px] bg-white p-10 shadow-lg">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-4xl font-bold text-[#20212A]">
              What can we help you with?
            </h2>

            <p className="mt-3 text-gray-500">
              Choose from our most popular services or post a custom task.
            </p>

          </div>

          <button className="hidden items-center gap-2 font-semibold text-[#0B5FFF] md:flex">
            See all categories
            <ArrowRight size={18} />
          </button>

        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">

          {services.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className={`
                  ${service.bg}
                  group
                  cursor-pointer
                  rounded-3xl
                  p-8
                  text-center
                  shadow
                  transition-all
                  duration-300
                  hover:-translate-y-2
                  hover:shadow-xl
                `}
              >
                <div
                  className={`
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-white
                  `}
                >
                  <Icon
                    size={28}
                    className={service.color}
                  />
                </div>

                <h3 className="mt-6 text-lg font-semibold">
                  {service.title}
                </h3>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}