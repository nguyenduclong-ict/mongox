import React from "react";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  className?: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  label,
  className = "",
  id,
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      } ${className}`}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all duration-150 ${
            checked || indeterminate
              ? "bg-mongo border-mongo text-gray-950"
              : "bg-modal-recessed border-white/20 group-hover:border-white/40 text-transparent"
          }`}
        >
          {indeterminate ? (
            <Minus className="w-3 h-3 stroke-[3]" />
          ) : checked ? (
            <Check className="w-3 h-3 stroke-[3]" />
          ) : null}
        </div>
      </div>
      {label && (
        <span className="text-xs text-gray-300 font-sans group-hover:text-gray-100 transition-colors">
          {label}
        </span>
      )}
    </label>
  );
};
