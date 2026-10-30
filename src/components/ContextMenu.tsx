import React, { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Adjust coordinates so the menu never overflows viewport bounds
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 32 + 20));

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(8, adjustedX)}px`, top: `${Math.max(8, adjustedY)}px` }}
      className="fixed z-50 w-52 bg-panel border border-hairline/90 rounded-lg shadow-modal p-1 font-sans text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={`div-${idx}`} className="h-[1px] bg-hairline/60 my-1" />;
        }

        const Icon = item.icon;

        return (
          <button
            key={item.label || `item-${idx}`}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
              item.danger
                ? "text-red-400 hover:bg-guard/10 hover:text-red-300"
                : "text-gray-300 hover:bg-surface hover:text-white"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
