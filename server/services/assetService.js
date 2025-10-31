const {
  extractHistoricalSeries,
  computeMonthlyReturns,
  extractDividends,
  buildMetrics,
  computeStdDeviation,
} = require('../utils/calculations');

class AssetError extends Error {
  constructor(message, { ticker, status } = {}) {
    super(message);
    this.name = 'AssetError';
    this.ticker = ticker;
    this.status = status;
  }
}

async function fetchAssetData(asset, token) {
  const ticker = asset?.ticker?.trim()?.toUpperCase();
  if (!ticker) {
    throw new AssetError('Ticker inválido informado.', { ticker: asset?.ticker });
  }

  const type = asset?.type || 'acoes';
  const url = new URL(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`);
  url.searchParams.set('range', '5y');
  url.searchParams.set('interval', '1mo');
  if (token) {
    url.searchParams.set('token', token);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new AssetError(
      `Erro ao consultar ${ticker}: ${response.status} ${response.statusText}.` +
        (response.status === 403
          ? ' Verifique o token informado ou aguarde antes de novas consultas.'
          : ''),
      { ticker, status: response.status }
    );
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.results) || !payload.results.length) {
    throw new AssetError(`A brapi não retornou dados para ${ticker}.`, { ticker });
  }

  const quote = payload.results[0];
  const historical = extractHistoricalSeries(quote);
  const monthlyReturns = computeMonthlyReturns(historical);
  const dividends = extractDividends(quote);
  const metrics = buildMetrics(type, quote, monthlyReturns);
  const volatility = computeStdDeviation(monthlyReturns.map((item) => item.value));

  return {
    ticker,
    type,
    quote,
    historical,
    monthlyReturns,
    dividends,
    metrics,
    volatility,
  };
}

module.exports = {
  fetchAssetData,
  AssetError,
};
