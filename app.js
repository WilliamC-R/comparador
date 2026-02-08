const { useEffect, useMemo, useState } = React;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatNumber = (value) => numberFormatter.format(value || 0);

const initialEntryForm = {
  kind: "income",
  type: "service",
  description: "",
  amount: "",
  date: "",
  service: "",
  product: "",
};

const initialInventoryForm = {
  name: "",
  sku: "",
  category: "",
  quantity: "",
  cost: "",
  price: "",
};

function App() {
  const [activeTab, setActiveTab] = useState("inputs");
  const [entryForm, setEntryForm] = useState(initialEntryForm);
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm);
  const [entries, setEntries] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [compiled, setCompiled] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshAll = async () => {
    await Promise.all([fetchEntries(), fetchInventory(), fetchCompiled()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const totals = useMemo(() => {
    if (!compiled) {
      return {
        income: 0,
        expense: 0,
        net: 0,
        inventoryValue: 0,
      };
    }
    return {
      income: compiled.total_income,
      expense: compiled.total_expense,
      net: compiled.net_result,
      inventoryValue: compiled.inventory_value,
    };
  }, [compiled]);

  const handleUnauthorized = (response) => {
    if (response.status === 401) {
      window.location.href = "/login";
      return true;
    }
    return false;
  };

  const fetchEntries = async () => {
    const response = await fetch("/api/entries");
    if (handleUnauthorized(response)) {
      return;
    }
    const data = await response.json();
    if (response.ok) {
      setEntries(data.entries || []);
    }
  };

  const fetchInventory = async () => {
    const response = await fetch("/api/inventory");
    if (handleUnauthorized(response)) {
      return;
    }
    const data = await response.json();
    if (response.ok) {
      setInventory(data.items || []);
    }
  };

  const fetchCompiled = async () => {
    const response = await fetch("/api/compiled");
    if (handleUnauthorized(response)) {
      return;
    }
    const data = await response.json();
    if (response.ok) {
      setCompiled(data);
    }
  };

  const submitEntry = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const payload = {
      ...entryForm,
      amount: Number(entryForm.amount),
    };
    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(response)) {
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Erro ao salvar entrada.");
      return;
    }
    setEntryForm(initialEntryForm);
    setMessage("Entrada registrada com sucesso.");
    await refreshAll();
  };

  const submitInventory = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const payload = {
      ...inventoryForm,
      quantity: Number(inventoryForm.quantity),
      cost: Number(inventoryForm.cost),
      price: Number(inventoryForm.price),
    };
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(response)) {
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Erro ao salvar item.");
      return;
    }
    setInventoryForm(initialInventoryForm);
    setMessage("Item de estoque salvo.");
    await refreshAll();
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="badge">Controle financeiro completo</p>
          <h1>Comparador Financeiro</h1>
          <p className="subtitle">
            Centralize entradas de serviços, produtos e estoque em um único painel com
            demonstrativo financeiro.
          </p>
        </div>
        <div className="hero-card">
          <h2>Resumo geral</h2>
          <div className="hero-metrics">
            <div>
              <span>Entradas</span>
              <strong>{formatCurrency(totals.income)}</strong>
            </div>
            <div>
              <span>Saídas</span>
              <strong>{formatCurrency(totals.expense)}</strong>
            </div>
            <div>
              <span>Resultado</span>
              <strong>{formatCurrency(totals.net)}</strong>
            </div>
            <div>
              <span>Valor em estoque</span>
              <strong>{formatCurrency(totals.inventoryValue)}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={refreshAll}>
              Atualizar dados
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/login";
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="tabs" role="tablist">
          <button
            className={`tab ${activeTab === "inputs" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("inputs")}
          >
            Entradas &amp; Saídas
          </button>
          <button
            className={`tab ${activeTab === "compiled" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("compiled")}
          >
            Demonstrativo
          </button>
          <button
            className={`tab ${activeTab === "stock" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("stock")}
          >
            Estoque
          </button>
        </section>

        {message && <p className="feedback success">{message}</p>}
        {error && <p className="feedback error">{error}</p>}

        {activeTab === "inputs" && (
          <section className="panel">
            <div className="panel-grid">
              <form className="card form-card" onSubmit={submitEntry}>
                <div className="card-header">
                  <h3>Nova movimentação</h3>
                  <p>Registre entradas e saídas de serviços e produtos.</p>
                </div>
                <label>
                  Tipo de movimentação
                  <select
                    value={entryForm.kind}
                    onChange={(event) =>
                      setEntryForm((prev) => ({ ...prev, kind: event.target.value }))
                    }
                  >
                    <option value="income">Entrada (receita)</option>
                    <option value="expense">Saída (despesa)</option>
                  </select>
                </label>
                <label>
                  Origem
                  <select
                    value={entryForm.type}
                    onChange={(event) =>
                      setEntryForm((prev) => ({ ...prev, type: event.target.value }))
                    }
                  >
                    <option value="service">Serviço</option>
                    <option value="product">Produto</option>
                  </select>
                </label>
                <label>
                  Descrição
                  <input
                    type="text"
                    value={entryForm.description}
                    onChange={(event) =>
                      setEntryForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Ex: Consultoria, Venda de pacote"
                  />
                </label>
                <label>
                  Serviço (opcional)
                  <input
                    type="text"
                    value={entryForm.service}
                    onChange={(event) =>
                      setEntryForm((prev) => ({
                        ...prev,
                        service: event.target.value,
                      }))
                    }
                    placeholder="Ex: Marketing, Treinamento"
                  />
                </label>
                <label>
                  Produto (opcional)
                  <input
                    type="text"
                    value={entryForm.product}
                    onChange={(event) =>
                      setEntryForm((prev) => ({
                        ...prev,
                        product: event.target.value,
                      }))
                    }
                    placeholder="Ex: Kit Premium"
                  />
                </label>
                <label>
                  Valor
                  <input
                    type="number"
                    value={entryForm.amount}
                    onChange={(event) =>
                      setEntryForm((prev) => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Data
                  <input
                    type="date"
                    value={entryForm.date}
                    onChange={(event) =>
                      setEntryForm((prev) => ({
                        ...prev,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
                <button className="secondary-button" type="submit">
                  Salvar movimentação
                </button>
              </form>

              <div className="card">
                <div className="card-header">
                  <h3>Últimas movimentações</h3>
                  <p>Consulte rapidamente o histórico cadastrado.</p>
                </div>
                <div className="list">
                  {entries.length === 0 && (
                    <p className="muted">Nenhuma movimentação cadastrada.</p>
                  )}
                  {entries.map((entry) => (
                    <div key={entry.id} className="list-item">
                      <div>
                        <strong>{entry.description || "Movimentação"}</strong>
                        <span>{entry.date || "Sem data"}</span>
                      </div>
                      <div>
                        <span className={`pill ${entry.kind}`}>
                          {entry.kind === "income" ? "Entrada" : "Saída"}
                        </span>
                        <strong>{formatCurrency(entry.amount)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "compiled" && (
          <section className="panel">
            <div className="panel-grid">
              <div className="card">
                <div className="card-header">
                  <h3>Demonstrativo financeiro</h3>
                  <p>Dados compilados com base nas movimentações.</p>
                </div>
                <div className="summary-grid">
                  <div>
                    <span>Receitas totais</span>
                    <strong>{formatCurrency(compiled?.total_income || 0)}</strong>
                  </div>
                  <div>
                    <span>Despesas totais</span>
                    <strong>{formatCurrency(compiled?.total_expense || 0)}</strong>
                  </div>
                  <div>
                    <span>Resultado líquido</span>
                    <strong>{formatCurrency(compiled?.net_result || 0)}</strong>
                  </div>
                  <div>
                    <span>Margem operacional</span>
                    <strong>{formatNumber(compiled?.margin || 0)}%</strong>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3>Receitas por segmento</h3>
                  <p>Comparativo entre serviços e produtos.</p>
                </div>
                <div className="table">
                  <div className="table-row header">
                    <span>Segmento</span>
                    <span>Receitas</span>
                    <span>Despesas</span>
                  </div>
                  {compiled?.by_type?.map((item) => (
                    <div key={item.type} className="table-row">
                      <span>{item.type_label}</span>
                      <span>{formatCurrency(item.income)}</span>
                      <span>{formatCurrency(item.expense)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel-grid">
              <div className="card">
                <div className="card-header">
                  <h3>Ranking por serviço</h3>
                  <p>Top serviços de maior impacto.</p>
                </div>
                <div className="table">
                  <div className="table-row header">
                    <span>Serviço</span>
                    <span>Total</span>
                  </div>
                  {(compiled?.by_service || []).map((item) => (
                    <div key={item.name} className="table-row">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  {(!compiled?.by_service || compiled.by_service.length === 0) && (
                    <p className="muted">Adicione entradas para ver o ranking.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>Ranking por produto</h3>
                  <p>Produtos com maior participação no faturamento.</p>
                </div>
                <div className="table">
                  <div className="table-row header">
                    <span>Produto</span>
                    <span>Total</span>
                  </div>
                  {(compiled?.by_product || []).map((item) => (
                    <div key={item.name} className="table-row">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  {(!compiled?.by_product || compiled.by_product.length === 0) && (
                    <p className="muted">Adicione entradas para ver o ranking.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "stock" && (
          <section className="panel">
            <div className="panel-grid">
              <form className="card form-card" onSubmit={submitInventory}>
                <div className="card-header">
                  <h3>Novo item de estoque</h3>
                  <p>Registre itens de produtos vendidos.</p>
                </div>
                <label>
                  Nome do item
                  <input
                    type="text"
                    value={inventoryForm.name}
                    onChange={(event) =>
                      setInventoryForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex: Kit premium"
                  />
                </label>
                <label>
                  SKU
                  <input
                    type="text"
                    value={inventoryForm.sku}
                    onChange={(event) =>
                      setInventoryForm((prev) => ({
                        ...prev,
                        sku: event.target.value,
                      }))
                    }
                    placeholder="Ex: PRD-1023"
                  />
                </label>
                <label>
                  Categoria
                  <input
                    type="text"
                    value={inventoryForm.category}
                    onChange={(event) =>
                      setInventoryForm((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                    placeholder="Ex: Cursos, Insumos"
                  />
                </label>
                <label>
                  Quantidade
                  <input
                    type="number"
                    value={inventoryForm.quantity}
                    onChange={(event) =>
                      setInventoryForm((prev) => ({
                        ...prev,
                        quantity: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>
                <label>
                  Custo unitário
                  <input
                    type="number"
                    value={inventoryForm.cost}
                    onChange={(event) =>
                      setInventoryForm((prev) => ({
                        ...prev,
                        cost: event.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Preço de venda
                  <input
                    type="number"
                    value={inventoryForm.price}
                    onChange={(event) =>
                      setInventoryForm((prev) => ({
                        ...prev,
                        price: event.target.value,
                      }))
                    }
                    placeholder="0,00"
                  />
                </label>
                <button className="secondary-button" type="submit">
                  Salvar item
                </button>
              </form>

              <div className="card">
                <div className="card-header">
                  <h3>Itens cadastrados</h3>
                  <p>Controle as quantidades disponíveis.</p>
                </div>
                <div className="table">
                  <div className="table-row header">
                    <span>Item</span>
                    <span>Qtd.</span>
                    <span>Valor em estoque</span>
                  </div>
                  {inventory.map((item) => (
                    <div key={item.id} className="table-row">
                      <span>
                        {item.name}
                        <small>{item.sku || "Sem SKU"}</small>
                      </span>
                      <span>{item.quantity}</span>
                      <span>{formatCurrency(item.stock_value)}</span>
                    </div>
                  ))}
                  {inventory.length === 0 && (
                    <p className="muted">Nenhum item cadastrado.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
