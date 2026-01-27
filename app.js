const RANGE_LABELS = {
  weekly: "Últimos 7 dias",
  monthly: "Últimos 30 dias",
  yearly: "Últimos 12 meses",
};

function setActiveTab(activeButton) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab === activeButton);
  });
  const label = document.getElementById("tracking-label");
  if (label) {
    label.textContent = RANGE_LABELS[activeButton.dataset.range] ?? "";
  }
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab));
  });
}

function formatCurrency(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "R$ 0,00";
  }
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "0,0%";
  }
  return `${number.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "0,00";
  }
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function updateMetric(id, value, formatter) {
  if (value === undefined || value === null) {
    return;
  }
  const element = document.getElementById(id);
  if (element) {
    element.textContent = formatter(value);
  }
}

function updateFromResponse(data) {
  updateMetric("metric-balance", data.cash ?? data.revenue, formatCurrency);
  updateMetric("metric-forecast", data.net_cash_flow ?? data.profit, formatCurrency);
  updateMetric("metric-entry", data.entries ?? data.revenue, formatCurrency);
  updateMetric("metric-exit", data.exits ?? data.expenses, formatCurrency);
  updateMetric("metric-tax", data.total_tax, formatCurrency);
  updateMetric("metric-liquidity", data.liquidity_ratio, formatNumber);
  updateMetric("metric-leverage", data.net_worth, formatNumber);
  updateMetric("metric-margin", data.margin, formatPercent);

  if (Array.isArray(data.projections) && data.projections.length > 0) {
    const [first] = data.projections;
    updateMetric("metric-entry", first.revenue, formatCurrency);
    updateMetric("metric-exit", first.expenses, formatCurrency);
    updateMetric("metric-margin", first.margin, formatPercent);
    updateMetric("metric-forecast", first.profit, formatCurrency);
  }
}

async function submitForm(event) {
  event.preventDefault();
  const form = event.target;
  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    return;
  }
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error ?? "Erro ao enviar dados.");
      return;
    }
    updateFromResponse(data);
    alert("Dados enviados com sucesso.");
  } catch (error) {
    console.error(error);
    alert("Não foi possível conectar ao backend.");
  }
}

function bindForms() {
  document.querySelectorAll(".card-form").forEach((form) => {
    form.addEventListener("submit", submitForm);
  });
}

bindTabs();
bindForms();
