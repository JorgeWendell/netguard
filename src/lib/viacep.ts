type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export function stripCep(cep: string): string {
  return cep.replace(/\D/g, "");
}

export function formatCep(value: string): string {
  const digits = stripCep(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(
  cep: string,
): Promise<ViaCepResponse | null> {
  const digits = stripCep(cep);
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) return null;

  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) return null;

  return data;
}
