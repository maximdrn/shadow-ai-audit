# Shadow AI Audit Tool — Scoring Methodology Framework

## 1. Purpose & Scope

This document defines the complete analytical framework behind the tool. Every score, classification, and flag the user sees is derived from the logic described here. The goal is to enable a CTO or VP Engineering at a scale-up to search for open-source AI models by task, and immediately understand the commercial risk profile — without needing to read license text, parse model cards, or assess publisher credibility themselves.

**What this tool is:** A risk-screening layer for the open-source AI supply chain. It answers the question: *"Can we safely use this model in a commercial product?"*

**What this tool is not:** Legal advice. The tool surfaces risk signals and categorizes them. It does not replace legal counsel for final procurement decisions.

---

## 2. Data Source & Extraction

**Source:** Hugging Face Hub API (`huggingface_hub` Python library)

**Population:** Top 5,000 models by total download count. This captures the models most likely to be evaluated or already in use at any given company. Long-tail models with minimal downloads are excluded — they represent low adoption risk.

**Fields extracted per model:**

| Field | API Source | Purpose |
|---|---|---|
| `model_id` | `modelId` | Unique identifier |
| `author` | `author` | Publisher identification |
| `license` | `cardData.license` or `tags` | License classification |
| `license_name` | `cardData.license_name` | Custom license identification |
| `pipeline_tag` | `pipeline_tag` | Task category (e.g., text-generation, image-classification) |
| `downloads` | `downloads` | Adoption signal |
| `likes` | `likes` | Community validation signal |
| `last_modified` | `lastModified` | Maintenance recency |
| `tags` | `tags` | Library compatibility, language, domain |
| `card_data` (full) | `cardData` | Model card metadata completeness |
| `model_card_text` | Via `ModelCard.load()` | Raw model card for documentation scoring |
| `siblings` | `siblings` | File manifest (to detect README presence, license files) |
| `gated` | `gated` | Whether access is restricted behind terms |

**Extraction logic:** A Python script using `huggingface_hub.list_models(sort="downloads", direction=-1, limit=5000, full=True, cardData=True)` retrieves the base metadata. For documentation scoring, the script then calls `ModelCard.load(model_id)` on each model to retrieve the full model card text. Output is a single JSON file that serves as the static dataset for the frontend.

---

## 3. Scoring Dimension 1: License Risk

This is the highest-priority dimension. It answers: *"If we ship a product built on this model, what is our legal exposure?"*

### 3.1 License Tier Classification

Every model is classified into one of five tiers:

| Tier | Label | Color | Definition | Examples |
|---|---|---|---|---|
| 1 | **Permissive** | Green | Full commercial use. Modify, distribute, sublicense with minimal obligations (attribution only). Includes explicit patent grants where applicable. | Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense, OpenMDW, AFL-3.0 |
| 2 | **Conditional Commercial** | Yellow | Commercial use allowed, but with meaningful restrictions — user caps, output usage limitations, branding requirements, or acceptable use policies that constrain deployment. | Llama 3/3.1 Community License, Gemma Terms of Use, Qwen License, DeepSeek License |
| 3 | **Copyleft** | Orange | Commercial use technically possible, but derivative works must be distributed under the same license. This can force disclosure of proprietary modifications — a serious concern for most commercial applications. | GPL-2.0, GPL-3.0, AGPL-3.0, LGPL-2.1, LGPL-3.0, CC-BY-SA-4.0, MPL-2.0 |
| 4 | **Non-Commercial** | Red | Explicitly prohibits commercial use. | CC-BY-NC-4.0, CC-BY-NC-SA-4.0, CC-BY-NC-ND-4.0, RAIL (most variants), Stability AI Non-Commercial |
| 5 | **Unknown / Missing** | Dark Red | No license specified, or license marked as "other" without a linked license file. Legally, this defaults to full copyright — no permissions granted. | (no license tag), `other` without `license_name` |

