# Comparador Financeiro (React + Python)

Web app para controle de finanças e demonstrativo financeiro com abas de entradas/saídas, dados compilados e estoque. O frontend em React consome a API em Python (Flask) para registrar movimentações de serviços e produtos, além de itens de estoque.

## Requisitos

- Python 3.10+

## Instalação

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Executar o backend

```bash
python app.py
```

O backend sobe em `http://localhost:8000`.

## Executar o frontend

O frontend é servido pelo próprio Flask. Após iniciar o backend, acesse:

```
http://localhost:8000
```

## Endpoints principais

- `GET /health`
- `GET /api/entries` — lista de movimentações
- `POST /api/entries` — cria movimentação de serviço/produto
- `GET /api/compiled` — dados compilados (totais, margens e rankings)
- `GET /api/inventory` — lista itens de estoque
- `POST /api/inventory` — cadastra item de estoque

## Estrutura de dados

### Movimentação (entrada/saída)

```json
{
  "kind": "income",
  "type": "service",
  "description": "Consultoria mensal",
  "amount": 2500,
  "date": "2024-05-01",
  "service": "Marketing",
  "product": ""
}
```

### Item de estoque

```json
{
  "name": "Kit Premium",
  "sku": "PRD-1023",
  "category": "Produtos",
  "quantity": 12,
  "cost": 80,
  "price": 180
}
```
