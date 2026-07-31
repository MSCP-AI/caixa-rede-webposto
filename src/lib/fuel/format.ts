import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDateLabel(isoDate: string) {
  try {
    return format(parseISO(isoDate), "EEEE, d 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });
  } catch {
    return isoDate;
  }
}

export function formatShortDate(isoDate: string) {
  try {
    return format(parseISO(isoDate), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return isoDate;
  }
}

export function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