### 3.2 Classification Logic & Edge Cases

The classification is not a simple string match. Several edge cases require additional logic:

**Edge Case A: "Other" licenses.** When `license == "other"`, the tool applies a two-step resolution process:

1. **Attempted reclassification.** The tool checks the `license_name` metadata field, which contains the publisher's free-text description of their license (e.g., "Llama 3 Community License", "Gemma Terms of Use"). This name is matched against a lookup table of known custom licenses mapped to tiers. If a match is found, the model is reclassified into the appropriate tier (typically Tier 2, Conditional Commercial) and the UI displays a note: *"This model was tagged as 'other' but its stated license name matches [X], which we classify as [Tier Label]."*

2. **True unknowns.** If `license_name` is absent, empty, or does not match any known license, the model remains Tier 5 (Unknown). The UI surfaces whatever information is available to support manual review:
   - The custom `license_name` string, if present (e.g., *"License: Other — 'coqui-public-model-license'"*).
   - A link to the full license text via `license_link`, if provided by the publisher (e.g., *"[View full license](link)"*).
   - If neither `license_name` nor `license_link` is available: *"License: Unknown — no license information provided. Legally defaults to full copyright (no permissions granted)."*

   The dashboard also displays an aggregate count of "true unknown" models within any search or filter result set, so users can assess the overall documentation quality of models in a given task category. For example: *"12 of 47 text-generation models have no recognizable license."*

**Edge Case B: Gated models.** Models behind a "gated" access wall (requiring acceptance of terms before download) receive a flag regardless of their stated license, because the gating terms may impose additional restrictions not captured in the license tag.

**Edge Case C: Derived model lineage.** This is the Vicuna problem — a model may claim Apache-2.0, but if it is a fine-tune of a base model with a more restrictive license (e.g., original LLaMA), the effective license is the more restrictive one. The tool flags models where the `base_model` tag references a model with a different (more restrictive) license tier. **This is surfaced as a warning, not an automatic reclassification**, because lineage data on Hugging Face is incomplete and often self-reported.

**Edge Case D: RAIL licenses.** Responsible AI Licenses (RAIL, OpenRAIL, BigScience OpenRAIL-M) are complex. They are technically permissive for many use cases but include use-based restrictions (e.g., prohibiting use for surveillance, misinformation, or military applications). These are classified as Tier 2 (Conditional Commercial) with a specific note about use restrictions, rather than Tier 1, because the restrictions require legal review for any specific deployment context.

### 3.3 User-Facing Display

License risk is **not** displayed as a numeric score. A number out of 100 does not help a decision-maker understand whether they can use a model commercially. Instead, the tool displays the tier label, a color indicator, and a plain-language one-liner explaining the practical implication:

| Tier | Label | Color | User-Facing Explanation |
|---|---|---|---|
| 1 | **Permissive** | Green | "Full commercial use. Attribution only." |
| 2 | **Conditional Commercial** | Yellow | "Commercial use with restrictions. Legal review recommended." |
| 3 | **Copyleft** | Orange | "Derivative works must use same license. May require open-sourcing your code." |
| 4 | **Non-Commercial** | Red | "Commercial use prohibited." |
| 5 | **Unknown / Missing** | Dark Red | "No license found. Cannot be used without explicit permission." |

### 3.4 Internal Numeric Mapping (Composite Score Only)

For the purposes of computing the composite risk score (Section 7), each tier is mapped to a numeric value. This mapping is **not shown to the user** — it exists only to enable sorting and ranking across the four scoring dimensions.

| Tier | Internal Value |
|---|---|
| 1 — Permissive | 100 |
| 2 — Conditional Commercial | 70 |
| 3 — Copyleft | 40 |
| 4 — Non-Commercial | 10 |
| 5 — Unknown / Missing | 0 |

