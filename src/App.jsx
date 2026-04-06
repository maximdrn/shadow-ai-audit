import React, { useState, useMemo, useCallback } from "react";
import MODEL_DATA from "./data";

// ─── CONSTANTS ───
const TASKS = ["All Tasks","text-generation","image-text-to-text","sentence-similarity","automatic-speech-recognition","feature-extraction","fill-mask","text-classification","image-classification","time-series-forecasting","zero-shot-image-classification","text-ranking","text-to-speech","text-to-image","token-classification","translation","image-feature-extraction","image-to-text","object-detection","image-segmentation","image-to-video","audio-classification"];

const LICENSE_TIERS = {
  1: { label: "Permissive", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", explanation: "Full commercial use. Attribution only." },
  2: { label: "Conditional Commercial", color: "#ca8a04", bg: "#fefce8", border: "#fef08a", explanation: "Commercial use with restrictions. Legal review recommended." },
  3: { label: "Copyleft", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", explanation: "Derivative works must use same license. May require open-sourcing your code." },
  4: { label: "Non-Commercial", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", explanation: "Commercial use prohibited." },
  5: { label: "Unknown", color: "#991b1b", bg: "#fef2f2", border: "#fca5a5", explanation: "No license found. Cannot be used without explicit permission." },
};

const LICENSE_DETAILS = {
  "apache-2.0": "Must include license text and copyright notice. May modify and commercialize freely. Includes explicit patent grant.",
  "mit": "Extremely permissive. Must include copyright notice and license text. No patent grant \u2014 some patent risk for AI models.",
  "gpl-3.0": "Strong copyleft. Derivative works must also be GPL-3.0. Includes patent grant. Commercial use allowed but modifications must be open-sourced.",
  "agpl-3.0": "Strongest copyleft. Network use counts as distribution. Derivative works must be AGPL-3.0.",
  "cc-by-nc-4.0": "Non-commercial only. May share and adapt with attribution, but cannot use for commercial purposes.",
  "cc-by-nc-sa-4.0": "Non-commercial, share-alike. Derivatives must use the same license and cannot be commercial.",
  "cc-by-4.0": "Permissive Creative Commons. Commercial use allowed with attribution.",
  "llama3.1": "Free for commercial use under 700M monthly active users. Cannot use outputs to train non-Llama models. Must display 'Built with Llama' branding.",
  "llama3.2": "Free for commercial use under 700M monthly active users. Cannot use outputs to train non-Llama models. Must display 'Built with Llama' branding.",
  "llama3": "Free for commercial use under 700M monthly active users. Restrictions on competitive model training.",
  "llama2": "Free for commercial use under 700M monthly active users. Cannot use outputs to train other LLMs.",
  "gemma": "Free for commercial use. Derivatives trained on Gemma outputs become Gemma derivatives subject to this license.",
  "creativeml-openrail-m": "Permissive with use-based restrictions on harmful applications. Review acceptable use policy before deployment.",
  "bsd-3-clause": "Permissive. Requires attribution. Cannot use project name for endorsement without permission.",
};

const KNOWN_PUBLISHERS = new Set(["meta-llama","openai","google","microsoft","mistralai","deepseek-ai","stabilityai","bigscience","eleutherai","alibaba-nlp","tiiuae","01-ai","Qwen","cohere","sentence-transformers","facebook","huggingface","nvidia","salesforce","databricks","allenai","apple","amazon","google-bert","openai-community","HuggingFaceH4","NousResearch","black-forest-labs","CompVis","Alibaba-NLP"]);

const LICENSE_FILTERS = ["All", "Permissive", "Conditional Commercial", "Copyleft", "Non-Commercial", "Unknown"];
const SORT_OPTIONS = [
  { value: "composite", label: "Composite Score" },
  { value: "license", label: "License Risk" },
  { value: "doc", label: "Documentation Quality" },
  { value: "publisher", label: "Publisher Credibility" },
  { value: "downloads", label: "Downloads" },
  { value: "recency", label: "Last Updated" },
];

// ─── HELPERS ───
function getDocLabel(score) {
  if (score >= 80) return { label: "Well-Documented", color: "#16a34a", bg: "#f0fdf4" };
  if (score >= 50) return { label: "Partially Documented", color: "#ca8a04", bg: "#fefce8" };
  if (score >= 20) return { label: "Poorly Documented", color: "#ea580c", bg: "#fff7ed" };
  return { label: "Undocumented", color: "#dc2626", bg: "#fef2f2" };
}

function getCompositeLabel(score) {
  if (score >= 75) return { label: "Low Risk", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  if (score >= 50) return { label: "Moderate Risk", color: "#ca8a04", bg: "#fefce8", border: "#fef08a" };
  if (score >= 25) return { label: "High Risk", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" };
  return { label: "Critical Risk", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
}

function formatDownloads(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

function timeAgo(dateStr) {
  if (!dateStr) return "Unknown";
  const now = new Date();
  const d = new Date(dateStr);
  const months = Math.round((now - d) / (1000 * 60 * 60 * 24 * 30));
  if (months <= 1) return "Updated this month";
  if (months <= 6) return "Updated " + months + " months ago";
  return "Updated " + months + " months ago \u26a0\ufe0f";
}

// ─── COMPONENTS ───
function InfoIcon({ content, title }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ background: open ? "#2563eb" : "transparent", border: "1.5px solid #2563eb", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "'Source Serif 4', serif", fontSize: 11, fontWeight: 700, color: open ? "#fff" : "#2563eb", transition: "all 0.2s", verticalAlign: "middle", lineHeight: 1 }}
        aria-label={"Info about " + title}>i</button>
      {open && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 28, left: -140, width: 320, background: "#fff", border: "1px solid #e8e5e0", borderRadius: 8, padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 1000, fontSize: 12.5, lineHeight: 1.6, color: "#6b6560", fontFamily: "'Source Serif 4', serif" }}>
          <div style={{ fontWeight: 700, color: "#1a1715", marginBottom: 6, fontSize: 13 }}>{title}</div>
          <div>{content}</div>
          <button onClick={() => setOpen(false)} style={{ marginTop: 8, background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace", padding: 0 }}>Close</button>
        </div>
      )}
    </span>
  );
}

function Pill({ label, color, bg, border, small }) {
  return <span style={{ display: "inline-block", padding: small ? "2px 8px" : "3px 10px", borderRadius: 4, fontSize: small ? 10.5 : 11.5, fontWeight: 600, fontFamily: "'DM Mono', monospace", color, background: bg, border: "1px solid " + (border || bg), letterSpacing: 0.3, whiteSpace: "nowrap" }}>{label}</span>;
}

function ScoreBar({ score, max = 100, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#e8e5e0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: (score / max) * 100 + "%", height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6b6560", minWidth: 28 }}>{score}</span>
    </div>
  );
}

function LimitationsPanel({ open, onClose }) {
  if (!open) return null;
  const items = [
    { t: "Data is self-reported", d: "All information comes from metadata published by model authors on Hugging Face. Licenses may be inaccurate, model cards may be incomplete, and lineage information is frequently missing." },
    { t: "Keyword matching has blind spots", d: "Documentation quality scores and EU AI Act flags are generated by searching for specific keywords. Unusual phrasing not in our keyword sets will be missed." },
    { t: "This is a snapshot, not a live feed", d: "The dataset was extracted at a specific point in time. Always verify current information on Hugging Face before making a procurement decision." },
    { t: "Scope limited to Hugging Face", d: "The open-source AI ecosystem extends to GitHub, TensorFlow Hub, and other platforms. This tool covers Hugging Face as the dominant model distribution platform." },
    { t: "No behavioral testing", d: "This tool analyzes metadata and documentation. It does not test what a model actually does." },
    { t: "Not legal advice", d: "This tool is a risk-screening aid. Consult qualified legal professionals before making procurement decisions." },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", maxWidth: 600, width: "90%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", fontFamily: "'Source Serif 4', serif" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Methodology & Limitations</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b6560" }}>What this tool can and cannot do.</p>
        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1715", marginBottom: 3 }}>{i + 1}. {item.t}</div>
            <div style={{ fontSize: 12.5, color: "#6b6560", lineHeight: 1.6 }}>{item.d}</div>
          </div>
        ))}
        <button onClick={onClose} style={{ marginTop: 8, padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>Close</button>
      </div>
    </div>
  );
}

