import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  placeholder: string;
  type?: string;
  icon: LucideIcon;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function Input({
  label,
  placeholder,
  type = "text",
  icon: Icon,
  value,
  onChange,
}: Props) {
  return (
    <div className="space-y-2">
      <label className="font-semibold text-sm">{label}</label>

      <div className="flex items-center rounded-full border border-gray-200 bg-white px-5 py-4">
       <input
  type={type}
  placeholder={placeholder}
  value={value}
  onChange={onChange}
  className="flex-1 bg-transparent text-sm outline-none"
/>

        <Icon size={18} className="text-gray-400" />
      </div>
    </div>
  );
}