These values are configurable parameters, not fixed truths. An organization with a different risk tolerance could adjust them — for example, a startup comfortable with Llama's terms might treat Conditional Commercial as equivalent to Permissive, while a company selling to EU government clients might weight Copyleft closer to Non-Commercial. The tool's value lies in the classification framework, not in any one set of numeric weights.

---

## 4. Scoring Dimension 2: Documentation Quality

This dimension answers: *"How much can we trust what we know about this model?"* Poor documentation is an independent risk factor — it means the organization cannot perform adequate due diligence, regardless of the license.

### 4.1 Scoring Approach

The documentation score is based on the **presence and substantiveness** of key sections in the model card. The tool uses an expanded keyword matching approach: for each documentation category, we define a broad set of synonyms, alternate phrasings, and common variations to account for the fact that model cards do not follow a standard template. The tool searches both markdown headers and body text.

A match is only counted if the surrounding content is **substantive** — meaning the matched keyword appears in a passage of at least 50 characters of non-boilerplate text. This prevents false positives from empty section headers or placeholder text.

### 4.2 Scoring Rubric with Keyword Sets

| Check | Weight | What It Measures | Keywords / Phrases Searched |
|---|---|---|---|
| **Model card exists** | 10 | Binary: does a README.md exist with any content beyond metadata? | *(structural check, not keyword-based)* |
| **Model description** | 15 | Does the card explain what the model does, its architecture, and intended use? | `model details`, `model description`, `model summary`, `model overview`, `about this model`, `what is this`, `architecture`, `this model is`, `this is a`, `model type`, `base model`, `fine-tuned`, `fine-tune of`, `variant of`, `based on`, `built on`, `checkpoint` |
| **Training data disclosure** | 20 | Does the card identify the training datasets? This is the single most important documentation element for risk — without it, you cannot assess IP contamination, bias, or regulatory exposure. | `training data`, `training dataset`, `training corpus`, `trained on`, `trained with`, `training set`, `fine-tuned on`, `fine-tuned with`, `finetuned on`, `data sources`, `datasets used`, `data used`, `pre-training data`, `pretraining data`, `data composition`, `data collection`, `data preparation`, `curated from`, `sourced from`, `compiled from`, plus the `datasets` field in card metadata |
| **Intended use & limitations** | 15 | Does the card specify what the model should and should not be used for? | `intended use`, `intended for`, `designed for`, `use case`, `use cases`, `usage`, `how to use`, `getting started`, `limitations`, `limitation`, `out of scope`, `out-of-scope`, `not intended`, `not designed`, `should not be used`, `not suitable`, `not recommended`, `known issues`, `caveats`, `restrictions`, `scope` |
| **Evaluation results** | 10 | Does the card report benchmark results or evaluation metrics? | `evaluation`, `eval results`, `benchmark`, `benchmarks`, `performance`, `accuracy`, `f1 score`, `f1-score`, `bleu`, `rouge`, `perplexity`, `metrics`, `results`, `test set`, `test results`, `evaluation results`, `model performance`, `scores`, `leaderboard`, plus the `metrics` and `eval_results` fields in card metadata |
| **Bias & ethical considerations** | 15 | Does the card address potential biases or ethical risks? Increasingly important under the EU AI Act. | `bias`, `biases`, `fairness`, `ethical`, `ethics`, `ethical considerations`, `risks`, `risk`, `social impact`, `societal impact`, `environmental impact`, `carbon`, `co2`, `emissions`, `responsible`, `responsible use`, `safety`, `harm`, `harms`, `potential harm`, `misuse`, `dual use`, `sensitive`, `controversial`, `discrimination`, `stereotype`, `stereotypes`, `toxic`, `toxicity` |
| **Card length (overall)** | 15 | Total substantive length of the model card, excluding YAML metadata. Cards under 500 characters receive 0. Cards over 3,000 characters receive full marks. Linear interpolation between. | *(character count, not keyword-based)* |

**Total possible: 100 points.**

### 4.3 Methodological Note on Keyword Matching

