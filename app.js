const assetList = document.getElementById('asset-list');
const addAssetBtn = document.getElementById('add-asset');
const assetForm = document.getElementById('asset-form');
const resultsSection = document.getElementById('results');
const resultsSummary = document.getElementById('results-summary');
const metricsTable = document.getElementById('metrics-table');
const monthlyTable = document.getElementById('monthly-table');
const dividendsTable = document.getElementById('dividends-table');
const tokenInput = document.getElementById('api-token');
const returnsChartCanvas = document.getElementById('returns-chart');

let chart;

function init() {
  addAssetBtn.addEventListener('click', () => addAssetRow());
  assetList.addEventListener('click', (event) => {
    if (event.target.classList.contains('asset-row__remove')) {
      event.target.closest('.asset-row').remove();
      if (!assetList.children.length) {
        addAssetRow();
      }
    }
  });

  assetForm.addEventListener('submit', handleSubmit);

  // Inicia com dois campos para incentivar comparações
  addAssetRow('PETR4', 'acoes');
  addAssetRow('BOVA11', 'etf_bdr');
}

function addAssetRow(ticker = '', type = 'acoes') {
  const template = document.getElementById('asset-row-template');
  const clone = template.content.cloneNode(true);
  const [tickerInput, typeSelect] = clone.querySelectorAll('input, select');
  tickerInput.value = ticker;
  typeSelect.value = type;
  assetList.appendChild(clone);
}

async function handleSubmit(event) {
  event.preventDefault();
  const rows = Array.from(assetList.querySelectorAll('.asset-row'));
  const assets = rows
    .map((row) => {
      const [tickerInput, typeSelect] = row.querySelectorAll('input, select');
      const ticker = tickerInput.value.trim().toUpperCase();
      const type = typeSelect.value;
      return ticker ? { ticker, type } : null;
    })
    .filter(Boolean);

  if (!assets.length) {
    alert('Adicione pelo menos um ativo para comparar.');
    return;
  }

  toggleFormDisabled(true);
  setLoadingState(true);

  try {
    const token = tokenInput.value.trim();
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets, token: token || undefined }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody?.message || 'Não foi possível carregar os dados dos ativos.'
      );
    }

    const payload = await response.json();
    const fulfilled = Array.isArray(payload.results) ? payload.results : [];
    const rejected = Array.isArray(payload.errors) ? payload.errors : [];

    if (!fulfilled.length) {
      throw new Error(
        rejected[0]?.message || 'Não foi possível carregar os dados dos ativos.'
      );
    }

    renderResults(fulfilled, rejected);
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro inesperado ao buscar os ativos.');
  } finally {
    toggleFormDisabled(false);
    setLoadingState(false);
  }
}

function toggleFormDisabled(disabled) {
  Array.from(assetForm.elements).forEach((element) => {
    element.disabled = disabled;
  });
}

function setLoadingState(isLoading) {
  if (isLoading) {
    resultsSection.classList.remove('card--hidden');
    resultsSummary.innerHTML = '<div class="summary-card">Carregando dados da brapi...</div>';
    metricsTable.innerHTML = '';
    monthlyTable.innerHTML = '';
    dividendsTable.innerHTML = '';
    destroyChart();
  }
}

function renderResults(assets, errors) {
  resultsSection.classList.remove('card--hidden');

  if (errors?.length) {
    const warning = document.createElement('div');
    warning.className = 'summary-card';
    warning.innerHTML = `<h4>Alertas</h4><p>${errors
      .map((err) => (err.ticker ? `${err.ticker}: ${err.message}` : err.message))
      .join('<br />')}</p>`;
    resultsSummary.innerHTML = '';
    resultsSummary.appendChild(warning);
  } else {
    resultsSummary.innerHTML = '';
  }

  const diversification = computeDiversificationIndex(assets);
  const averageVolatility = assets.reduce((acc, asset) => acc + (asset.volatility || 0), 0) /
    (assets.length || 1);

  const cards = [
    {
      title: 'Ativos analisados',
      value: assets.length.toString(),
    },
    {
      title: 'Volatilidade média mensal',
      value: formatPercentage(averageVolatility),
    },
    {
      title: 'Índice de diversificação',
      value: diversification.toFixed(2),
    },
  ];

  cards.forEach((card) => {
    const element = document.createElement('div');
    element.className = 'summary-card';
    element.innerHTML = `<h4>${card.title}</h4><strong>${card.value}</strong>`;
    resultsSummary.appendChild(element);
  });

  renderMetricsTable(assets);
  renderMonthlyReturnsTable(assets);
  renderDividendsTable(assets);
  renderChart(assets);
}

