# Caixa Rede · Fechamento WebPosto

POC de fechamento de caixa da rede de postos via API Quality Automação (WebPosto).

## Features
- Resumo D-1 da rede (alertas > R$ 50, abertos/fechados, conciliados)
- Drill-down posto → turno → formas de pagamento
- Modal de quebra de divergência
- Dados ao vivo (CAIXA + CAIXA_APRESENTADO), sem banco

## Dev
```bash
npm install
npm run dev   # 0.0.0.0:8080
```

## Build (Vercel)
```bash
npm run build
```
