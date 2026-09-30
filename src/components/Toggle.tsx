// src/components/Toggle.tsx
import type { Role } from "../lib/auth";

type ToggleProps = {
  value: Role;
  onChange: (role: Role) => void;
};

export default function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
      <button
        type="button"
        onClick={() => onChange("customer")}
        className={
          value === "customer"
            ? "rounded-xl bg-white py-3 font-semibold shadow"
            : "rounded-xl py-3 text-gray-500"
        }
      >
        Senior / Family
      </button>

      <button
        type="button"
        onClick={() => onChange("helper")}
        className={
          value === "helper"
            ? "rounded-xl bg-white py-3 font-semibold shadow"
            : "rounded-xl py-3 text-gray-500"
        }
      >
        Caddy
      </button>
    </div>
  );
}