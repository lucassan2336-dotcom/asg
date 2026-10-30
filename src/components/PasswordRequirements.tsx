import { CheckCircle2, Circle } from "lucide-react";
import { checkPasswordRequirements } from "@/lib/auth";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const status = checkPasswordRequirements(password);
  const hasTyped = password.length > 0;

  const items = [
    {
      key: "minLength",
      label: "Mínimo de 6 dígitos",
      met: status.minLength,
    },
    {
      key: "hasUppercase",
      label: "Pelo menos 1 letra maiúscula (A–Z)",
      met: status.hasUppercase,
    },
    {
      key: "hasSpecialChar",
      label: "Caracteres especiais (ex: ! @ # $ % & *)",
      met: status.hasSpecialChar,
    },
    {
      key: "hasNumber",
      label: "Pelo menos 1 número (0–9)",
      met: status.hasNumber,
    },
  ];

  return (
    <div
      className="mt-2 rounded-md border-2 border-ink/20 bg-muted/40 p-3 text-xs"
      aria-live="polite"
    >
      <p className="mb-1.5 font-condensed text-xs font-bold uppercase tracking-wider text-foreground">
        Requisitos para criar a senha:
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met
                ? "font-semibold text-olive"
                : hasTyped
                  ? "text-rust"
                  : "text-muted-foreground"
            }`}
          >
            {item.met ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-olive" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