This approach prioritizes **transparency and reproducibility** over comprehensiveness. Every keyword searched is explicitly listed, making the scoring fully auditable and reproducible. The tradeoff is that unusual phrasing not covered by the keyword sets will produce false negatives (a model card that discusses training data using language not in the list would score 0 on that dimension). In practice, the top 5,000 models by downloads are predominantly published by sophisticated organizations that use recognizable language in their documentation. The keyword sets were compiled by reviewing model cards from the top 100 models across multiple task categories to capture the most common phrasing variations.

### 4.4 Scoring Thresholds

| Score Range | Label | Interpretation |
|---|---|---|
| 80–100 | **Well-Documented** | Model card covers all critical areas. Suitable for procurement review. |
| 50–79 | **Partially Documented** | Key information missing. Additional research required before procurement. |
| 20–49 | **Poorly Documented** | Major gaps. High due-diligence burden. |
| 0–19 | **Undocumented** | No meaningful documentation. Not recommended for commercial use regardless of license. |

---

## 5. Scoring Dimension 3: Publisher Credibility

This dimension answers: *"Who published this, and how much should we trust their release practices?"*

### 5.1 User-Facing Display

Like license risk, publisher credibility is **not** displayed as a numeric score. A number obscures the signals that actually help a decision-maker assess trust. Instead, the tool displays the raw signals directly, allowing the user to form their own judgment:

| Signal | What the User Sees | Example |
|---|---|---|
| **Publisher name & type** | Organization or individual account, with verified badge if applicable | "Meta (Verified Organization)" or "john-doe-42 (Individual)" |
| **Known publisher flag** | For prominent AI labs (Meta, Google, Microsoft, Mistral, Alibaba/Qwen, Stability AI, BigScience, EleutherAI, etc.), a "Known AI Publisher" badge is displayed | "Known AI Publisher" badge next to Meta |
| **Model portfolio size** | Number of models published by this author on Hugging Face | "247 models published" |
| **License practices** | Summary of how consistently this publisher uses clear licenses across their portfolio | "92% of models have clear licenses" or "Mixed — 45% unlicensed" |
| **Last updated** | When this specific model was last modified, with a plain-language recency indicator | "Updated 3 weeks ago" or "Last updated 14 months ago ⚠️" |

The maintenance recency indicator uses a simple threshold: models updated within 6 months show no warning, models between 6–18 months show a mild staleness warning, and models not updated in over 18 months show a prominent abandonment warning.

### 5.2 Internal Numeric Mapping (Composite Score Only)

For the purposes of computing the composite risk score (Section 7), each signal is converted to a numeric value. This mapping is **not shown to the user**.

| Signal | Weight | Internal Scoring Logic |
|---|---|---|
| **Organization vs. Individual** | 25 | Organization = 100, Individual = 30 |
| **Verified organization** | 15 | Verified = 100, Not verified = 40, Individual = 0. Weighted low because Hugging Face verification has high precision but very low recall — most legitimate organizations are not verified. |
| **Model portfolio size** | 20 | >20 models = 100, 10–20 = 70, 5–9 = 40, <5 = 15. A rough proxy for institutional commitment, with the caveat that volume does not equal quality. |
| **Portfolio license consistency** | 15 | >80% clearly licensed = 100, 50–80% = 60, <50% = 20. Signals whether the publisher has intentional legal practices. |
| **Maintenance recency** | 25 | Updated within 6 months = 100, 6–12 months = 60, 12–18 months = 30, >18 months = 0. Captures abandonment risk — the most practically dangerous signal for a model in production. |

**Total possible: 100 points (internal only).**

---

## 6. Scoring Dimension 4: EU AI Act Risk Flags

This dimension answers: *"Could deploying this model in the EU trigger regulatory obligations or prohibitions?"*

### 6.1 Approach

