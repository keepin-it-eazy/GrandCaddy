import {
  ShieldCheck,
  BadgeCheck,
  CreditCard,
} from "lucide-react";

const safetyItems = [
  {
    icon: ShieldCheck,
    title: "Background Checked",
    description:
      "Every GrandCaddy helper is identity verified and screened before joining.",
  },
  {
    icon: BadgeCheck,
    title: "Highly Rated",
    description:
      "Work with trusted helpers backed by real reviews from happy families.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description:
      "Payments are processed safely through our secure platform.",
  },
];

export default function Safety() {
  return (
    <section className="bg-[#DDE2F2] py-20">
      <div className="mx-auto max-w-7xl rounded-[40px] bg-[#0B5FFF] px-12 py-16 text-white shadow-2xl">

        <div className="text-center">

          <h2 className="text-5xl font-bold">
            Your Safety is Our Priority
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-blue-100">
            Every interaction on GrandCaddy is designed around
            trust, transparency, and peace of mind.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">

          {safetyItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-3xl bg-white/10 p-8 backdrop-blur-sm"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#0B5FFF]">
                  <Icon size={32} />
                </div>

                <h3 className="mt-6 text-2xl font-semibold">
                  {item.title}
                </h3>

                <p className="mt-4 leading-8 text-blue-100">
                  {item.description}
                </p>

              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}