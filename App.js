/**
 * MEMBER 3 — STEP 4: React Frontend v2.0
 * =========================================
 * NEW FEATURES:
 *   1. Login page  — username/password with JWT token
 *   2. Explainable AI tab — AI explanation for any flagged GSTIN
 *   3. Email Alerts tab  — email log + manual alert sender
 *   4. Predict tab updated — shows AI explanation + email status
 *
 * Default credentials:
 *   admin   / admin123
 *   analyst / analyst456
 *   viewer  / viewer789
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const API = "http://localhost:8000";

// ── helpers ───────────────────────────────────────────────────
const token = () => localStorage.getItem("gst_token");
const authH = () => ({ Authorization: `Bearer ${token()}` });
const fmt   = (n) => Number(n).toLocaleString("en-IN");

const C = {
  High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e",
  blue: "#3b82f6", teal: "#14b8a6",
  bg: "#060f1e", card: "#0d1f35", card2: "#112240",
  border: "#1e3a5f", text: "#e2e8f0", muted: "#64748b",
  glow: "rgba(59,130,246,0.15)",
};

// ═════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [form, setF]   = useState({ username: "", password: "" });
  const [err,  setErr] = useState("");
  const [loading, setL]= useState(false);

  const submit = async () => {
    if (!form.username || !form.password) { setErr("Fill in both fields"); return; }
    setL(true); setErr("");
    try {
      const res = await axios.post(`${API}/login`, form);
      localStorage.setItem("gst_token",    res.data.token);
      localStorage.setItem("gst_username", res.data.username);
      localStorage.setItem("gst_role",     res.data.role);
      onLogin(res.data.username, res.data.role);
    } catch (e) {
      setErr(e.response?.data?.detail || "Login failed — check credentials");
    } finally { setL(false); }
  };

  const inp = {
    width: "100%", background: C.card2, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "12px 16px", color: C.text,
    fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', 'Inter', sans-serif",
      backgroundImage: `radial-gradient(ellipse at 20% 50%, ${C.glow} 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.08) 0%, transparent 50%)`,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "48px 44px", width: "100%", maxWidth: 420,
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
          }}>🛡️</div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            GST Fraud Detection
          </h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
            Team JustFly · ITERYX'26
          </p>
        </div>

        {/* Fields */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 6 }}>
            Username
          </label>
          <input
            style={inp} placeholder="admin / analyst / viewer"
            value={form.username}
            onChange={e => setF(p => ({ ...p, username: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 6 }}>
            Password
          </label>
          <input
            style={inp} type="password" placeholder="••••••••"
            value={form.password}
            onChange={e => setF(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
        </div>

        {err && (
          <div style={{
            background: "#ef444422", border: "1px solid #ef4444",
            borderRadius: 8, padding: "10px 14px", color: "#ef4444",
            fontSize: 13, marginBottom: 16,
          }}>⚠ {err}</div>
        )}

        <button onClick={submit} disabled={loading} style={{
          width: "100%", background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          color: "white", border: "none", borderRadius: 10,
          padding: "13px", fontSize: 15, fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
        }}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>

        {/* Demo creds hint */}
        <div style={{
          marginTop: 24, background: C.card2, borderRadius: 10,
          padding: "12px 16px", fontSize: 12, color: C.muted,
        }}>
          <div style={{ marginBottom: 4, fontWeight: 600, color: C.text }}>Demo credentials</div>
          <div>admin / admin123 &nbsp;·&nbsp; analyst / analyst456</div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// STAT CARD
// ═════════════════════════════════════════════════════════════
function StatCard({ title, value, color, sub }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${color || C.border}`,
      borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 150,
    }}>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 6px" }}>{title}</p>
      <p style={{ color: color || C.text, fontSize: 30, fontWeight: 700, margin: "0 0 4px" }}>
        {value}
      </p>
      {sub && <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═════════════════════════════════════════════════════════════
function OverviewTab({ stats, distribution }) {
  if (!stats) return <p style={{ color: C.muted, padding: 20 }}>Loading…</p>;

  const pie = [
    { name: "High",   value: stats.high_risk   },
    { name: "Medium", value: stats.medium_risk },
    { name: "Low",    value: stats.low_risk    },
  ];
  const bar = distribution
    ? distribution.bins.map((b, i) => ({ score: b, count: distribution.counts[i] }))
    : [];

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard title="Total Transactions"  value={fmt(stats.total_transactions)} />
        <StatCard title="🚨 High Risk"  value={stats.high_risk}   color={C.High}   sub="Immediate action" />
        <StatCard title="⚠️ Medium Risk" value={stats.medium_risk} color={C.Medium} sub="Human review" />
        <StatCard title="✅ Low Risk"   value={stats.low_risk}    color={C.Low}    sub="Likely clean" />
        <StatCard title="Avg Risk Score" value={stats.avg_risk_score} />
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 20, flex: 1, minWidth: 260, border: `1px solid ${C.border}` }}>
          <h3 style={{ color: C.text, marginTop: 0, fontSize: 15 }}>Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                {pie.map(e => <Cell key={e.name} fill={C[e.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.card, borderRadius: 14, padding: 20, flex: 2, minWidth: 320, border: `1px solid ${C.border}` }}>
          <h3 style={{ color: C.text, marginTop: 0, fontSize: 15 }}>Risk Score Histogram</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bar}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="score" stroke={C.muted} />
              <YAxis stroke={C.muted} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} />
              <Bar dataKey="count" fill={C.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 2 — FLAGGED
// ═════════════════════════════════════════════════════════════
function FlaggedTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlert]  = useState({});

  useEffect(() => {
    axios.get(`${API}/flagged?limit=50`, { headers: authH() })
      .then(r => setRows(r.data)).finally(() => setLoading(false));
  }, []);

  const sendAlert = async (gstin, company) => {
    setAlert(p => ({ ...p, [gstin]: "sending…" }));
    try {
      const r = await axios.post(`${API}/send_alert/${gstin}`, {}, { headers: authH() });
      setAlert(p => ({ ...p, [gstin]: r.data.sent ? "✅ Sent!" : `❌ ${r.data.message}` }));
    } catch (e) {
      setAlert(p => ({ ...p, [gstin]: "❌ Failed" }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: C.text, margin: 0 }}>🚨 High-Risk Transactions</h2>
        <span style={{ color: C.muted, fontSize: 13 }}>{rows.length} flagged</span>
      </div>
      {loading ? <p style={{ color: C.muted }}>Loading…</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: C.text }}>
            <thead>
              <tr style={{ background: C.card2, borderBottom: `2px solid ${C.border}` }}>
                {["Company","Sector","State","Taxable Value","ITC/Tax","Risk","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const itcRatio = r.itc_claimed / (r.tax_paid + 1);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{r.taxpayer_name}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{r.gstin}</div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>{r.sector}</td>
                    <td style={{ padding: "10px 14px" }}>{r.state}</td>
                    <td style={{ padding: "10px 14px" }}>₹{fmt(r.taxable_value)}</td>
                    <td style={{ padding: "10px 14px", color: itcRatio > 1.5 ? C.High : C.text }}>
                      {itcRatio.toFixed(2)}×
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: r.risk_score * 60, height: 6, background: C.High, borderRadius: 3 }} />
                        <span>{r.risk_score}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => sendAlert(r.gstin, r.taxpayer_name)}
                        style={{ background: "#ef444422", border: "1px solid #ef4444",
                          borderRadius: 6, padding: "4px 10px", color: "#ef4444",
                          fontSize: 11, cursor: "pointer" }}>
                        {alertMsg[r.gstin] || "📧 Alert"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 3 — PREDICT (updated with explanation + email status)
// ═════════════════════════════════════════════════════════════
function PredictTab() {
  const [form, setF]    = useState({
    taxable_value: 2000000, itc_claimed: 5000000, tax_paid: 40000,
    invoice_count: 150, mismatch_ratio: 0.65, num_buyers: 40,
    sector_enc: 0, state_enc: 0, status_enc: 0,
    gstin: "29AABCT1332L1ZR", taxpayer_name: "Test Company Ltd",
    sector: "Manufacturing", state: "KA", filing_status: "Late",
    send_email: true, explain: true,
  });
  const [result, setR]  = useState(null);
  const [loading, setL] = useState(false);
  const [err, setErr]   = useState("");

  const submit = async () => {
    setL(true); setErr(""); setR(null);
    try {
      const res = await axios.post(`${API}/predict`, form, { headers: authH() });
      setR(res.data);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to connect to API");
    } finally { setL(false); }
  };

  const rc = result ? C[result.risk_label] : C.text;

  const Field = ({ label, k, type = "number", step = 1 }) => (
    <div>
      <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[k]} step={step}
        onChange={e => setF(p => ({ ...p, [k]: type === "number" ? parseFloat(e.target.value) : e.target.value }))}
        style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13,
          boxSizing: "border-box" }}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ color: C.text, marginTop: 0 }}>🔍 Predict Transaction Risk</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Field label="Taxable Value (₹)"    k="taxable_value" />
        <Field label="ITC Claimed (₹)"      k="itc_claimed" />
        <Field label="Tax Paid (₹)"         k="tax_paid" />
        <Field label="Invoice Count"        k="invoice_count" />
        <Field label="Mismatch Ratio (0–1)" k="mismatch_ratio" step={0.01} />
        <Field label="Number of Buyers"     k="num_buyers" />
        <Field label="Sector Code (0–4)"    k="sector_enc" />
        <Field label="State Code (0–9)"     k="state_enc" />
        <Field label="Filing Status (0=Late,1=Missing,2=Regular)" k="status_enc" />
        <Field label="Company Name"         k="taxpayer_name" type="text" />
      </div>

      {/* Options row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {[["send_email", "📧 Send email alert if High Risk"],
          ["explain",    "🤖 Generate AI explanation"]].map(([k, lbl]) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: C.text, cursor: "pointer" }}>
            <input type="checkbox" checked={form[k]}
              onChange={e => setF(p => ({ ...p, [k]: e.target.checked }))}
              style={{ width: 16, height: 16 }} />
            {lbl}
          </label>
        ))}
      </div>

      <button onClick={submit} disabled={loading} style={{
        width: "100%", background: "linear-gradient(135deg,#3b82f6,#2563eb)",
        color: "white", border: "none", borderRadius: 10, padding: "13px",
        fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer",
        marginBottom: 20,
      }}>
        {loading ? "Analysing…" : "🚀 Analyse Transaction"}
      </button>

      {err && <div style={{ background: "#ef444422", border: "1px solid #ef4444",
        borderRadius: 8, padding: 14, color: "#ef4444", marginBottom: 16 }}>❌ {err}</div>}

      {result && (
        <div style={{ background: rc + "11", border: `2px solid ${rc}`,
          borderRadius: 14, padding: 24 }}>
          <h2 style={{ color: rc, margin: "0 0 20px", fontSize: 20 }}>{result.verdict}</h2>

          {/* Score grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[["ML Probability", (result.ml_probability*100).toFixed(1)+"%"],
              ["Anomaly Score",  (result.anomaly_probability*100).toFixed(1)+"%"],
              ["Risk Score",     result.risk_score],
              ["Risk Label",     result.risk_label]].map(([lbl, val]) => (
              <div key={lbl} style={{ background: C.card2, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ color: C.muted, fontSize: 11, margin: "0 0 4px" }}>{lbl}</p>
                <p style={{ color: rc, fontSize: 18, fontWeight: 700, margin: 0 }}>{val}</p>
              </div>
            ))}
          </div>

          {/* AI Explanation */}
          {result.explanation && (
            <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b",
              borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 14 }}>
                  AI Explanation — Why this is flagged
                </span>
              </div>
              <p style={{ color: C.text, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                {result.explanation}
              </p>
            </div>
          )}

          {/* Email status */}
          {result.email_alert && (
            <div style={{
              background: result.email_alert.sent ? "#22c55e11" : "#ef444411",
              border: `1px solid ${result.email_alert.sent ? "#22c55e" : "#ef4444"}`,
              borderRadius: 10, padding: 12, fontSize: 13,
              color: result.email_alert.sent ? "#22c55e" : "#ef4444",
            }}>
              📧 {result.email_alert.sent
                ? `Alert email sent successfully!`
                : `Email failed: ${result.email_alert.message}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 4 — EXPLAINABLE AI
// ═════════════════════════════════════════════════════════════
function ExplainTab() {
  const [rows, setRows]       = useState([]);
  const [selected, setSel]    = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState({ list: true, explain: false });
  const [gstin, setGstin]     = useState("");

  useEffect(() => {
    axios.get(`${API}/flagged?limit=30`, { headers: authH() })
      .then(r => { setRows(r.data); setLoading(p => ({...p, list: false})); })
      .catch(() => setLoading(p => ({...p, list: false})));
  }, []);

  const explain = async (g) => {
    setSel(g); setResult(null);
    setLoading(p => ({...p, explain: true}));
    try {
      const res = await axios.post(`${API}/explain`, { gstin: g }, { headers: authH() });
      setResult(res.data);
    } catch (e) {
      setResult({ error: e.response?.data?.detail || "Failed" });
    } finally { setLoading(p => ({...p, explain: false})); }
  };

  const explainManual = () => { if (gstin.trim()) explain(gstin.trim()); };

  return (
    <div>
      <h2 style={{ color: C.text, marginTop: 0 }}>🤖 Explainable AI</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
        Select a flagged company below — our AI will explain in plain English <em>why</em> it was flagged
        and which fraud pattern it matches.
      </p>

      {/* Manual GSTIN input */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input value={gstin} onChange={e => setGstin(e.target.value)}
          placeholder="Enter any GSTIN to explain…"
          style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13 }} />
        <button onClick={explainManual} style={{
          background: "#f59e0b22", border: "1px solid #f59e0b", color: "#f59e0b",
          borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: "pointer" }}>
          Explain →
        </button>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left: company list */}
        <div style={{ flex: 1, minWidth: 260, maxHeight: 520, overflowY: "auto",
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
          {loading.list ? <p style={{ padding: 20, color: C.muted }}>Loading…</p>
            : rows.map((r, i) => (
            <div key={i} onClick={() => explain(r.gstin)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: `1px solid ${C.border}`,
                background: selected === r.gstin ? "#3b82f622" : "transparent",
                borderLeft: selected === r.gstin ? `3px solid ${C.blue}` : "3px solid transparent",
                transition: "all 0.15s",
              }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{r.taxpayer_name}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{r.gstin}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: C.muted }}>{r.sector}</span>
                <span style={{ fontSize: 11, color: C.High, fontWeight: 600 }}>
                  {r.risk_score}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: explanation panel */}
        <div style={{ flex: 2, minWidth: 300 }}>
          {loading.explain && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
              <p style={{ color: C.muted }}>AI is analysing the transaction…</p>
            </div>
          )}

          {!loading.explain && !result && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
              <p style={{ color: C.muted }}>Select a company on the left to get an AI explanation</p>
            </div>
          )}

          {!loading.explain && result && !result.error && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              {/* Header */}
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <h3 style={{ color: C.text, margin: "0 0 4px" }}>{result.company}</h3>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: C.muted }}>{result.gstin}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <span style={{ background: C.High + "22", color: C.High,
                    border: `1px solid ${C.High}`, padding: "3px 12px",
                    borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {result.risk_label} Risk
                  </span>
                  <span style={{ background: C.card2, color: C.text,
                    border: `1px solid ${C.border}`, padding: "3px 12px",
                    borderRadius: 20, fontSize: 12 }}>
                    Score: {result.risk_score}
                  </span>
                </div>
              </div>

              {/* AI Explanation */}
              <div style={{ background: "#f59e0b0d", border: "1px solid #f59e0b44",
                borderRadius: 10, padding: 18, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 14 }}>
                    AI Fraud Explanation
                  </span>
                </div>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.85, margin: 0 }}>
                  {result.explanation}
                </p>
              </div>

              {/* Feature table */}
              {result.features && (
                <div>
                  <div style={{ color: C.muted, fontSize: 12, fontWeight: 600,
                    marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Transaction Details
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                      {[
                        ["Taxable Value",  "₹" + fmt(result.features.taxable_value)],
                        ["ITC Claimed",    "₹" + fmt(result.features.itc_claimed)],
                        ["Tax Paid",       "₹" + fmt(result.features.tax_paid)],
                        ["ITC / Tax Ratio",`${parseFloat(result.features.itc_ratio||0).toFixed(2)}×`,
                          parseFloat(result.features.itc_ratio||0) > 1.5],
                        ["Invoice Count",   result.features.invoice_count,
                          parseInt(result.features.invoice_count||0) > 80],
                        ["Mismatch Ratio",  `${(parseFloat(result.features.mismatch_ratio||0)*100).toFixed(1)}%`,
                          parseFloat(result.features.mismatch_ratio||0) > 0.3],
                        ["Buyers",         result.features.num_buyers,
                          parseInt(result.features.num_buyers||0) > 25],
                        ["Filing Status",   result.features.filing_status,
                          ["Late","Missing"].includes(result.features.filing_status)],
                      ].map(([k, v, flag]) => (
                        <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "8px 0", color: C.muted, width: "45%" }}>{k}</td>
                          <td style={{ padding: "8px 0", color: flag ? C.High : C.text,
                            fontWeight: flag ? 600 : 400 }}>
                            {v} {flag ? "⚠" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading.explain && result?.error && (
            <div style={{ background: "#ef444422", border: "1px solid #ef4444",
              borderRadius: 12, padding: 24, color: "#ef4444" }}>
              ❌ {result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 5 — EMAIL ALERTS LOG
// ═════════════════════════════════════════════════════════════
function EmailTab() {
  const [log, setLog]     = useState([]);
  const [loading, setL]   = useState(true);
  const [testEmail, setTE]= useState("");
  const [testStatus, setTS]=useState("");

  const refresh = useCallback(() => {
    setL(true);
    axios.get(`${API}/email_log`, { headers: authH() })
      .then(r => setLog(r.data.log || []))
      .finally(() => setL(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setTS("sending…");
    try {
      const res = await axios.post(`${API}/send_alert/${testEmail.trim()}`, {}, { headers: authH() });
      setTS(res.data.sent ? "✅ Alert sent!" : `❌ ${res.data.message}`);
    } catch (e) {
      setTS("❌ " + (e.response?.data?.detail || "Failed"));
    }
  };

  return (
    <div>
      <h2 style={{ color: C.text, marginTop: 0 }}>📧 Email Alerts</h2>

      {/* Config reminder */}
      <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b44",
        borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div style={{ color: "#f59e0b", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
          ⚙️ Email Configuration (in step3_backend.py)
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>
          Set <code style={{ background: C.card2, padding: "1px 6px", borderRadius: 4 }}>EMAIL_SENDER</code>, &nbsp;
          <code style={{ background: C.card2, padding: "1px 6px", borderRadius: 4 }}>EMAIL_PASSWORD</code> (Gmail App Password), &nbsp;
          <code style={{ background: C.card2, padding: "1px 6px", borderRadius: 4 }}>EMAIL_RECEIVER</code> before starting the backend.
          Alerts fire automatically when a prediction returns High Risk and the "send email" checkbox is on.
        </div>
      </div>

      {/* Manual trigger */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, color: C.text, marginBottom: 12 }}>
          📤 Manually send alert for a GSTIN
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={testEmail} onChange={e => setTE(e.target.value)}
            placeholder="Paste a GSTIN from the Flagged tab…"
            style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13 }} />
          <button onClick={sendTest} style={{
            background: "#ef444422", border: "1px solid #ef4444",
            color: "#ef4444", borderRadius: 8, padding: "10px 18px",
            fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            Send Alert
          </button>
        </div>
        {testStatus && (
          <div style={{ marginTop: 10, fontSize: 13,
            color: testStatus.startsWith("✅") ? C.Low : C.High }}>
            {testStatus}
          </div>
        )}
      </div>

      {/* Log table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.text, fontWeight: 600 }}>Alert History ({log.length})</span>
          <button onClick={refresh} style={{ background: "transparent",
            border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6,
            padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>
            Refresh ↻
          </button>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: C.muted }}>Loading…</p>
        ) : log.length === 0 ? (
          <p style={{ padding: 20, color: C.muted, textAlign: "center" }}>
            No alerts sent this session yet. Run a High Risk prediction to trigger one.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.card2 }}>
                {["Time","Company","Risk Score","Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                    color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 16px", color: C.muted, fontSize: 12 }}>
                    {new Date(l.time).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "10px 16px", color: C.text }}>{l.company}</td>
                  <td style={{ padding: "10px 16px", color: C.High }}>{l.score}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      background: l.ok ? "#22c55e22" : "#ef444422",
                      color: l.ok ? C.Low : C.High,
                      border: `1px solid ${l.ok ? C.Low : C.High}`,
                      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>
                      {l.ok ? "✅ Sent" : "❌ Failed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════
export default function App() {
  const [user,    setUser]    = useState(localStorage.getItem("gst_username") || "");
  const [role,    setRole]    = useState(localStorage.getItem("gst_role")     || "");
  const [tab,     setTab]     = useState("overview");
  const [online,  setOnline]  = useState(null);
  const [stats,   setStats]   = useState(null);
  const [dist,    setDist]    = useState(null);

  const handleLogin = (u, r) => { setUser(u); setRole(r); };

  const logout = () => {
    localStorage.clear();
    setUser(""); setRole(""); setStats(null);
  };

  // health + data polling
  useEffect(() => {
    if (!user) return;
    const check = () =>
      axios.get(`${API}/health`)
        .then(() => setOnline(true)).catch(() => setOnline(false));
    check();
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    if (!user || !online) return;
    axios.get(`${API}/stats`,        { headers: authH() }).then(r => setStats(r.data)).catch(() => {});
    axios.get(`${API}/distribution`, { headers: authH() }).then(r => setDist(r.data)).catch(() => {});
  }, [user, online]);

  if (!user || !token()) return <LoginPage onLogin={handleLogin} />;

  const TABS = [
    { id: "overview", label: "📊 Overview"       },
    { id: "flagged",  label: "🚨 Flagged"         },
    { id: "predict",  label: "🔍 Predict"         },
    { id: "explain",  label: "🤖 Explainable AI"  },
    { id: "email",    label: "📧 Email Alerts"    },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Segoe UI','Inter',sans-serif", color: C.text,
    }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            🛡️ GST Fraud Detection System
          </h1>
          <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Team JustFly · ITERYX'26 · Problem #29</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* API badge */}
          <span style={{
            background: online ? "#22c55e22" : "#ef444422",
            color: online ? C.Low : C.High,
            border: `1px solid ${online ? C.Low : C.High}`,
            padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
          }}>
            {online === null ? "Checking…" : online ? "✅ API Online" : "❌ API Offline"}
          </span>
          {/* User badge */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`,
            borderRadius: 20, padding: "4px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>👤</span>
            <span style={{ fontSize: 13, color: C.text }}>{user}</span>
            <span style={{ fontSize: 11, color: C.muted, background: C.bg,
              padding: "1px 8px", borderRadius: 20 }}>{role}</span>
            <button onClick={logout} style={{ background: "transparent", border: "none",
              color: C.muted, cursor: "pointer", fontSize: 12, padding: 0 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`,
        display: "flex", padding: "0 28px", gap: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: "none",
            borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
            color: tab === t.id ? C.blue : C.muted,
            padding: "12px 18px", cursor: "pointer", fontSize: 13,
            fontWeight: tab === t.id ? 600 : 400,
            fontFamily: "inherit", transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "28px 28px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "overview" && <OverviewTab stats={stats} distribution={dist} />}
        {tab === "flagged"  && <FlaggedTab />}
        {tab === "predict"  && <PredictTab />}
        {tab === "explain"  && <ExplainTab />}
        {tab === "email"    && <EmailTab />}
      </div>
    </div>
  );
}