function renderMetricsTable(assets) {
  const headers = new Set(['Ticker']);
  assets.forEach((asset) => {
    Object.keys(asset.metrics).forEach((key) => headers.add(key));
  });
  const headerArray = Array.from(headers);

  const thead = `<thead><tr>${headerArray
    .map((key) => `<th>${formatMetricLabel(key)}</th>`)
    .join('')}</tr></thead>`;

  const tbody = `<tbody>${assets
    .map((asset) => {
      return `<tr>${headerArray
        .map((key) => {
          const value = key === 'Ticker' ? asset.ticker : asset.metrics[key];
          return `<td>${formatMetricValue(key, value)}</td>`;
        })
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;

  metricsTable.innerHTML = thead + tbody;
}

function renderMonthlyReturnsTable(assets) {
  const maxRows = Math.max(...assets.map((asset) => asset.monthlyReturns.length));
  const rows = [];
  for (let index = 0; index < maxRows; index++) {
    const rowDate = assets[0]?.monthlyReturns[index]?.date;
    const dateLabel = rowDate ? formatMonth(rowDate) : `Mês ${index + 1}`;
    const cells = assets
      .map((asset) => {
        const current = asset.monthlyReturns[index];
        return `<td>${formatPercentage(current?.value)}</td>`;
      })
      .join('');
    rows.push(`<tr><td>${dateLabel}</td>${cells}</tr>`);
  }

  const header = `<thead><tr><th>Mês</th>${assets
    .map((asset) => `<th>${asset.ticker}</th>`)
    .join('')}</tr></thead>`;

  monthlyTable.innerHTML = header + `<tbody>${rows.join('')}</tbody>`;
}

function renderDividendsTable(assets) {
  const rows = [];
  assets.forEach((asset) => {
    if (!asset.dividends.length) {
      rows.push(
        `<tr><td>${asset.ticker}</td><td colspan="3">Sem proventos reportados nos últimos 5 anos.</td></tr>`
      );
      return;
    }

    asset.dividends.forEach((dividend, index) => {
      rows.push(
        `<tr>${index === 0 ? `<td rowspan="${asset.dividends.length}" class="badge">${asset.ticker}</td>` : ''}<td>${formatDate(dividend.date)}</td><td>${dividend.label}</td><td>${formatCurrency(dividend.value)}</td></tr>`
      );
    });
  });

  dividendsTable.innerHTML =
    '<thead><tr><th>Ativo</th><th>Data</th><th>Tipo</th><th>Valor</th></tr></thead>' +
    `<tbody>${rows.join('')}</tbody>`;
}

function renderChart(assets) {
  const labels = assets[0]?.monthlyReturns.map((item) => formatMonth(item.date)) ?? [];
  const datasets = assets.map((asset) => {
    let base = 100;
    const points = [base];
    asset.monthlyReturns.forEach((item) => {
      base *= 1 + item.value;
      points.push(Number(base.toFixed(2)));
    });

    return {
      label: asset.ticker,
      data: points,
      tension: 0.2,
      fill: false,
      borderWidth: 2,
      borderColor: randomColorFromTicker(asset.ticker),
    };
  });

  const chartLabels = ['Início'].concat(labels);

  destroyChart();
  chart = new Chart(returnsChartCanvas, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#cbd5f5',
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
        },
      },
    },
  });
}

function destroyChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

function computeDiversificationIndex(assets) {
  if (assets.length <= 1) return 1;
  const minLength = Math.min(...assets.map((asset) => asset.monthlyReturns.length));
  if (!minLength) return 0;

  const returnsMatrix = assets.map((asset) =>
    asset.monthlyReturns
      .slice(-minLength)
      .map((item) => item.value)
  );

  let totalCorrelation = 0;
  let pairCount = 0;

  for (let i = 0; i < returnsMatrix.length; i++) {
    for (let j = i + 1; j < returnsMatrix.length; j++) {
      const correlation = computeCorrelation(returnsMatrix[i], returnsMatrix[j]);
      if (Number.isFinite(correlation)) {
        totalCorrelation += correlation;
        pairCount++;
      }
    }
  }

  if (pairCount === 0) return 1;
  const averageCorrelation = totalCorrelation / pairCount;
  const index = 1 - (averageCorrelation + 1) / 2; // normaliza para 0 a 1
  return Math.max(0, Math.min(1, index));
}

function computeCorrelation(a, b) {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;
  const sliceA = a.slice(-length);
  const sliceB = b.slice(-length);
  const meanA = sliceA.reduce((acc, value) => acc + value, 0) / length;
  const meanB = sliceB.reduce((acc, value) => acc + value, 0) / length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < length; i++) {
    const diffA = sliceA[i] - meanA;
    const diffB = sliceB[i] - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }

  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function formatMetricLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b(\w)/g, (match) => match.toUpperCase());
}

function formatMetricValue(key, value) {
  if (value === null || value === undefined || value === '') {
    return 'N/D';
  }

  if (key.toLowerCase().includes('vol')) {
    return formatPercentage(value);
  }

  if (key.toLowerCase().includes('yield') || key.toLowerCase().includes('dy')) {
    return formatPercentage(value);
  }

  if (key.toLowerCase().includes('price') || key.toLowerCase().includes('preço')) {
    return formatCurrency(value);
  }

  if (typeof value === 'number') {
    if (Math.abs(value) > 1000) {
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    }
    return value.toFixed(2);
  }

  return value;
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) return 'N/D';
  return (value * 100).toFixed(2) + '%';
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return 'N/D';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return 'N/D';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatMonth(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
}

function randomColorFromTicker(ticker) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;
  return `rgba(${Math.abs(r)}, ${Math.abs(g)}, ${Math.abs(b)}, 0.85)`;
}

init();
