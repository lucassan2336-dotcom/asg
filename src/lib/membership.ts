import { z } from "zod";

export const membershipSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo.").max(100),
  email: z.string().email("Confirme o e-mail da sua conta.").max(255),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine(
      (value) =>
        !value || (/^[0-9+() .-]{8,20}$/.test(value) && value.replace(/\D/g, "").length >= 8),
      "Informe um telefone válido ou deixe em branco.",
    ),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe sua data de nascimento.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00`);
      const today = new Date();
      const earliest = new Date();
      earliest.setFullYear(today.getFullYear() - 120);
      return Number.isFinite(date.getTime()) && date <= today && date >= earliest;
    }, "Informe uma data de nascimento válida."),
  motivation: z.string().trim().max(500),
});

export const applicationLabels = {
  pendente: "Pendente",
  aprovada: "Aprovado",
  rejeitada: "Rejeitado",
} as const;
export type ApplicationStatus = keyof typeof applicationLabels;
