from __future__ import annotations

from dataclasses import dataclass
from itertools import count
from typing import Any

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)


class ValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ProjectionInput:
    current_revenue: float
    current_expenses: float
    monthly_growth_rate: float
    months: int
    segments: list[dict[str, Any]]


@dataclass(frozen=True)
class TaxInput:
    taxable_income: float
    regime: str
    custom_rate: float | None


@dataclass(frozen=True)
class SummaryInput:
    cash: float
    entries: float
    exits: float
    assets: float
    liabilities: float


@dataclass(frozen=True)
class EntryInput:
    kind: str
    type: str
    description: str
    amount: float
    date: str | None
    service: str | None
    product: str | None


@dataclass(frozen=True)
class InventoryInput:
    name: str
    sku: str | None
    category: str | None
    quantity: int
    cost: float
    price: float


def parse_float(value: Any, field: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"Campo '{field}' inválido.") from exc
    return number


def parse_int(value: Any, field: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"Campo '{field}' inválido.") from exc
    return number


def parse_projection_input(payload: dict[str, Any]) -> ProjectionInput:
    current_revenue = parse_float(payload.get("current_revenue"), "current_revenue")
    current_expenses = parse_float(payload.get("current_expenses"), "current_expenses")
    monthly_growth_rate = parse_float(
        payload.get("monthly_growth_rate", 0.0), "monthly_growth_rate"
    )
    months = parse_int(payload.get("months", 12), "months")
    if months <= 0:
        raise ValidationError("Campo 'months' precisa ser maior que zero.")
    segments = payload.get("segments", [])
    if segments is None:
        segments = []
    if not isinstance(segments, list):
        raise ValidationError("Campo 'segments' precisa ser uma lista.")
    return ProjectionInput(
        current_revenue=current_revenue,
        current_expenses=current_expenses,
        monthly_growth_rate=monthly_growth_rate,
        months=months,
        segments=segments,
    )


def parse_tax_input(payload: dict[str, Any]) -> TaxInput:
    taxable_income = parse_float(payload.get("taxable_income"), "taxable_income")
    regime = str(payload.get("regime", "simples")).lower()
    custom_rate = payload.get("custom_rate")
    if custom_rate is not None:
        custom_rate = parse_float(custom_rate, "custom_rate")
    return TaxInput(
        taxable_income=taxable_income, regime=regime, custom_rate=custom_rate
    )


def parse_summary_input(payload: dict[str, Any]) -> SummaryInput:
    return SummaryInput(
        cash=parse_float(payload.get("cash"), "cash"),
        entries=parse_float(payload.get("entries"), "entries"),
        exits=parse_float(payload.get("exits"), "exits"),
        assets=parse_float(payload.get("assets"), "assets"),
        liabilities=parse_float(payload.get("liabilities"), "liabilities"),
    )


def parse_entry_input(payload: dict[str, Any]) -> EntryInput:
    kind = str(payload.get("kind", "")).lower()
    if kind not in {"income", "expense"}:
        raise ValidationError("Campo 'kind' precisa ser income ou expense.")
    entry_type = str(payload.get("type", "")).lower()
    if entry_type not in {"service", "product"}:
        raise ValidationError("Campo 'type' precisa ser service ou product.")
    description = str(payload.get("description", "")).strip()
    amount = parse_float(payload.get("amount"), "amount")
    if amount < 0:
        raise ValidationError("Campo 'amount' precisa ser positivo.")
    date = payload.get("date")
    if date is not None:
        date = str(date)
    service = payload.get("service")
    if service is not None:
        service = str(service).strip() or None
    product = payload.get("product")
    if product is not None:
        product = str(product).strip() or None
    return EntryInput(
        kind=kind,
        type=entry_type,
        description=description,
        amount=amount,
        date=date,
        service=service,
        product=product,
    )