This is **not** a compliance assessment. It is a keyword-based screening that flags models whose stated capabilities or intended uses intersect with regulated categories under the EU AI Act. The flag says "investigate further," not "this model is illegal."

### 6.2 Risk Flag Categories

The tool scans the model card text, tags, and pipeline_tag for terms associated with each EU AI Act risk category. As with the documentation scoring, keyword lists are intentionally broad to catch common phrasing variations.

**Prohibited Use Cases:**

| Category | Keywords / Phrases | Rationale |
|---|---|---|
| **Biometric identification** | `facial-recognition`, `face-recognition`, `face-detection`, `face-identification`, `face identification`, `face verification`, `biometric`, `biometric identification`, `biometric categorisation`, `biometric classification`, `person-identification`, `person identification`, `person re-identification`, `re-identification`, `person-reid`, `reid`, `identity verification`, `face matching`, `face-matching`, `facial analysis`, `facial attribute`, `iris recognition`, `fingerprint recognition`, `gait recognition`, `body recognition` | EU AI Act prohibits untargeted biometric identification in public spaces and biometric categorisation inferring protected characteristics. |
| **Emotion recognition** | `emotion-recognition`, `emotion recognition`, `emotion-detection`, `emotion detection`, `emotion classification`, `emotion-classification`, `affect recognition`, `affect-recognition`, `affective computing`, `sentiment-from-face`, `facial emotion`, `facial expression recognition`, `facial expression analysis`, `expression recognition`, `mood detection`, `mood recognition`, `emotional state`, `valence arousal`, `valence-arousal`, `fer2013`, `affectnet`, `rafdb` | Prohibited in workplace and educational settings. Dataset names (FER2013, AffectNet, RAF-DB) are included because models trained on these are almost certainly emotion recognition systems. |
| **Social scoring** | `social-scoring`, `social scoring`, `social credit`, `citizen scoring`, `citizen-scoring`, `trustworthiness scoring`, `trustworthiness-scoring`, `behavior scoring`, `behaviour scoring`, `social ranking`, `citizen rating`, `population scoring`, `civic score` | Prohibited outright under the AI Act. |
| **Subliminal manipulation** | `subliminal`, `manipulation`, `manipulative`, `dark pattern`, `dark-pattern`, `persuasion model`, `behavioral manipulation`, `behaviour manipulation`, `nudging` (in context of deceptive use), `deceptive AI` | Prohibited when used to distort behavior without awareness. |
| **Predictive policing** | `crime-prediction`, `crime prediction`, `recidivism`, `recidivism prediction`, `predictive-policing`, `predictive policing`, `criminal risk`, `risk-assessment` (law enforcement context), `offender profiling`, `crime forecasting`, `criminal profiling`, `reoffending`, `pre-crime`, `precrime` | Prohibited for individual risk profiling; high-risk for broader law enforcement applications. |

**High-Risk Use Cases:**

| Category | Keywords / Phrases | Rationale |
|---|---|---|
| **Critical infrastructure** | `autonomous-driving`, `autonomous driving`, `self-driving`, `self driving`, `autonomous vehicle`, `adas`, `advanced driver assistance`, `medical-device`, `medical device`, `clinical decision`, `clinical-decision`, `diagnostic ai`, `medical diagnosis`, `safety-component`, `safety component`, `infrastructure-management`, `infrastructure management`, `power grid`, `water treatment`, `traffic management`, `traffic control`, `air traffic` | AI used as safety components in critical infrastructure is high-risk. |
| **Education & employment** | `resume-screening`, `resume screening`, `cv screening`, `candidate-ranking`, `candidate ranking`, `candidate scoring`, `applicant tracking`, `applicant screening`, `hiring`, `recruitment`, `recruitment-scoring`, `recruitment scoring`, `talent acquisition`, `job matching`, `student-assessment`, `student assessment`, `exam-proctoring`, `exam proctoring`, `automated grading`, `grade prediction`, `student scoring`, `academic assessment`, `educational assessment`, `admission scoring`, `admission decision`, `worker management`, `employee monitoring`, `employee evaluation`, `performance scoring`, `workforce analytics` | High-risk under Annex III. Covers both employment and educational AI systems. |
| **Law enforcement (non-predictive)** | `law enforcement`, `police`, `policing`, `surveillance`, `mass surveillance`, `suspect identification`, `forensic`, `forensic analysis`, `border control`, `border management`, `immigration`, `asylum`, `customs screening`, `security screening`, `lie detection`, `lie-detection`, `polygraph`, `deception detection` | High-risk under Annex III when used in law enforcement and border management contexts. |
| **Access to essential services** | `credit scoring`, `credit-scoring`, `creditworthiness`, `credit assessment`, `insurance scoring`, `insurance risk`, `loan approval`, `loan decision`, `mortgage`, `benefits eligibility`, `welfare`, `social benefits`, `emergency services`, `triage`, `priority dispatch` | High-risk when AI influences access to credit, insurance, public benefits, or emergency services. |

