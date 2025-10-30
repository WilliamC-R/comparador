# Comparador de Investimentos

Aplicação web estática que consome a [API da brapi](https://brapi.dev/) para comparar ativos de diferentes classes (ações, FIIs, renda fixa, ETFs/BDRs e cripto/alternativos). Permite criar carteiras personalizadas com qualquer quantidade de ativos e visualiza indicadores de performance, risco, distribuição de proventos e diversificação dos últimos cinco anos.

## Funcionalidades

- Adição ilimitada de ativos com definição de classe.
- Integração com a brapi (suporte a token opcional para evitar limites de requisições).
- Cálculo de rentabilidade mensal e acumulada, com gráfico interativo (Chart.js).
- Exibição de proventos pagos, volatilidade, P/L, liquidez e demais indicadores específicos por classe.
- Índice de diversificação baseado na correlação dos retornos mensais dos ativos comparados.
- Diretrizes de gestão de risco, liquidez e proteção cambial.

## Uso local

1. Abra o arquivo `index.html` em um navegador moderno.
2. Informe, se desejar, um token válido da brapi para ampliar o limite de chamadas (campo opcional no formulário).
3. Adicione os ativos que deseja comparar e clique em **Comparar carteira**.
4. A aplicação exibirá indicadores, tabelas e gráficos para os últimos cinco anos (quando disponíveis na API).

> **Observação:** Alguns campos podem retornar como `N/D` caso a brapi não disponibilize a métrica para o ativo consultado.

## Tecnologias

- HTML5, CSS3 e JavaScript (ES2020+).
- [Chart.js](https://www.chartjs.org/) para visualização gráfica.
- API pública [brapi](https://brapi.dev/) como fonte de dados.
