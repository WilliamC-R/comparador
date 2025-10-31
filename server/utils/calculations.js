function extractHistoricalSeries(quote) {
  const series = Array.isArray(quote?.historicalDataPrice)
    ? quote.historicalDataPrice
    : [];

  return series
    .map((item) => ({
      date: item.date || item.regularMarketTime || item.updatedAt,
      close: Number(item.close ?? item.price ?? item.adjClose ?? item.value),
    }))
    .filter((item) => item.date && Number.isFinite(item.close))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function computeMonthlyReturns(historical) {
  const returns = [];
  for (let index = 1; index < historical.length; index++) {
    const prev = historical[index - 1];
    const current = historical[index];
    const value = prev.close === 0 ? 0 : current.close / prev.close - 1;
    returns.push({ date: current.date, value });
  }
  return returns;
}

function extractDividends(quote) {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const dividendsData = Array.isArray(quote?.dividendsData)
    ? quote.dividendsData
    : [];

  return dividendsData
    .map((item) => ({
      date: item.paymentDate || item.date || item.approvedOn,
      label: item.label || item.type || 'Provento',
      value: Number(item.amount || item.value || item.cashDividend),
    }))
    .filter((item) => item.date && new Date(item.date) >= fiveYearsAgo)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function computeStdDeviation(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  const mean = filtered.reduce((acc, value) => acc + value, 0) / filtered.length;
  const variance =
    filtered.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
    filtered.length;
  return Math.sqrt(variance);
}

function buildMetrics(type, quote, monthlyReturns) {
  const volatility = computeStdDeviation(monthlyReturns.map((item) => item.value));
  const baseMetrics = {
    ticker: quote.symbol || quote.stock || quote.code || quote.shortName,
    price: quote.regularMarketPrice ?? quote.price ?? null,
    pe: quote.priceEarnings ?? quote.pe ?? null,
    roe: quote.roe ?? quote.returnOnEquity ?? null,
    margin: quote.profitMargins ?? quote.netMargins ?? null,
    payout: quote.payoutRatio ?? null,
    growth: quote.trailingPegRatio ?? quote.earningsGrowth ?? null,
    volatility,
    liquidity: quote.regularMarketVolume ?? quote.averageDailyVolume3Month ?? null,
  };

  const fiiMetrics = {
    dy: quote.dividendYield ?? quote.dailyLiquidity ?? null,
    vacancy: quote.vacancy ?? quote.vacancyRate ?? null,
    ltv: quote.ltv ?? null,
    indexador: quote.index ?? quote.indexer ?? null,
    gestor: quote.management ?? quote.managementQuality ?? null,
  };

  const rfMetrics = {
    duration: quote.duration ?? null,
    yield: quote.yield ?? quote.cdiYield ?? null,
    emissor: quote.issuer ?? quote.bank ?? null,
    rating: quote.rating ?? quote.ratingAgency ?? null,
    indexador: quote.indexer ?? quote.benchmark ?? null,
  };

  const etfBdrMetrics = {
    taxa: quote.managementFee ?? quote.fee ?? null,
    liquidez: quote.regularMarketVolume ?? quote.averageDailyVolume3Month ?? null,
    composicao: quote.sector ?? quote.sectorDistribution ?? quote.subSector ?? null,
  };

  const criptoMetrics = {
    correlacao: quote.correlation ?? null,
    volatilidade: volatility,
    fundamentos: quote.projectDetails ?? quote.description ?? null,
  };

  switch (type) {
    case 'fiis':
      return { ...baseMetrics, ...fiiMetrics };
    case 'renda_fixa':
      return { ...baseMetrics, ...rfMetrics };
    case 'etf_bdr':
      return { ...baseMetrics, ...etfBdrMetrics };
    case 'cripto':
      return { ...baseMetrics, ...criptoMetrics };
    default:
      return baseMetrics;
  }
}

module.exports = {
  extractHistoricalSeries,
  computeMonthlyReturns,
  extractDividends,
  computeStdDeviation,
  buildMetrics,
};
