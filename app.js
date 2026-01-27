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
