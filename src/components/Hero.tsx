import hero from "../assets/hero.png";
import Logo from "./Logo";

export default function Hero() {
  return (
    <div className="flex flex-col h-full">

      <Logo />

      <h1
        className="
          mt-12
          text-6xl
          font-extrabold
          leading-tight
          text-[#20212A]
        "
      >
        Your digital
        <br />

        <span className="text-[#0B5FFF]">
          concierge
        </span>

        <br />

        awaits.

      </h1>

      <p
        className="
          mt-8
          max-w-md
          text-gray-500
          leading-8
        "
      >
        Professional assistance for seniors and family
        members, delivered with empathy and modern
        sophistication.
      </p>

      <div className="relative mt-14 w-fit">

        <img
          src={hero}
          alt="Hero"
          className="
            w-[420px]
            rounded-3xl
            shadow-2xl
          "
        />

        <div
          className="
            absolute
            -bottom-4
            -right-4
            h-32
            w-32
            rounded-full
            bg-[#F6B14A]
            flex
            items-center
            justify-center
            text-center
            text-sm
            font-bold
          "
        >
          TRUSTED BY
          <br />
          10K+
          <br />
          FAMILIES
        </div>

      </div>

    </div>
  );
}