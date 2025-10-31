# Comparador de Investimentos

Aplicação web full-stack que consome a [API da brapi](https://brapi.dev/) para comparar ativos de diferentes classes (ações, FIIs, renda fixa, ETFs/BDRs e cripto/alternativos). O backend em Node.js/Express centraliza as chamadas à brapi e entrega ao frontend todos os indicadores consolidados para carteiras personalizadas.

## Funcionalidades

- Adição ilimitada de ativos com definição de classe.
- Integração com a brapi mediada por backend Express (suporte a token opcional para evitar limites de requisições).
- Cálculo de rentabilidade mensal e acumulada, com gráfico interativo (Chart.js).
- Exibição de proventos pagos, volatilidade, P/L, liquidez e demais indicadores específicos por classe.
- Índice de diversificação baseado na correlação dos retornos mensais dos ativos comparados.
- Diretrizes de gestão de risco, liquidez e proteção cambial.

## Uso local

1. Instale as dependências com `npm install`.
2. Inicie o servidor com `npm start` (o aplicativo ficará disponível em `http://localhost:3000`).
3. Informe, se desejar, um token válido da brapi para ampliar o limite de chamadas (campo opcional no formulário).
4. Adicione os ativos que deseja comparar e clique em **Comparar carteira**.
5. A aplicação exibirá indicadores, tabelas e gráficos para os últimos cinco anos (quando disponíveis na API).

> **Observação:** Alguns campos podem retornar como `N/D` caso a brapi não disponibilize a métrica para o ativo consultado.

## Tecnologias

- HTML5, CSS3 e JavaScript (ES2020+).
- [Chart.js](https://www.chartjs.org/) para visualização gráfica.
- API pública [brapi](https://brapi.dev/) como fonte de dados.
- Node.js 18+ com [Express](https://expressjs.com/) para o backend.