def parse_inventory_input(payload: dict[str, Any]) -> InventoryInput:
    name = str(payload.get("name", "")).strip()
    if not name:
        raise ValidationError("Campo 'name' é obrigatório.")
    sku = payload.get("sku")
    if sku is not None:
        sku = str(sku).strip() or None
    category = payload.get("category")
    if category is not None:
        category = str(category).strip() or None
    quantity = parse_int(payload.get("quantity", 0), "quantity")
    if quantity < 0:
        raise ValidationError("Campo 'quantity' precisa ser positivo.")
    cost = parse_float(payload.get("cost", 0), "cost")
    price = parse_float(payload.get("price", 0), "price")
    return InventoryInput(
        name=name,
        sku=sku,
        category=category,
        quantity=quantity,
        cost=cost,
        price=price,
    )


def project_values(value: float, growth_rate: float, months: int) -> list[float]:
    projections = []
    current = value
    for _ in range(months):
        current *= 1 + growth_rate
        projections.append(round(current, 2))
    return projections


def build_segment_projection(segment: dict[str, Any], growth_rate: float, months: int) -> dict[str, Any]:
    name = str(segment.get("name", "Segmento"))
    revenue = parse_float(segment.get("revenue", 0), "segment.revenue")
    expenses = parse_float(segment.get("expenses", 0), "segment.expenses")
    revenue_projection = project_values(revenue, growth_rate, months)
    expenses_projection = project_values(expenses, growth_rate, months)
    profit_projection = [
        round(rev - exp, 2) for rev, exp in zip(revenue_projection, expenses_projection)
    ]
    return {
        "name": name,
        "revenue": revenue_projection,
        "expenses": expenses_projection,
        "profit": profit_projection,
    }


def estimate_tax(input_data: TaxInput) -> dict[str, Any]:
    rates = {
        "simples": 0.06,
        "lucro_presumido": 0.1133,
        "lucro_real": 0.25,
    }
    if input_data.regime == "custom":
        if input_data.custom_rate is None:
            raise ValidationError("Campo 'custom_rate' é obrigatório para regime custom.")
        rate = input_data.custom_rate
    else:
        rate = rates.get(input_data.regime)
        if rate is None:
            raise ValidationError(
                "Regime inválido. Use simples, lucro_presumido, lucro_real ou custom."
            )
    total_tax = max(input_data.taxable_income * rate, 0)
    effective_rate = 0 if input_data.taxable_income == 0 else total_tax / input_data.taxable_income
    return {
        "regime": input_data.regime,
        "taxable_income": round(input_data.taxable_income, 2),
        "rate": round(rate, 4),
        "total_tax": round(total_tax, 2),
        "effective_rate": round(effective_rate, 4),
    }


entry_store: list[dict[str, Any]] = []
inventory_store: list[dict[str, Any]] = []
entry_counter = count(1)
inventory_counter = count(1)


def build_compiled_data() -> dict[str, Any]:
    total_income = sum(item["amount"] for item in entry_store if item["kind"] == "income")
    total_expense = sum(item["amount"] for item in entry_store if item["kind"] == "expense")
    net_result = total_income - total_expense
    margin = 0 if total_income == 0 else round((net_result / total_income) * 100, 2)

    type_map = {"service": "Serviços", "product": "Produtos"}
    by_type = []
    for entry_type, label in type_map.items():
        income = sum(
            item["amount"]
            for item in entry_store
            if item["type"] == entry_type and item["kind"] == "income"
        )
        expense = sum(
            item["amount"]
            for item in entry_store
            if item["type"] == entry_type and item["kind"] == "expense"
        )
        by_type.append(
            {
                "type": entry_type,
                "type_label": label,
                "income": round(income, 2),
                "expense": round(expense, 2),
            }
        )

    service_totals: dict[str, float] = {}
    product_totals: dict[str, float] = {}
    for item in entry_store:
        if item["kind"] != "income":
            continue
        if item.get("service"):
            service_totals[item["service"]] = service_totals.get(item["service"], 0) + item[
                "amount"
            ]
        if item.get("product"):
            product_totals[item["product"]] = product_totals.get(item["product"], 0) + item[
                "amount"
            ]

    by_service = sorted(
        (
            {"name": name, "total": round(total, 2)}
            for name, total in service_totals.items()
        ),
        key=lambda item: item["total"],
        reverse=True,
    )
    by_product = sorted(
        (
            {"name": name, "total": round(total, 2)}
            for name, total in product_totals.items()
        ),
        key=lambda item: item["total"],
        reverse=True,
    )

    inventory_value = sum(item["stock_value"] for item in inventory_store)

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_result": round(net_result, 2),
        "margin": margin,
        "by_type": by_type,
        "by_service": by_service,
        "by_product": by_product,
        "inventory_value": round(inventory_value, 2),
    }