**Limited Risk (Transparency Obligations):**

| Category | Keywords / Phrases | Rationale |
|---|---|---|
| **Content manipulation & generation** | `deepfake`, `deep-fake`, `face-swap`, `face swap`, `faceswap`, `voice-cloning`, `voice cloning`, `voice clone`, `voice conversion`, `speech synthesis` (when combined with cloning-related tags), `text-to-speech` (when combined with cloning tags), `talking head`, `talking-head`, `lip sync`, `lip-sync`, `reenactment`, `face reenactment`, `face generation`, `face-generation`, `avatar generation`, `synthetic media`, `synthetic voice`, `neural voice` | The AI Act requires transparency labeling for AI-generated or manipulated content. |

### 6.3 Flag Output

Each model receives one or more flags based on keyword matches. Flags are grouped by severity:

- **Prohibited** — Keywords associated with banned AI practices detected (biometric categorisation, emotion recognition in workplace/education, social scoring, subliminal manipulation, predictive policing of individuals). Displayed with a red indicator and prominent positioning.
- **High-Risk** — Keywords associated with Annex III high-risk use cases detected (critical infrastructure, education/employment decisions, law enforcement, access to essential services). Displayed with an orange indicator.
- **Limited Risk** — Keywords associated with transparency-obligation use cases detected (deepfakes, synthetic media, voice cloning). Displayed with a yellow indicator.
- **No flag** — No keywords detected.

A model can receive multiple flags across categories (e.g., both a Prohibited flag for biometric identification and a High-Risk flag for law enforcement). The highest-severity flag determines the model's overall EU AI Act risk level for composite scoring purposes.

**Important caveat displayed in the tool:** The presence of a flag does not mean the model is illegal to use. It means the model's stated capabilities intersect with regulated use cases, and the deployer should conduct a proper AI Act compliance assessment before deploying in the EU. The specific flag category and matched keywords are shown so the user can assess relevance to their own use case.

---

## 7. Composite Risk Score

The composite score combines three of the four scoring dimensions. **EU AI Act flags are excluded from the composite** because they are geography-specific — the EU AI Act applies to deployments in the European Union, and including it in a universal ranking would penalize models for something irrelevant to users outside that jurisdiction. EU AI Act flags remain available as an independent filter for users who need them.

### Weighting

| Dimension | Weight | Rationale |
|---|---|---|
| License Risk | 50% | The most consequential dimension. If the license prohibits commercial use, no amount of documentation or publisher credibility changes the outcome. |
| Documentation Quality | 30% | Determines whether due diligence is even possible. A well-licensed model with no documentation is still a risk because you cannot verify what you're deploying. |
| Publisher Credibility | 20% | A useful trust signal, but secondary — a model from an unknown publisher with clear licensing and strong documentation can be safer than a poorly documented model from a known lab. |

