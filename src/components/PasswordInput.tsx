import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

type Props = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function PasswordInput({
  label = "Password",
  placeholder = "Enter your password",
  value,
  onChange,
}: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <label className="font-semibold text-sm">
        {label}
      </label>

      <div className="flex items-center rounded-full border border-gray-200 bg-white px-5 py-4">

        <input
  type={show ? "text" : "password"}
  placeholder={placeholder}
  value={value}
  onChange={onChange}
  className="flex-1 bg-transparent text-sm outline-none"
/>

        <Lock size={18} className="mr-3 text-gray-400" />

        <button
          type="button"
          onClick={() => setShow(!show)}
        >
          {show ? (
            <EyeOff size={18} className="text-gray-400" />
          ) : (
            <Eye size={18} className="text-gray-400" />
          )}
        </button>

      </div>
    </div>
  );
}