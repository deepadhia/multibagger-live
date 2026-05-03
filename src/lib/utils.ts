import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCr(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "-";
  const num = Number(val);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const cr = absNum / 10000000;
  let formatted = `₹${cr.toFixed(2)} Cr`;
  if (isNegative) formatted = `-${formatted}`;
  return formatted;
}

export function formatFinancial(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "-";
  const num = Number(val);
  if (Math.abs(num) < 1000000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return formatCr(num);
}