// ─── MODEL DETAIL ───
function ModelDetail({ model, onBack }) {
  const tierInfo = LICENSE_TIERS[model.lic_tier];
  const docLabel = getDocLabel(model.doc_total);
  const compositeLabel = getCompositeLabel(model.composite);
  const licDetail = LICENSE_DETAILS[model.license] || null;
  const isKnown = model.is_known || KNOWN_PUBLISHERS.has(model.author);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 13, fontFamily: "'DM Mono', monospace", padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>{"\u2190"} Back to results</button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5, fontFamily: "'Source Serif 4', serif" }}>{model.id}</h2>
          <div style={{ fontSize: 13, color: "#6b6560", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
            {model.pipeline_tag || "untagged"} {"\u00b7"} {formatDownloads(model.downloads)} downloads {"\u00b7"} {model.likes} likes
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Pill label={compositeLabel.label} color={compositeLabel.color} bg={compositeLabel.bg} border={compositeLabel.border} />
          <span style={{ fontSize: 20, fontWeight: 700, color: compositeLabel.color, fontFamily: "'DM Mono', monospace" }}>{model.composite}</span>
        </div>
      </div>

      <section style={{ background: tierInfo.bg, border: "1px solid " + tierInfo.border, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>License Risk</h3>
          <Pill label={tierInfo.label} color={tierInfo.color} bg={tierInfo.color + "15"} border={tierInfo.color} small />
          <InfoIcon title="License Risk" content="Models classified into 5 tiers: Permissive, Conditional Commercial, Copyleft, Non-Commercial, and Unknown. Uses the license tag from Hugging Face metadata with resolution for custom licenses tagged as 'other'." />
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 13.5, color: tierInfo.color, fontWeight: 600 }}>{tierInfo.explanation}</p>
        <div style={{ fontSize: 12.5, color: "#6b6560", lineHeight: 1.6, fontFamily: "'DM Mono', monospace" }}>
          <div>License identifier: <strong>{model.license || "none"}</strong>{model.license_name ? " \u2014 \"" + model.license_name + "\"" : ""}</div>
          {model.gated && <div style={{ marginTop: 4, color: "#ca8a04" }}>{"\u26a0"} Gated model {"\u2014"} access requires accepting additional terms before download.</div>}
          {model.lic_note && <div style={{ marginTop: 4, fontStyle: "italic" }}>{model.lic_note}</div>}
          {licDetail && <div style={{ marginTop: 8, fontFamily: "'Source Serif 4', serif", fontSize: 13 }}>{licDetail}</div>}
          {model.base_model && <div style={{ marginTop: 8, color: "#ea580c" }}>{"\u26a0"} Lineage: Base model is <strong>{typeof model.base_model === "string" ? model.base_model : JSON.stringify(model.base_model)}</strong>. If the base has a more restrictive license, the effective license may differ.</div>}
          {model.license_link && <a href={model.license_link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, color: "#2563eb", fontSize: 12 }}>View full license text {"\u2192"}</a>}
        </div>
      </section>

      <section style={{ background: "#fff", border: "1px solid #e8e5e0", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>Documentation Quality</h3>
          <Pill label={docLabel.label + " (" + model.doc_total + "/100)"} color={docLabel.color} bg={docLabel.bg} small />
          <InfoIcon title="Documentation Quality" content="Scored by checking for key sections in the model card using expanded keyword matching: description, training data, intended use, evaluation results, bias/ethics, and overall length." />
        </div>
        {[
          { key: "exists", label: "Model card exists", max: 10 },
          { key: "description", label: "Model description", max: 15 },
          { key: "training", label: "Training data disclosure", max: 20 },
          { key: "intended_use", label: "Intended use & limitations", max: 15 },
          { key: "evaluation", label: "Evaluation results", max: 10 },
          { key: "ethics", label: "Bias & ethical considerations", max: 15 },
          { key: "length", label: "Card length", max: 15 },
        ].map(({ key, label, max }) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#6b6560", marginBottom: 3 }}>
              <span>{(model.doc_bd && model.doc_bd[key] > 0) ? "\u2713" : "\u2717"} {label}</span>
              <span>{(model.doc_bd && model.doc_bd[key]) || 0}/{max}</span>
            </div>
            <ScoreBar score={(model.doc_bd && model.doc_bd[key]) || 0} max={max} color={(model.doc_bd && model.doc_bd[key] > 0) ? "#16a34a" : "#e5e7eb"} />
          </div>
        ))}
      </section>

      <section style={{ background: "#fff", border: "1px solid #e8e5e0", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>Publisher Credibility</h3>
          <InfoIcon title="Publisher Credibility" content="Displays raw trust signals: organization type, verification, portfolio size, license consistency, and maintenance recency." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          <div>
            <div style={{ color: "#6b6560", fontSize: 11, marginBottom: 2 }}>Publisher</div>
            <div style={{ fontWeight: 600 }}>{model.author} {model.is_org ? "(Org)" : "(Individual)"} {model.verified && <span style={{ color: "#16a34a" }}>{"\u2713"} Verified</span>}</div>
          </div>
          <div>
            <div style={{ color: "#6b6560", fontSize: 11, marginBottom: 2 }}>Known Publisher</div>
            <div style={{ color: isKnown ? "#16a34a" : "#6b6560", fontWeight: 600 }}>{isKnown ? "Yes \u2014 Established AI Publisher" : "No"}</div>
          </div>
          <div>
            <div style={{ color: "#6b6560", fontSize: 11, marginBottom: 2 }}>Portfolio</div>
            <div style={{ fontWeight: 600 }}>{model.org_model_count} models published</div>
          </div>
          <div>
            <div style={{ color: "#6b6560", fontSize: 11, marginBottom: 2 }}>License practices</div>
            <div style={{ color: model.org_license_pct >= 0.8 ? "#16a34a" : model.org_license_pct >= 0.5 ? "#ca8a04" : "#dc2626", fontWeight: 600 }}>{Math.round(model.org_license_pct * 100)}% clearly licensed</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ color: "#6b6560", fontSize: 11, marginBottom: 2 }}>Maintenance</div>
            <div style={{ color: model.months_ago <= 6 ? "#1a1715" : "#ca8a04", fontWeight: 600 }}>{timeAgo(model.last_modified)}</div>
          </div>
        </div>
      </section>

      {model.eu_flags && model.eu_flags.length > 0 && (
        <section style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>EU AI Act Flags</h3>
            <InfoIcon title="EU AI Act Flags" content="Keyword-based screening for regulated AI use cases. A flag means 'investigate further,' not 'this model is illegal.' Excluded from composite score." />
          </div>
          {model.eu_flags.map((flag, i) => (
            <div key={i} style={{ marginBottom: i < model.eu_flags.length - 1 ? 10 : 0 }}>
              <Pill label={flag.level} color={flag.level === "Prohibited" ? "#dc2626" : flag.level === "High-Risk" ? "#ea580c" : "#ca8a04"} bg={flag.level === "Prohibited" ? "#fef2f2" : flag.level === "High-Risk" ? "#fff7ed" : "#fefce8"} border={flag.level === "Prohibited" ? "#fecaca" : flag.level === "High-Risk" ? "#fed7aa" : "#fef08a"} small />
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600 }}>{flag.category}</span>
              <div style={{ fontSize: 11.5, color: "#6b6560", marginTop: 3, fontFamily: "'DM Mono', monospace" }}>Matched: {flag.matched.join(", ")}</div>
            </div>
          ))}
          <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#6b6560", fontStyle: "italic", lineHeight: 1.5 }}>A flag does not mean this model is illegal. Conduct a proper compliance assessment before deploying in the EU.</p>
        </section>
      )}

      <a href={"https://huggingface.co/" + model.id} target="_blank" rel="noopener noreferrer"
        style={{ display: "inline-block", padding: "10px 20px", background: "#1a1715", color: "#faf9f7", borderRadius: 6, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600, textDecoration: "none" }}>
        View on Hugging Face {"\u2192"}
      </a>
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [selectedTask, setSelectedTask] = useState("All Tasks");
  const [licenseFilter, setLicenseFilter] = useState("All");
  const [euFilter, setEuFilter] = useState(false);
  const [sortBy, setSortBy] = useState("composite");
  const [sortDir, setSortDir] = useState("desc");
  const [searchText, setSearchText] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [showLimitations, setShowLimitations] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const filtered = useMemo(() => {
    let result = MODEL_DATA;
    if (selectedTask !== "All Tasks") result = result.filter(m => m.pipeline_tag === selectedTask);
    if (licenseFilter !== "All") {
      const tierMap = { "Permissive": 1, "Conditional Commercial": 2, "Copyleft": 3, "Non-Commercial": 4, "Unknown": 5 };
      result = result.filter(m => m.lic_tier === tierMap[licenseFilter]);
    }
    if (euFilter) result = result.filter(m => m.eu_flags && m.eu_flags.length > 0);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(m => m.id.toLowerCase().includes(q) || m.author.toLowerCase().includes(q));
    }
    const dir = sortDir === "desc" ? -1 : 1;
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "composite": return (b.composite - a.composite) * dir;
        case "license": return (a.lic_tier - b.lic_tier) * dir;
        case "doc": return (b.doc_total - a.doc_total) * dir;
        case "publisher": return (b.pub_total - a.pub_total) * dir;
        case "downloads": return (b.downloads - a.downloads) * dir;
        case "recency": return (new Date(b.last_modified) - new Date(a.last_modified)) * dir;
        default: return 0;
      }
    });
    return result;
  }, [selectedTask, licenseFilter, euFilter, sortBy, sortDir, searchText]);

  const paged = useMemo(() => filtered.slice(0, (page + 1) * PAGE_SIZE), [filtered, page]);
  const unknownCount = filtered.filter(m => m.lic_tier === 5).length;

  const resetFilters = useCallback(() => {
    setSelectedTask("All Tasks"); setLicenseFilter("All"); setEuFilter(false);
    setSearchText(""); setSortBy("composite"); setSortDir("desc"); setPage(0);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", fontFamily: "'Source Serif 4', serif", color: "#1a1715" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        select, input { font-family: 'DM Mono', monospace; }
        select:focus, input:focus { outline: 2px solid #2563eb; outline-offset: -1px; }
        button:hover { opacity: 0.85; }
      `}</style>

      <LimitationsPanel open={showLimitations} onClose={() => setShowLimitations(false)} />

      <header style={{ padding: "28px 32px 24px", borderBottom: "1px solid #e8e5e0", background: "#fff" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#2563eb", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>Shadow AI Audit</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15 }}>Open-Source Model Risk Scanner</h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b6560", maxWidth: 560 }}>
                Screening {MODEL_DATA.length} top Hugging Face models for commercial licensing risk, documentation gaps, publisher credibility, and EU AI Act exposure.
              </p>
            </div>
            <button onClick={() => setShowLimitations(true)} style={{ padding: "8px 16px", background: "#fff", border: "1.5px solid #e8e5e0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#6b6560", fontWeight: 500, whiteSpace: "nowrap" }}>
              Methodology & Limitations
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 32px 64px" }}>
        {selectedModel ? (
          <ModelDetail model={selectedModel} onBack={() => setSelectedModel(null)} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6b6560", display: "block", marginBottom: 4 }}>Task</label>
                <select value={selectedTask} onChange={e => { setSelectedTask(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e8e5e0", borderRadius: 6, background: "#fff", fontSize: 12.5, color: "#1a1715" }}>
                  {TASKS.map(t => <option key={t} value={t}>{t === "All Tasks" ? t : t + " (" + MODEL_DATA.filter(m => m.pipeline_tag === t).length + ")"}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6b6560", display: "block", marginBottom: 4 }}>
                  License Tier <InfoIcon title="License Filter" content="Permissive = full commercial use. Conditional = restrictions apply. Copyleft = must open-source derivatives. Non-Commercial = no commercial use. Unknown = no license found." />
                </label>
                <select value={licenseFilter} onChange={e => { setLicenseFilter(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e8e5e0", borderRadius: 6, background: "#fff", fontSize: 12.5, color: "#1a1715" }}>
                  {LICENSE_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6b6560", display: "block", marginBottom: 4 }}>
                  Sort By <InfoIcon title="Sort Options" content="Composite score combines license (50%), documentation (30%), publisher (20%). EU AI Act flags excluded from composite. Sort by any individual dimension." />
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ flex: 1, padding: "8px 10px", border: "1.5px solid #e8e5e0", borderRadius: 6, background: "#fff", fontSize: 12.5, color: "#1a1715" }}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    style={{ padding: "8px 10px", border: "1.5px solid #e8e5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, color: "#1a1715" }}>
                    {sortDir === "desc" ? "\u2193" : "\u2191"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={() => setEuFilter(f => !f)}
                  style={{ padding: "8px 14px", background: euFilter ? "#fef2f2" : "#fff", border: "1.5px solid " + (euFilter ? "#fecaca" : "#e8e5e0"), borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", color: euFilter ? "#dc2626" : "#6b6560", fontWeight: euFilter ? 600 : 400, whiteSpace: "nowrap" }}>
                  {euFilter ? "\u2713 EU Flags" : "EU Flags"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <input type="text" placeholder="Search models or publishers..." value={searchText}
                onChange={e => { setSearchText(e.target.value); setPage(0); }}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e8e5e0", borderRadius: 6, background: "#fff", fontSize: 13, color: "#1a1715" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, fontSize: 12.5, fontFamily: "'DM Mono', monospace", color: "#6b6560", flexWrap: "wrap", gap: 8 }}>
              <span>{filtered.length} model{filtered.length !== 1 ? "s" : ""} found {"\u00b7"} showing {Math.min(paged.length, filtered.length)}</span>
              <div style={{ display: "flex", gap: 12 }}>
                {unknownCount > 0 && <span style={{ color: "#dc2626" }}>{unknownCount} with no recognizable license</span>}
                {(selectedTask !== "All Tasks" || licenseFilter !== "All" || euFilter || searchText) && (
                  <button onClick={resetFilters} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", padding: 0 }}>Clear filters</button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paged.map(model => {
                const tierInfo = LICENSE_TIERS[model.lic_tier];
                const docLbl = getDocLabel(model.doc_total);
                const compositeLabel = getCompositeLabel(model.composite);

                return (
                  <div key={model.id} onClick={() => setSelectedModel(model)}
                    style={{ background: "#fff", border: "1px solid #e8e5e0", borderRadius: 10, padding: "16px 20px", cursor: "pointer", transition: "all 0.15s", borderLeft: "4px solid " + compositeLabel.color }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "#e8e5e0"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{model.id}</span>
                          {model.is_known && <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: 3 }}>Known Publisher</span>}
                          {model.gated && <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#ca8a04", background: "#fefce8", padding: "1px 6px", borderRadius: 3 }}>Gated</span>}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#6b6560" }}>
                          {model.pipeline_tag || "untagged"} {"\u00b7"} {formatDownloads(model.downloads)} downloads {"\u00b7"} {timeAgo(model.last_modified)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <Pill label={tierInfo.label} color={tierInfo.color} bg={tierInfo.bg} border={tierInfo.border} small />
                        <Pill label={docLbl.label} color={docLbl.color} bg={docLbl.bg} small />
                        {model.eu_flags && model.eu_flags.length > 0 && (
                          <Pill label={"EU: " + model.eu_flags[0].level} color={model.eu_flags[0].level === "Prohibited" ? "#dc2626" : model.eu_flags[0].level === "High-Risk" ? "#ea580c" : "#ca8a04"} bg={model.eu_flags[0].level === "Prohibited" ? "#fef2f2" : model.eu_flags[0].level === "High-Risk" ? "#fff7ed" : "#fefce8"} small />
                        )}
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: compositeLabel.bg, border: "1.5px solid " + compositeLabel.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: compositeLabel.color, fontFamily: "'DM Mono', monospace" }}>
                          {model.composite}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {paged.length < filtered.length && (
              <button onClick={() => setPage(p => p + 1)}
                style={{ display: "block", margin: "20px auto", padding: "10px 24px", background: "#fff", border: "1.5px solid #e8e5e0", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#6b6560" }}>
                Load more ({filtered.length - paged.length} remaining)
              </button>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#6b6560", fontSize: 14 }}>No models match your current filters.</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
