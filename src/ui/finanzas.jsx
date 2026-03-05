import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import "./finanzas.css";

export default function Finanzas() {
  const [operaciones, setOperaciones] = useState([]);

  // UI
  const [q, setQ] = useState("");
  const [estadoSaldo, setEstadoSaldo] = useState("TODAS"); // TODAS | PENDIENTE | OK
  const [moneda, setMoneda] = useState("TODAS"); // TODAS | USD | EUR | ...
  const [banco, setBanco] = useState("TODOS"); // TODOS | bancoX
  const [orden, setOrden] = useState("SALDO_DESC"); // SALDO_DESC | TOTAL_DESC | PROVEEDOR_ASC | PROGRESO_ASC

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  /* =========================
     HELPERS / FORMATTERS
  ========================== */
  const norm = (v, fallback = "") => String(v ?? fallback).trim();
  const normBank = (b) => norm(b, "SIN BANCO") || "SIN BANCO";
  const normMoneda = (m) => String(m || "USD").toUpperCase();
  const normEstado = (e) => String(e || "ACTIVO").trim().toUpperCase();

  // 👉 Definición estricta: solo "ACTIVO" cuenta como pago vigente.
  const isActivo = (estado) => normEstado(estado) === "ACTIVO";

  const money = (n, curr = "USD") => {
    const value = Number(n || 0);
    const c = String(curr || "USD").toUpperCase();
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value);
    }
  };

  // ✅ Fuente real: adelantos[] + pagos[]
  const getMovimientosFromOp = (op) => {
    const adelantos = Array.isArray(op.adelantos) ? op.adelantos : [];
    const pagos = Array.isArray(op.pagos) ? op.pagos : [];

    const movsA = adelantos.map((a, idx) => ({
      ...a,
      tipo: "ADELANTO",
      _idx: idx,
    }));

    const movsP = pagos.map((p, idx) => ({
      ...p,
      tipo: "PAGO",
      _idx: idx,
    }));

    return [...movsA, ...movsP];
  };

  /* =========================
     NORMALIZAR OPERACIONES + FINANZAS (desde movimientos)
  ========================== */
  const rows = useMemo(() => {
    return (operaciones || []).map((op) => {
      const total = Number(op.totalOperacion || 0);
      const movs = getMovimientosFromOp(op);

      let pagadoActivo = 0; // adelantos + pagos ACTIVO
      let adelantosActivos = 0; // solo adelantos ACTIVO

      movs.forEach((m) => {
        const monto = Number(m.monto || 0);
        if (monto <= 0) return;
        if (!isActivo(m.estado)) return;

        pagadoActivo += monto;

        if (String(m.tipo || "").toUpperCase() === "ADELANTO") {
          adelantosActivos += monto;
        }
      });

      const saldo = Math.max(0, total - pagadoActivo);
      const progreso = total > 0 ? Math.min(100, (pagadoActivo / total) * 100) : 0;

      return {
        ...op,
        _id: norm(op.id, ""),
        _proveedor: norm(op.proveedor, "-"),
        _moneda: normMoneda(op.moneda || "USD"),
        _total: total,
        _pagado: pagadoActivo,
        _adelantos: adelantosActivos,
        _saldo: saldo,
        _progreso: progreso,
        _movs: movs,
      };
    });
  }, [operaciones]);

  /* =========================
     MOVIMIENTOS NORMALIZADOS (para bancos / filtros)
  ========================== */
  const movimientos = useMemo(() => {
    const out = [];

    rows.forEach((op) => {
      const movs = Array.isArray(op._movs) ? op._movs : [];

      movs.forEach((m, idx) => {
        const monto = Number(m.monto || 0);
        if (monto <= 0) return;

        out.push({
          opId: op._id,
          tipo: String(m.tipo || "MOV").toUpperCase(),
          banco: normBank(m.banco || "SIN BANCO"),
          estado: normEstado(m.estado),
          fecha: m.fecha || null,
          instrumento: norm(m.instrumento, "-"),
          moneda: normMoneda(m.moneda || op._moneda),
          monto,
          proveedor: op._proveedor,
          _key: `${op._id}_mov_${idx}`,
        });
      });
    });

    return out;
  }, [rows]);

  /* =========================
     MÉTRICAS GLOBALES (REFERENCIALES)
     (no mezclamos monedas en "conversión", solo suma)
  ========================== */
  const resumen = useMemo(() => {
    let total = 0;
    let adelantos = 0;
    let pagado = 0;
    let pendiente = 0;
    let conPendiente = 0;

    rows.forEach((r) => {
      total += r._total;
      adelantos += r._adelantos; // ✅ adelantos ACTIVO
      pagado += r._pagado; // ✅ pagado ACTIVO (adelantos + pagos)
      pendiente += r._saldo;
      if (r._saldo > 0) conPendiente++;
    });

    return { total, adelantos, pagado, pendiente, conPendiente };
  }, [rows]);

  /* =========================
     RESUMEN POR MONEDA (operaciones)
     -> esto es lo que te diferencia USD vs EUR sin eliminar nada
  ========================== */
  const porMoneda = useMemo(() => {
    const acc = new Map();

    rows.forEach((r) => {
      const key = r._moneda || "USD";
      const prev = acc.get(key) || { total: 0, pagado: 0, pendiente: 0, ops: 0 };
      prev.total += r._total;
      prev.pagado += r._pagado;
      prev.pendiente += r._saldo;
      prev.ops += 1;
      acc.set(key, prev);
    });

    return Array.from(acc.entries())
      .map(([m, v]) => ({ moneda: m, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const monedasDisponibles = useMemo(() => {
    const set = new Set(rows.map((r) => r._moneda || "USD"));
    return ["TODAS", ...Array.from(set).sort()];
  }, [rows]);

  /* =========================
     BANCOS (movimientos ACTIVO)
  ========================== */
  const bankStats = useMemo(() => {
    const map = new Map();

    movimientos.forEach((m) => {
      if (!isActivo(m.estado)) return;

      const b = normBank(m.banco);

      if (!map.has(b)) {
        map.set(b, {
          banco: b,
          movimientosActivos: 0,
          totalActivo: 0,
          ops: new Set(),
        });
      }

      const ref = map.get(b);
      ref.movimientosActivos += 1;
      ref.totalActivo += Number(m.monto || 0);
      ref.ops.add(m.opId);
    });

    const ranking = Array.from(map.values())
      .map((x) => ({
        banco: x.banco,
        movimientosActivos: x.movimientosActivos,
        totalActivo: x.totalActivo,
        operaciones: x.ops.size,
      }))
      .sort((a, b) => b.totalActivo - a.totalActivo);

    const bancosUsados = ranking.length;
    const topBanco = ranking[0] || null;
    const movimientosActivos = ranking.reduce((s, r) => s + r.movimientosActivos, 0);

    return { ranking, bancosUsados, topBanco, movimientosActivos };
  }, [movimientos]);

  const bancosDisponibles = useMemo(() => {
    const set = new Set(
      movimientos
        .filter((m) => isActivo(m.estado))
        .map((m) => normBank(m.banco))
    );
    return ["TODOS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [movimientos]);

  /* =========================
     FILTRO + ORDEN (operaciones)
  ========================== */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let out = rows.filter((r) => {
      const matchQ =
        !query ||
        String(r._id).toLowerCase().includes(query) ||
        String(r._proveedor).toLowerCase().includes(query);

      const matchEstado =
        estadoSaldo === "TODAS" ||
        (estadoSaldo === "PENDIENTE" && r._saldo > 0) ||
        (estadoSaldo === "OK" && r._saldo === 0);

      const matchMoneda = moneda === "TODAS" || r._moneda === moneda;

      // match banco: operación con al menos 1 movimiento ACTIVO con ese banco
      let matchBanco = true;
      if (banco !== "TODOS") {
        matchBanco = movimientos.some((m) => {
          if (!isActivo(m.estado)) return false;
          return m.opId === r._id && normBank(m.banco) === banco;
        });
      }

      return matchQ && matchEstado && matchMoneda && matchBanco;
    });

    out.sort((a, b) => {
      if (orden === "SALDO_DESC") return b._saldo - a._saldo;
      if (orden === "TOTAL_DESC") return b._total - a._total;
      if (orden === "PROVEEDOR_ASC") return a._proveedor.localeCompare(b._proveedor);
      if (orden === "PROGRESO_ASC") return a._progreso - b._progreso;
      return 0;
    });

    return out;
  }, [rows, movimientos, q, estadoSaldo, moneda, banco, orden]);

  /* =========================
     EXPORT CSV (operaciones filtradas)
  ========================== */
  const exportCSV = () => {
    const header = [
      "id",
      "proveedor",
      "moneda",
      "total",
      "adelantosActivos",
      "pagadoActivo",
      "saldo",
      "progreso",
    ];

    const lines = filtered.map((r) => [
      r._id,
      r._proveedor,
      r._moneda,
      r._total,
      r._adelantos,
      r._pagado,
      r._saldo,
      Math.round(r._progreso),
    ]);

    const csv = [header, ...lines]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyBankFilter = (b) => setBanco(b);

  return (
    <section className="fin-page">
      {/* Header */}
      <header className="fin-header">
        <div className="fin-header-left">
          <h1>Finanzas</h1>
          <p>Estado financiero de todas las operaciones</p>
        </div>

        <div className="fin-header-actions">
          <button className="fin-btn" onClick={exportCSV} disabled={filtered.length === 0}>
            Exportar CSV
          </button>
        </div>
      </header>

      {/* =========================
          NUEVO: Totales por moneda (SIN BORRAR lo viejo)
      ========================== */}
      {porMoneda.length > 0 && (
        <div className="fin-multi-currency">
          <div className="fin-section-title">
            <span className="fin-warn-ico">⚠</span>
            <h3>Totales en múltiples monedas</h3>
          </div>

          {porMoneda.map((m) => (
            <div key={m.moneda} className="fin-kpis">
              <div className="fin-kpi">
                <span>Total operaciones ({m.moneda})</span>
                <strong>{money(m.total, m.moneda)}</strong>
                <small>{m.ops} operación(es)</small>
              </div>

              <div className="fin-kpi ok">
                <span>Pagado ({m.moneda})</span>
                <strong>{money(m.pagado, m.moneda)}</strong>
                <small>Adelantos + pagos (ACTIVO)</small>
              </div>

              <div className="fin-kpi warn">
                <span>Pendiente ({m.moneda})</span>
                <strong>{money(m.pendiente, m.moneda)}</strong>
                <small>Total - pagado activo</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================
          KPIs financieros (LOS DE ANTES - referenciales)
      ========================== */}
      <div className="fin-kpis">
        <div className="fin-kpi">
          <span>Total de operaciones</span>
          <strong>{money(resumen.total, "USD")}</strong>
          <small>Sumatoria (referencial)</small>
        </div>

        <div className="fin-kpi ok">
          <span>Adelantos pagados</span>
          <strong>{money(resumen.adelantos, "USD")}</strong>
          <small>Solo ADELANTO con estado ACTIVO</small>
        </div>

        <div className="fin-kpi warn">
          <span>Saldo a pagar</span>
          <strong>{money(resumen.pendiente, "USD")}</strong>
          <small>Deuda total (total - pagado activo)</small>
        </div>

        <div className="fin-kpi alert">
          <span>Ops con saldo pendiente</span>
          <strong>{resumen.conPendiente}</strong>
          <small>Requieren acción</small>
        </div>
      </div>

      {/* =========================
          KPIs bancos (LOS DE ANTES)
      ========================== */}
      <div className="fin-kpis">
        <div className="fin-kpi">
          <span>Bancos utilizados</span>
          <strong>{bankStats.bancosUsados}</strong>
          <small>Solo movimientos ACTIVO</small>
        </div>

        <div className="fin-kpi ok">
          <span>Banco principal</span>
          <strong>{bankStats.topBanco?.banco || "-"}</strong>
          <small>
            {bankStats.topBanco
              ? `${money(bankStats.topBanco.totalActivo, "USD")} (volumen)`
              : "—"}
          </small>
        </div>

        <div className="fin-kpi warn">
          <span>Movimientos activos</span>
          <strong>{bankStats.movimientosActivos}</strong>
          <small>Adelantos + pagos (ACTIVO)</small>
        </div>

        <div className="fin-kpi">
          <span>Operaciones filtradas</span>
          <strong>{filtered.length}</strong>
          <small>de {rows.length} totales</small>
        </div>
      </div>

      {/* =========================
          Resumen por moneda (strip de antes)
      ========================== */}
      {porMoneda.length > 0 && (
        <div className="fin-currency-strip">
          {porMoneda.map((m) => (
            <div key={m.moneda} className="fin-currency-chip">
              <div className="fin-currency-top">
                <span className="mono">{m.moneda}</span>
                <span className="muted">Total</span>
              </div>
              <strong>{money(m.total, m.moneda)}</strong>
              <div className="fin-currency-sub">
                <span className="muted">Pendiente</span>
                <span>{money(m.pendiente, m.moneda)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================
          Panel bancos (ranking clickable) (EL DE ANTES)
      ========================== */}
      <div className="fin-bank-panel">
        <div className="fin-bank-head">
          <div>
            <h3>Distribución por banco</h3>
            <p>Basado en movimientos con estado ACTIVO</p>
          </div>

          <div className="fin-bank-actions">
            {banco !== "TODOS" && (
              <button className="fin-btn" onClick={() => setBanco("TODOS")}>
                Limpiar banco
              </button>
            )}
          </div>
        </div>

        <div className="fin-bank-grid">
          {bankStats.ranking.length === 0 ? (
            <div className="fin-empty-box">No hay movimientos ACTIVO para calcular bancos.</div>
          ) : (
            bankStats.ranking.slice(0, 8).map((b) => {
              const active = banco === b.banco;
              return (
                <button
                  key={b.banco}
                  className={`fin-bank-card ${active ? "active" : ""}`}
                  onClick={() => applyBankFilter(b.banco)}
                  title="Filtrar por este banco"
                >
                  <div className="fin-bank-top">
                    <span className="fin-bank-name">{b.banco}</span>
                    <span className="fin-bank-pill">{b.movimientosActivos} movs</span>
                  </div>

                  <div className="fin-bank-main">{money(b.totalActivo, "USD")}</div>

                  <div className="fin-bank-sub">
                    <span className="muted">Ops afectadas</span>
                    <span>{b.operaciones}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* =========================
          Toolbar (la de antes: búsqueda + filtros)
      ========================== */}
      <div className="fin-toolbar">
        <div className="fin-search">
          <span className="fin-search-ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por proveedor o ID…"
          />
        </div>

        <div className="fin-filters">
          <select value={estadoSaldo} onChange={(e) => setEstadoSaldo(e.target.value)}>
            <option value="TODAS">Todas</option>
            <option value="PENDIENTE">Con saldo</option>
            <option value="OK">Saldo 0</option>
          </select>

          <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            {monedasDisponibles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select value={banco} onChange={(e) => setBanco(e.target.value)}>
            {bancosDisponibles.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="SALDO_DESC">Orden: Saldo (↓)</option>
            <option value="TOTAL_DESC">Orden: Total (↓)</option>
            <option value="PROVEEDOR_ASC">Orden: Proveedor (A→Z)</option>
            <option value="PROGRESO_ASC">Orden: Progreso (↑)</option>
          </select>
        </div>
      </div>

      {/* =========================
          Tabla financiera (la de antes)
      ========================== */}
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Operación</th>
              <th>Proveedor</th>
              <th>Moneda</th>
              <th>Total</th>
              <th>Adelantos</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Progreso</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="fin-empty">
                  No hay datos para mostrar con estos filtros.
                </td>
              </tr>
            )}

            {filtered.map((op) => {
              const saldoOk = op._saldo === 0;

              return (
                <tr key={op._id}>
                  <td className="mono">{op._id}</td>
                  <td>{op._proveedor || "-"}</td>
                  <td className="mono">{op._moneda}</td>
                  <td>{money(op._total, op._moneda)}</td>
                  <td>{money(op._adelantos, op._moneda)}</td>
                  <td>{money(op._pagado, op._moneda)}</td>
                  <td className={saldoOk ? "fin-saldo ok" : "fin-saldo warn"}>
                    {money(op._saldo, op._moneda)}
                  </td>
                  <td>
                    <div className="fin-progress">
                      <div className="fin-progress-bar">
                        <div
                          className="fin-progress-fill"
                          style={{ width: `${op._progreso}%` }}
                        />
                      </div>
                      <span className="fin-progress-label">{Math.round(op._progreso)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="fin-table-foot">
          <span className="muted">
            Mostrando <b>{filtered.length}</b> de <b>{rows.length}</b> operaciones
          </span>
        </div>
      </div>
    </section>
  );
}