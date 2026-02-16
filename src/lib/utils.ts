import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um valor monetário para KZ (Kwanza).
 * Remove símbolos como £ e formata no estilo PT: 2.000,00 KZ
 */
export function formatKz(value: number | string): string {
  const num = typeof value === "string"
    ? parseFloat(value.replace(/[£\s]/g, "").replace(",", ".")) || 0
    : value;
  const [intPart, decPart] = num.toFixed(2).split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart} KZ`;
}
