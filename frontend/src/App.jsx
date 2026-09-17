import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import {
  Zap, AlertTriangle, ShieldCheck, Activity, UploadCloud,
  FileSpreadsheet, Download, Search, Filter, RefreshCw,
  ExternalLink, BarChart3, Users, Eye, X, CheckCircle2,
  TrendingDown, Info, ChevronRight, Cpu
} from "lucide-react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "audit" | "consumer"
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [rawTimeSeries, setRawTimeSeries] = useState(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // "all" | "theft" | "normal" | "critical"
  const [modelInfoModal, setModelInfoModal] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  // Load demo data on first render
  useEffect(() => {
    loadDemoData();
    fetchModelInfo();
  }, []);

  const fetchModelInfo = async () => {
    try {
      const res = await axios.get(`${API_BASE}/model-info`);
      setModelInfo(res.data);
    } catch (err) {
      console.log("Model info offline", err);
    }
  };

  const loadDemoData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/demo-data`);
      setData(res.data);
      if (res.data.consumers && res.data.consumers.length > 0) {
        // Pick first theft consumer as default selection
        const firstTheft = res.data.consumers.find(c => c.prediction === 1) || res.data.consumers[0];
        setSelectedConsumer(firstTheft);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch demo data. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/predict-csv`, formData);
      setData(res.data);
      if (res.data.consumers && res.data.consumers.length > 0) {
        const firstTheft = res.data.consumers.find(c => c.prediction === 1) || res.data.consumers[0];
        setSelectedConsumer(firstTheft);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "CSV file analysis failed. Check file format.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // Fetch full raw 1034-day time series when a consumer is selected for deep dive
  const handleSelectConsumer = async (consumer) => {
    setSelectedConsumer(consumer);
    setRawLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/consumer-raw/${consumer.consumer_id}`);
      setRawTimeSeries(res.data.time_series);
    } catch (err) {
      // Fallback to downsampled if full raw fails
      setRawTimeSeries(null);
    } finally {
      setRawLoading(false);
    }
  };

  // Filter consumers for table
  const filteredConsumers = useMemo(() => {
    if (!data?.consumers) return [];
    return data.consumers.filter((c) => {
      const matchesSearch = c.consumer_id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (riskFilter === "theft") return c.prediction === 1;
      if (riskFilter === "normal") return c.prediction === 0;
      if (riskFilter === "critical") return c.risk_tier === "CRITICAL";
      return true;
    });
  }, [data, searchQuery, riskFilter]);

  // Risk breakdown stats for charts
  const riskDistributionData = useMemo(() => {
    if (!data?.consumers) return [];
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    data.consumers.forEach((c) => {
      if (counts[c.risk_tier] !== undefined) counts[c.risk_tier]++;
    });
    return [
      { tier: "Critical (>75%)", count: counts.CRITICAL, fill: "#f43f5e" },
      { tier: "High (50-75%)", count: counts.HIGH, fill: "#fb7185" },
      { tier: "Medium (30-50%)", count: counts.MEDIUM, fill: "#f59e0b" },
      { tier: "Low (<30%)", count: counts.LOW, fill: "#10b981" },
    ];
  }, [data]);

  // Export flagged consumers to CSV
  const handleExportCSV = () => {
    if (!data?.consumers) return;
    const flagged = data.consumers.filter(c => c.prediction === 1);
    const headers = "Consumer_ID,Prediction,Risk_Score_Pct,Risk_Tier,Mean_kWh,Zero_Days_Pct,Flags\n";
    const rows = flagged.map(c => 
      `"${c.consumer_id}","${c.label}",${c.theft_risk_score},"${c.risk_tier}",${c.metrics.mean_kwh},${c.metrics.zero_days_pct}%,"${c.metrics.anomaly_flags.join('; ')}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `voltguard_theft_audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="volt-app">
      {/* Header Bar */}
      <header className="volt-header">
        <div className="volt-brand">
          <div className="volt-logo-wrapper">
            <Zap className="volt-logo-icon" />
          </div>
          <div>
            <div className="volt-title-row">
              <h1 className="volt-title">VoltGuard</h1>
              <span className="volt-badge-sub">AI Smart Grid Security</span>
            </div>
            <p className="volt-subtitle">Electricity Consumption Analytics & Theft Detection System</p>
          </div>
        </div>

        <div className="volt-header-meta">
          <div className="status-pill">
            <span className="status-dot"></span>
            <span>XGBoost Engine Online</span>
          </div>

          <button 
            className="btn-ghost"
            onClick={() => setModelInfoModal(true)}
          >
            <Cpu size={16} />
            <span>Model Telemetry</span>
          </button>
        </div>
      </header>

      {/* Hero Control Strip */}
      <section className="control-strip glass-panel">
        <div className="control-actions">
          <label className="btn-primary file-input-label">
            <UploadCloud size={18} />
            <span>Upload Smart Meter CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden-file-input"
            />
          </label>

          <button
            className="btn-secondary"
            onClick={loadDemoData}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            <span>Load Demo Dataset (30 Consumers)</span>
          </button>

          {data && (
            <button
              className="btn-outline"
              onClick={handleExportCSV}
            >
              <Download size={17} />
              <span>Export Theft Audit ({data.theft_cases})</span>
            </button>
          )}
        </div>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* KPI Stats Strip */}
      {data && (
        <section className="stats-grid">
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap icon-cyan">
              <Users size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Consumers</span>
              <div className="stat-value">{data.total_consumers}</div>
              <span className="stat-note">1,034 Time-Series Days</span>
            </div>
          </div>

          <div className="stat-card glass-panel card-alert">
            <div className="stat-icon-wrap icon-red">
              <AlertTriangle size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Detected Theft Cases</span>
              <div className="stat-value text-red">{data.theft_cases}</div>
              <span className="stat-note font-semibold text-red">
                {data.theft_rate_pct}% of Grid Population
              </span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap icon-green">
              <ShieldCheck size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Normal Consumers</span>
              <div className="stat-value text-green">{data.normal_consumers}</div>
              <span className="stat-note">Verified Legitimate Load</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap icon-amber">
              <Activity size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Grid Risk Index</span>
              <div className="stat-value text-amber">{data.avg_theft_risk_score}%</div>
              <span className="stat-note">
                {data.has_ground_truth ? `Validation Accuracy: ${data.accuracy_pct}%` : "Avg Population Theft Score"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Main Navigation Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={18} />
          <span>Grid Trajectory & Dynamics</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <FileSpreadsheet size={18} />
          <span>Consumer Audit Table ({data?.consumers?.length || 0})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "consumer" ? "active" : ""}`}
          onClick={() => setActiveTab("consumer")}
        >
          <Eye size={18} />
          <span>Consumer Deep Dive</span>
        </button>
      </div>

      {/* TAB 1: GRID OVERVIEW & CHARTS */}
      {activeTab === "overview" && data && (
        <section className="dashboard-content">
          <div className="chart-panel glass-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">1,034-Day Aggregate Electricity Trajectory</h2>
                <p className="panel-desc">
                  Average daily consumption (kWh) comparing Legitimate Consumers (Green) vs. Theft Cases (Red) across 2014–2016
                </p>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-indicator legend-green">Normal Avg</span>
                <span className="legend-indicator legend-red">Theft Avg</span>
              </div>
            </div>

            <div className="chart-container-large">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={data.aggregate_trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorTheft" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.15)", borderRadius: 8 }}
                    labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="normal_avg" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNormal)" name="Normal Consumer Avg" />
                  <Area type="monotone" dataKey="theft_avg" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTheft)" name="Theft Consumer Avg" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts Row */}
          <div className="grid-two-col">
            <div className="glass-panel sub-chart-panel">
              <h3 className="panel-sub-title">Theft Risk Distribution</h3>
              <p className="panel-desc">Count of consumers across confidence threat tiers</p>
              <div className="chart-container-sm">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riskDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="tier" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.15)", borderRadius: 8 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel sub-chart-panel">
              <h3 className="panel-sub-title">Key Theft Anomaly Signatures</h3>
              <div className="anomalies-list">
                <div className="anomaly-item">
                  <div className="anomaly-icon-badge bg-rose">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <h4 className="anomaly-heading">Abrupt Sustained Load Collapse</h4>
                    <p className="anomaly-desc">Consumer usage plummets by &gt;60% mid-timeline, indicating physical shunt or meter bypass wire.</p>
                  </div>
                </div>

                <div className="anomaly-item">
                  <div className="anomaly-icon-badge bg-amber">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="anomaly-heading">Abnormal Zero-Reading Runs</h4>
                    <p className="anomaly-desc">Over 35% of total readings are flat zero while account is active, indicating intermittent disconnections.</p>
                  </div>
                </div>

                <div className="anomaly-item">
                  <div className="anomaly-icon-badge bg-cyan">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 className="anomaly-heading">Seasonal Decoupling</h4>
                    <p className="anomaly-desc">Loss of expected weather-induced heating/cooling consumption spikes observed in legitimate grid neighbors.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: AUDIT TABLE */}
      {activeTab === "audit" && data && (
        <section className="audit-section glass-panel">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search consumer ID hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <span className="filter-label"><Filter size={15} /> Filter:</span>
              <button
                className={`pill-btn ${riskFilter === "all" ? "active" : ""}`}
                onClick={() => setRiskFilter("all")}
              >
                All ({data.consumers.length})
              </button>
              <button
                className={`pill-btn pill-theft ${riskFilter === "theft" ? "active" : ""}`}
                onClick={() => setRiskFilter("theft")}
              >
                Theft Only ({data.theft_cases})
              </button>
              <button
                className={`pill-btn pill-normal ${riskFilter === "normal" ? "active" : ""}`}
                onClick={() => setRiskFilter("normal")}
              >
                Normal ({data.normal_consumers})
              </button>
              <button
                className={`pill-btn pill-critical ${riskFilter === "critical" ? "active" : ""}`}
                onClick={() => setRiskFilter("critical")}
              >
                Critical Risk
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="volt-table">
              <thead>
                <tr>
                  <th>Consumer ID</th>
                  <th>Classification</th>
                  <th>Risk Score</th>
                  <th>Risk Tier</th>
                  <th>Avg Daily kWh</th>
                  <th>Zero Days</th>
                  <th>Anomaly Flags</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumers.map((c) => (
                  <tr key={c.consumer_id} className={c.prediction === 1 ? "row-theft" : ""}>
                    <td className="font-mono text-cyan">{c.consumer_id}</td>
                    <td>
                      <span className={`badge ${c.prediction === 1 ? "badge-theft" : "badge-normal"}`}>
                        {c.prediction === 1 ? "THEFT DETECTED" : "NORMAL"}
                      </span>
                    </td>
                    <td>
                      <div className="risk-score-wrapper">
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${c.theft_risk_score}%`,
                              backgroundColor: c.theft_risk_score >= 70 ? "#f43f5e" : (c.theft_risk_score >= 40 ? "#f59e0b" : "#10b981")
                            }}
                          ></div>
                        </div>
                        <span className="risk-score-num">{c.theft_risk_score}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`tier-badge tier-${c.risk_tier.toLowerCase()}`}>
                        {c.risk_tier}
                      </span>
                    </td>
                    <td>{c.metrics.mean_kwh} kWh</td>
                    <td>{c.metrics.zero_days_pct}% ({c.metrics.zero_days_count}d)</td>
                    <td>
                      <div className="flags-wrap">
                        {c.metrics.anomaly_flags.length > 0 ? (
                          c.metrics.anomaly_flags.map((flag, i) => (
                            <span key={i} className="flag-chip">{flag}</span>
                          ))
                        ) : (
                          <span className="text-dim">None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn-table-action"
                        onClick={() => {
                          handleSelectConsumer(c);
                          setActiveTab("consumer");
                        }}
                      >
                        <Eye size={15} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: CONSUMER DEEP DIVE */}
      {activeTab === "consumer" && (
        <section className="consumer-detail-section">
          {selectedConsumer ? (
            <div className="glass-panel detail-container">
              {/* Header */}
              <div className="detail-header">
                <div>
                  <div className="detail-badge-row">
                    <span className={`badge ${selectedConsumer.prediction === 1 ? "badge-theft" : "badge-normal"}`}>
                      {selectedConsumer.prediction === 1 ? "FRAUD ALERT: THEFT DETECTED" : "VERIFIED NORMAL CONSUMER"}
                    </span>
                    <span className={`tier-badge tier-${selectedConsumer.risk_tier.toLowerCase()}`}>
                      Risk Tier: {selectedConsumer.risk_tier} ({selectedConsumer.theft_risk_score}%)
                    </span>
                  </div>
                  <h2 className="detail-id font-mono">ID: {selectedConsumer.consumer_id}</h2>
                </div>

                <div className="detail-selector">
                  <span className="text-muted">Select Consumer:</span>
                  <select
                    className="volt-select font-mono"
                    value={selectedConsumer.consumer_id}
                    onChange={(e) => {
                      const found = data?.consumers?.find(c => c.consumer_id === e.target.value);
                      if (found) handleSelectConsumer(found);
                    }}
                  >
                    {data?.consumers?.map(c => (
                      <option key={c.consumer_id} value={c.consumer_id}>
                        {c.prediction === 1 ? "🚨 [THEFT]" : "✅ [NORM]"} {c.consumer_id.slice(0, 16)}... ({c.theft_risk_score}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consumer Metrics Quick Bar */}
              <div className="consumer-metrics-strip">
                <div className="c-metric-card">
                  <span className="c-label">Mean Daily Usage</span>
                  <span className="c-val">{selectedConsumer.metrics.mean_kwh} <small>kWh/day</small></span>
                </div>
                <div className="c-metric-card">
                  <span className="c-label">Peak Consumption</span>
                  <span className="c-val">{selectedConsumer.metrics.max_kwh} <small>kWh</small></span>
                </div>
                <div className="c-metric-card">
                  <span className="c-label">Zero Reading Days</span>
                  <span className={`c-val ${selectedConsumer.metrics.zero_days_pct > 30 ? "text-red" : ""}`}>
                    {selectedConsumer.metrics.zero_days_pct}% <small>({selectedConsumer.metrics.zero_days_count} days)</small>
                  </span>
                </div>
                <div className="c-metric-card">
                  <span className="c-label">Volatility (Std Dev)</span>
                  <span className="c-val">±{selectedConsumer.metrics.std_kwh} <small>kWh</small></span>
                </div>
              </div>

              {/* Time Series Chart */}
              <div className="consumer-chart-block">
                <div className="chart-title-sub">
                  <h3>Individual 1,034-Day Consumption Timeline</h3>
                  <p className="panel-desc">
                    {rawTimeSeries ? "Full continuous daily meter readings with 30-day moving average" : "Downsampled temporal trajectory"}
                  </p>
                </div>

                <div className="chart-container-large">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={rawTimeSeries || selectedConsumer.metrics.downsampled_curve}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.15)", borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={rawTimeSeries ? "kwh" : "consumption"}
                        stroke={selectedConsumer.prediction === 1 ? "#f43f5e" : "#10b981"}
                        strokeWidth={1.8}
                        dot={false}
                        name="Daily kWh"
                      />
                      {rawTimeSeries && (
                        <Line
                          type="monotone"
                          dataKey="rolling_avg"
                          stroke="#38bdf8"
                          strokeWidth={2.2}
                          strokeDasharray="4 4"
                          dot={false}
                          name="30-Day Moving Avg"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Diagnostic Audit Conclusion */}
              <div className="audit-recommendation-box">
                <div className="rec-header">
                  <Info size={19} className="text-cyan" />
                  <h4>Automated Grid Audit Diagnosis</h4>
                </div>
                <div className="rec-content">
                  {selectedConsumer.prediction === 1 ? (
                    <>
                      <p>
                        This consumer has been flagged with a <strong>{selectedConsumer.theft_risk_score}% probability of illegal electricity abstraction</strong>.
                        Detected anomaly patterns:
                      </p>
                      <ul className="rec-bullets">
                        {selectedConsumer.metrics.anomaly_flags.map((f, i) => (
                          <li key={i}><strong>{f}</strong>: Detected during multi-year temporal cross-validation.</li>
                        ))}
                      </ul>
                      <div className="action-recommendation">
                        <strong>Field Action Recommendation:</strong> Dispatch utility inspection crew to inspect physical terminal seal, test meter shunt calibrations, and examine feeder connections for unauthorized bypass lines.
                      </div>
                    </>
                  ) : (
                    <p>
                      Consumer exhibits standard residential/commercial load profiles with normal seasonal variations and no prolonged abnormal zero runs. No audit action required.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state glass-panel">
              <Users size={36} className="text-muted" />
              <h3>No Consumer Selected</h3>
              <p>Please select a consumer from the Audit Table to view full time-series analytics.</p>
            </div>
          )}
        </section>
      )}

      {/* Model Telemetry Modal */}
      {modelInfoModal && (
        <div className="modal-backdrop" onClick={() => setModelInfoModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-center gap-2">
                <Cpu className="text-cyan" size={22} />
                <h3 className="modal-title">Model Specifications & Telemetry</h3>
              </div>
              <button className="modal-close" onClick={() => setModelInfoModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-k">Architecture</span>
                  <span className="meta-v">XGBoost (eXtreme Gradient Boosting)</span>
                </div>
                <div className="meta-item">
                  <span className="meta-k">Input Features</span>
                  <span className="meta-v">1,034 Daily Temporal Readings</span>
                </div>
                <div className="meta-item">
                  <span className="meta-k">Time Horizon</span>
                  <span className="meta-v">1/1/2014 to 10/31/2016 (34 Months)</span>
                </div>
                <div className="meta-item">
                  <span className="meta-k">Dataset Source</span>
                  <span className="meta-v">State Grid Corporation of China (SGCC)</span>
                </div>
              </div>

              <h4 className="meta-section-title">Validation Benchmark Metrics</h4>
              <div className="metrics-pill-grid">
                <div className="m-pill">
                  <span className="m-pill-val text-cyan">0.9616</span>
                  <span className="m-pill-label">ROC-AUC</span>
                </div>
                <div className="m-pill">
                  <span className="m-pill-val text-green">98.2%</span>
                  <span className="m-pill-label">Accuracy</span>
                </div>
                <div className="m-pill">
                  <span className="m-pill-val text-amber">97.0%</span>
                  <span className="m-pill-label">Precision (Theft)</span>
                </div>
                <div className="m-pill">
                  <span className="m-pill-val text-rose">83.0%</span>
                  <span className="m-pill-label">Recall (Theft)</span>
                </div>
              </div>

              <h4 className="meta-section-title">Detection Signatures</h4>
              <ul className="meta-list">
                <li>Abrupt drop in continuous moving average load without recovery</li>
                <li>Prolonged runs of zero-readings while neighboring grid feeds remain active</li>
                <li>Absence of temperature-correlated heating/cooling demand peaks</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;