@app.errorhandler(ValidationError)
def handle_validation_error(error: ValidationError):
    return jsonify({"error": str(error)}), 400


@app.route("/health", methods=["GET"])
def health() -> tuple[Any, int]:
    return jsonify({"status": "ok"}), 200


@app.route("/", methods=["GET"])
def index() -> Any:
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>", methods=["GET"])
def static_files(filename: str) -> Any:
    return send_from_directory(".", filename)


@app.route("/api/projections", methods=["POST"])
def projections() -> tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    input_data = parse_projection_input(payload)
    revenue_projection = project_values(
        input_data.current_revenue, input_data.monthly_growth_rate, input_data.months
    )
    expenses_projection = project_values(
        input_data.current_expenses, input_data.monthly_growth_rate, input_data.months
    )
    projections = []
    for index, (rev, exp) in enumerate(zip(revenue_projection, expenses_projection), start=1):
        profit = round(rev - exp, 2)
        margin = 0 if rev == 0 else round((profit / rev) * 100, 2)
        projections.append(
            {
                "month": index,
                "revenue": rev,
                "expenses": exp,
                "profit": profit,
                "margin": margin,
            }
        )

    segments_projection = [
        build_segment_projection(segment, input_data.monthly_growth_rate, input_data.months)
        for segment in input_data.segments
    ]

    return (
        jsonify(
            {
                "months": input_data.months,
                "growth_rate": input_data.monthly_growth_rate,
                "projections": projections,
                "segments": segments_projection,
            }
        ),
        200,
    )


@app.route("/api/tax-estimate", methods=["POST"])
def tax_estimate() -> tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    input_data = parse_tax_input(payload)
    return jsonify(estimate_tax(input_data)), 200


@app.route("/api/entries", methods=["GET", "POST"])
def entries() -> tuple[Any, int]:
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        input_data = parse_entry_input(payload)
        entry_id = next(entry_counter)
        entry = {
            "id": entry_id,
            "kind": input_data.kind,
            "type": input_data.type,
            "description": input_data.description,
            "amount": round(input_data.amount, 2),
            "date": input_data.date,
            "service": input_data.service,
            "product": input_data.product,
        }
        entry_store.insert(0, entry)
        return jsonify(entry), 201
    return jsonify({"entries": entry_store}), 200


@app.route("/api/inventory", methods=["GET", "POST"])
def inventory() -> tuple[Any, int]:
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        input_data = parse_inventory_input(payload)
        item_id = next(inventory_counter)
        stock_value = input_data.quantity * input_data.cost
        item = {
            "id": item_id,
            "name": input_data.name,
            "sku": input_data.sku,
            "category": input_data.category,
            "quantity": input_data.quantity,
            "cost": round(input_data.cost, 2),
            "price": round(input_data.price, 2),
            "stock_value": round(stock_value, 2),
        }
        inventory_store.insert(0, item)
        return jsonify(item), 201
    return jsonify({"items": inventory_store}), 200


@app.route("/api/compiled", methods=["GET"])
def compiled() -> tuple[Any, int]:
    return jsonify(build_compiled_data()), 200


@app.route("/api/summary", methods=["POST"])
def summary() -> tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    input_data = parse_summary_input(payload)

    net_cash_flow = input_data.entries - input_data.exits
    net_worth = input_data.assets - input_data.liabilities
    liquidity_ratio = (
        0 if input_data.liabilities == 0 else input_data.assets / input_data.liabilities
    )

    return (
        jsonify(
            {
                "cash": round(input_data.cash, 2),
                "entries": round(input_data.entries, 2),
                "exits": round(input_data.exits, 2),
                "net_cash_flow": round(net_cash_flow, 2),
                "assets": round(input_data.assets, 2),
                "liabilities": round(input_data.liabilities, 2),
                "net_worth": round(net_worth, 2),
                "liquidity_ratio": round(liquidity_ratio, 2),
            }
        ),
        200,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
