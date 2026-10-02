export function mascararCnpj(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function mascararWhatsapp(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function digitoCnpj(base: number[]): number {
  const pesos = base.length === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = base.reduce((acc, d, i) => acc + d * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(v: string): boolean {
  if (/[a-z]/i.test(v)) return false;
  const digitos = v.replace(/\D/g, "");
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false;
  const nums = digitos.split("").map(Number);
  const d1 = digitoCnpj(nums.slice(0, 12));
  const d2 = digitoCnpj([...nums.slice(0, 12), d1]);
  return nums[12] === d1 && nums[13] === d2;
}

export function emailValido(v: string): boolean {
  return /^\S+@\S+\.\S+$/.test(v);
}

export function nextSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
