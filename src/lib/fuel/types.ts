export type FormaPagamentoLinha = {
  base: string;
  forma: string;
  apresentado: number;
  apurado: number;
  diferenca: number;
};

export type Station = {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  cnpj?: string | null;
  empresaCodigo?: number | null;
};
