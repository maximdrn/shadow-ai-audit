# Shadow AI Audit Tool

**Open-Source Model Risk Scanner**

A web-based tool that screens the top 500 Hugging Face models for commercial licensing risk, documentation quality gaps, publisher credibility signals, and EU AI Act regulatory exposure.

Built as part of an Independent Study Project at INSEAD on the topic of "Shadow AI" — the phenomenon of enterprises integrating open-source AI models without adequate risk verification.

## What It Does

- **License Risk Classification** — Categorizes each model into 5 tiers: Permissive, Conditional Commercial, Copyleft, Non-Commercial, and Unknown. Includes resolution logic for custom licenses tagged as "other."
- **Documentation Quality Scoring** — Evaluates model cards for completeness using keyword-based section detection across 6 categories (description, training data, intended use, evaluation, ethics, overall length).
- **Publisher Credibility Signals** — Surfaces trust indicators: organization type, verification status, portfolio size, license consistency, and maintenance recency.
- **EU AI Act Risk Flags** — Keyword-based screening for prohibited, high-risk, and limited-risk use cases defined by the EU AI Act.
- **Composite Risk Score** — Weighted combination of license (50%), documentation (30%), and publisher credibility (20%). EU flags excluded from composite as they are geography-specific.

## Getting Started

### Prerequisites

- Node.js 16+
- npm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/shadow-ai-audit.git
cd shadow-ai-audit
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Deployment

To deploy to Vercel:

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Deploy with default settings

## Data

The dataset (`src/data.js`) contains pre-scored metadata for 500 models extracted from the Hugging Face Hub API. The extraction notebook (`hf_extract.ipynb`) can be used to refresh the data.

## Methodology

See `Shadow_AI_Methodology_Framework.md` for the complete scoring methodology, including:
- License tier classification logic and edge cases
- Documentation quality keyword sets
- Publisher credibility signal definitions
- EU AI Act flag categories and keywords
- Composite score calculation and weighting rationale
- Methodological limitations

## Project Structure

```
shadow-ai-audit/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx          # Main application component
│   ├── data.js          # Pre-scored model dataset (500 models)
│   └── index.js         # React entry point
├── package.json
└── README.md
```

## License

MIT
