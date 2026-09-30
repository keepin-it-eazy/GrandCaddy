export default function StepSection() {
  const steps = [
    {
      number: "01",
      title: "Tell us what you need",
      description:
        "Simply describe the task—big or small. Whether it's changing a lightbulb or weekly grocery shopping, we've got you.",
      image: "/step1.jpg",
      reverse: false,
    },
    {
      number: "02",
      title: "Choose your Caddy",
      description:
        "Review profiles, ratings, and friendly faces. Pick the helper that feels like the right fit for your home.",
      image: "/step2.jpg",
      reverse: true,
    },
    {
      number: "03",
      title: "Sit back and relax",
      description:
        "Your helper arrives, gets the job done, and you securely pay through the app once you're 100% happy.",
      image: "/step3.jpg",
      reverse: false,
    },
  ];

  return (
    <section className="bg-[#DDE2F2] py-24">
      <div className="mx-auto max-w-7xl px-8">

        <h2 className="mb-20 text-center text-5xl font-bold text-[#20212A]">
          Simple as 1-2-3
        </h2>

        <div className="space-y-20">

          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex flex-col items-center gap-16 lg:flex-row ${
                step.reverse ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Text */}

              <div className="flex-1">

                <div className="text-7xl font-extrabold text-[#C4CDEA]">
                  {step.number}
                </div>

                <h3 className="mt-2 text-4xl font-bold text-[#20212A]">
                  {step.title}
                </h3>

                <p className="mt-6 max-w-md leading-8 text-gray-600">
                  {step.description}
                </p>

              </div>

              {/* Image */}

              <div className="flex flex-1 justify-center">

                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full max-w-md rounded-[28px] shadow-xl"
                />

              </div>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}