These weights are a starting assumption, not an empirically derived truth. The paper acknowledges this transparently and notes that a sensitivity analysis (testing how rankings shift under different weight configurations) would be valuable future work.

### Composite Calculation

```
composite = (license_score × 0.50) + (doc_score × 0.30) + (publisher_score × 0.20)
```

### Composite Thresholds

| Score | Label | Color |
|---|---|---|
| 75–100 | **Low Risk** | Green |
| 50–74 | **Moderate Risk** | Yellow |
| 25–49 | **High Risk** | Orange |
| 0–24 | **Critical Risk** | Red |

---

## 8. User Interface: What the User Can Do

The tool provides both a default ranked view (using the composite score) and flexible controls that let the user prioritize what matters most to them.

### 8.1 Search

- **Search by task** — Select a pipeline task (e.g., "text-generation", "image-classification", "text-to-speech") to see all models matching that category.
- **Text search** — Free-text search across model names and authors.

### 8.2 Sorting

The user can sort the results by any of the following, in ascending or descending order:

- **Composite score** (default) — The weighted combination of license, documentation, and publisher credibility.
- **License risk** — Sort by license tier, so all Permissive models appear first (or last).
- **Documentation quality** — Sort by documentation score, surfacing the best- or worst-documented models.
- **Publisher credibility** — Sort by publisher score.
- **Downloads** — Sort by popularity / adoption.
- **Last updated** — Sort by recency.

This means a user who only cares about license risk can sort by that dimension alone and ignore the composite entirely.

### 8.3 Filtering

The user can apply filters to narrow the result set:

- **License tier** — Show only Permissive, or exclude Unknown, etc. Multi-select.
- **Documentation quality** — Show only Well-Documented or Partially Documented models.
- **Publisher type** — Filter by organization vs. individual, or show only known AI publishers.
- **EU AI Act flags** — Filter to show only models with no flags, or conversely surface only flagged models for review. This is the primary way the EU dimension is used — as an opt-in filter, not a ranking penalty.
- **Composite risk level** — Show only Low Risk or Moderate Risk models.
- **Downloads threshold** — Filter to models above a minimum download count (e.g., >10,000 downloads).

### 8.4 Model Detail View

Clicking into any model opens a detail view showing the full breakdown:

- License tier with color, plain-language explanation, actual license identifier, and a summary of what that specific license requires. For "other" licenses: the resolution path (reclassified or true unknown) with all available context. If a base model lineage conflict is detected, a warning is shown here.
- Documentation quality score with a per-section breakdown showing which checks passed and which failed.
- Publisher credibility signals displayed as raw data (publisher name, org type, verification status, portfolio size, license consistency, last updated).
- EU AI Act flags, if any, with the matched keywords and the specific AI Act category.
- Direct link to the model page on Hugging Face.

### 8.5 Inline Transparency: Info Icons

The tool is designed to be upfront about what it's doing and how. Every major section of the interface includes an **info icon (ⓘ)** that the user can click to expand an explanation panel. These panels are not hidden in a separate "About" page — they appear in context, right next to the data they explain.

| Location | What the Info Panel Explains |
|---|---|
| **Composite Score** header | How the composite is calculated, which three dimensions feed into it, the weights used (50/30/20), and a note that these weights are a starting assumption, not empirically derived. |
| **License Risk** column/section | The five license tiers, how classification works, what each tier means in practice, and how "other" licenses are resolved. |
| **Documentation Quality** column/section | What the score measures, the six checks and their weights, the keyword-matching approach used, and the caveat that unusual phrasing may not be captured. |
| **Publisher Credibility** column/section | The five signals displayed, what each one indicates, and why publisher identity is a trust shortcut rather than a guarantee. |
| **EU AI Act Flags** filter/section | What the flags mean, how they are generated (keyword matching against model cards), the three severity levels, and the explicit caveat that a flag is not a compliance determination. |
| **Sort & Filter controls** | Brief explanation of what each sort/filter option does and how it relates to the underlying scoring. |

