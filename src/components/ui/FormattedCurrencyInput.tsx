"use client";

import { Input } from "@/components/ui/input";

function formatDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface Props {
  id: string;
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
}

export function FormattedCurrencyInput({ id, value, onChange, placeholder, className }: Props) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-gray-400 select-none">$</span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatDisplay(value)}
        placeholder={placeholder}
        className={`pl-7 ${className || ""}`}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits);
        }}
      />
    </div>
  );
}