### 8.6 Methodology & Limitations Panel

A persistent **"Methodology & Limitations"** button is visible at the top of the tool. Clicking it expands a panel (or modal) that provides a concise, user-facing summary of what the tool can and cannot do. This is not the full academic methodology — it is a plain-language version designed for a practitioner audience.

**Contents of the Limitations panel:**

1. **Data is self-reported.** All information in this tool comes from metadata published by model authors on Hugging Face. Licenses may be inaccurate, model cards may be incomplete or misleading, and lineage information is frequently missing. This tool surfaces what publishers claim — it does not independently verify those claims.

2. **Keyword matching has blind spots.** Documentation quality scores and EU AI Act flags are generated by searching for specific keywords and phrases in model cards. If a publisher describes their training data or model capabilities using unusual language not in our keyword sets, the tool may miss it. The keyword sets are listed in the full methodology document.

3. **This is a snapshot, not a live feed.** The dataset was extracted at a specific point in time. Models are updated, licenses change, and new models are published daily. Always verify current information on Hugging Face before making a procurement decision.

4. **Scope is limited to Hugging Face.** The open-source AI ecosystem extends to GitHub, TensorFlow Hub, and other platforms. This tool covers Hugging Face because it is the dominant platform for model distribution, but it does not represent the full landscape.

5. **No behavioral testing.** This tool analyzes metadata and documentation. It does not test what a model actually does — for example, whether it reproduces copyrighted text or exhibits bias. Metadata screening and behavioral testing are complementary, not substitutes.

6. **Not legal advice.** This tool is a risk-screening aid. It does not constitute legal counsel. Organizations should consult qualified legal professionals before making procurement or deployment decisions based on licensing or regulatory risk.

---

## 9. Methodological Limitations (To Be Addressed in Paper)

The limitations panel in the tool (Section 8.6) provides a user-facing summary. The academic paper should address these in greater depth:

1. **Metadata reliability.** Hugging Face metadata is self-reported by model publishers. Licenses may be inaccurate, model cards may be misleading, and lineage information is frequently incomplete. The tool operates on stated information, not verified information. A notable example: models like Vicuna display an Apache-2.0 license on their card, but are fine-tunes of LLaMA, which carries a more restrictive license. The lineage flag (Section 3.2, Edge Case C) partially addresses this, but depends on the `base_model` tag being populated, which is not guaranteed.

2. **Keyword-based scoring limitations.** Both the documentation quality scoring and EU AI Act flagging rely on keyword matching. This approach was chosen for transparency and reproducibility (every keyword is explicitly listed), but it produces false negatives when publishers use unusual phrasing. The paper should quantify this: a manual review of a sample of model cards (e.g., 50 randomly selected from the dataset) compared against the keyword-based scores would provide a precision/recall estimate for the approach.

3. **Point-in-time snapshot.** The dataset represents a single extraction. Models are updated, licenses change, and new models are published daily. A production version would need scheduled re-extraction. The paper should note the extraction date and acknowledge that results may not reflect the current state of the ecosystem.

4. **Scope limited to Hugging Face.** The open-source AI ecosystem extends beyond Hugging Face (GitHub, TensorFlow Hub, etc.), but Hugging Face is the dominant platform for model distribution and represents the largest concentration of adoption risk.

5. **No runtime testing.** This tool assesses metadata and documentation. It does not test model behavior (e.g., whether a model actually reproduces copyrighted text). This was a deliberate scope decision to focus on the supply-chain screening layer rather than behavioral testing. The paper should discuss how metadata screening and behavioral testing serve complementary roles in a full AI procurement workflow.

6. **Composite score weights are assumed, not derived.** The 50/30/20 weighting is a judgment call. The paper should include a brief sensitivity analysis showing how model rankings shift under alternative weightings (e.g., 60/20/20 or 40/40/20) to demonstrate robustness or identify where the choice of weights materially changes outcomes.
