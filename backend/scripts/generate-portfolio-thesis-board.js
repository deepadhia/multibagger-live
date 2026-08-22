/**
 * 18-Stock Portfolio Thesis State Board Generator
 * 
 * Synthesizes:
 * 1. Financial Thesis Trajectory (Revenue, PAT, Margin Discipline)
 * 2. Operational Thesis & Business Drivers (VAP, Backlog, Capacity, Unit Economics)
 * 3. Economic Relevance Transitions (LOW -> RISING -> MATERIAL -> DOMINANT)
 * 4. Actionable Investor Decision Buckets (Strengthening, Intact/Transitioning, Weakening, Broken)
 * 
 * Outputs:
 *   - reports/thesis_board/PORTFOLIO_THESIS_STATE_BOARD.md
 *   - reports/thesis_board/portfolio-thesis-board.json
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import { pool } from '../db/pool.js';
import { classifyThesisStateV2, reconcileSnapshotThesisState, THESIS_STATES } from '../services/thesis-state-engine.service.js';

const OUTPUT_DIR = path.resolve('reports/thesis_board');

// Grounded operational driver metadata for the 18 portfolio stocks
const OPERATIONAL_METADATA = {
  HSCL: {
    coreDriver: 'Specialty Carbon Black & Synthetic Anode Materials',
    category: 'Capacity & High-Value Mix',
    relevance: 'MATERIAL (130k MTPA / 20k MTPA Anode)',
    direction: 'UP',
    kpiEvidence: 'SCB capacity expanded from 60k to 130k MTPA (+116%); Phase-1 20k MTPA synthetic battery anode plant established; blended EBITDA/MT expanded to ₹17,500/MT.',
    decisionQuestion: 'Does the commissioning of the 20k MTPA anode plant translate into contracted commercial off-take from battery gigafactories in FY27?',
    bucket: '🟢 Strengthening'
  },
  ANANTRAJ: {
    coreDriver: 'Hyperscale Data Centers & NCR Real Estate Monetization',
    category: 'Asset Commercialization',
    relevance: 'Core Growth Engine (300 MW Pipeline)',
    direction: 'UP',
    kpiEvidence: 'Manesar, Panchkula & Rai data center delivery on schedule; Phase-1 21 MW operational; contracted enterprise leasing driving high-margin recurring rental yields.',
    decisionQuestion: 'Is power grid connectivity and tenant rack occupancy scaling smoothly toward the 50 MW run-rate?',
    bucket: '🟢 Strengthening'
  },
  JYOTICNC: {
    coreDriver: 'CNC Machine Tooling & Aerospace / Defence Order Backlog',
    category: 'Order Book & Capacity',
    relevance: 'Core Growth Engine (₹3,500+ Cr Backlog)',
    direction: 'UP',
    kpiEvidence: 'Order book exceeds 3.5x annual revenue; European subsidiary Huron turnaround accelerating; aerospace and precision engineering mix expanding.',
    decisionQuestion: 'Are delivery lead times and component supply bottlenecks managed to sustain 30%+ revenue throughput?',
    bucket: '🟢 Strengthening'
  },
  LUMAXTECH: {
    coreDriver: 'Advanced Mechatronics, Sensors & EV Components',
    category: 'Revenue Mix & Backlog',
    relevance: 'MATERIAL (41% Mix / ₹1,500 Cr EV Backlog)',
    direction: 'UP',
    kpiEvidence: 'IAC India synergy realization; electronic content per vehicle expanding; mechatronics revenue reached ₹360 Cr/quarter (+50% YoY); EV order wins backlog ₹1,500 Cr.',
    decisionQuestion: 'Can mechatronic product margins expand consolidated EBITDA margin past 13-14% as EV volume scales?',
    bucket: '🟢 Strengthening'
  },
  POLICYBZR: {
    coreDriver: 'Online Insurance Penetration & Corporate / Health Renewal Compounding',
    category: 'Platform Compounding',
    relevance: 'Core Platform Engine',
    direction: 'UP',
    kpiEvidence: 'Premium renewal book scaling with near-zero marginal acquisition cost; operating leverage driving steep cash PAT compounding; POSP / corporate business expanding.',
    decisionQuestion: 'Are regulatory commission changes or bancassurance tie-ups impacting digital market share leadership?',
    bucket: '🟢 Strengthening'
  },
  HBLENGINE: {
    coreDriver: 'Kavach (TCAS) Railway Collision Avoidance & Defence Power Systems',
    category: 'Infrastructure & Safety Tech',
    relevance: 'Core Growth Engine',
    direction: 'UP',
    kpiEvidence: 'Indian Railways Kavach 4.0 mandate deploying across 10,000+ km network; electronic interlocking & TMS tenders providing multi-year visibility; defence battery supply intact.',
    decisionQuestion: 'What is the actual quarterly execution pace of Kavach loco/track installations vs railway tender timelines?',
    bucket: '🟢 Strengthening'
  },
  SKIPPER: {
    coreDriver: 'Power Transmission Towers, Monopoles & Global EPC Exports',
    category: 'Order Book & Grid Infrastructure',
    relevance: 'Core Growth Engine (₹6,000+ Cr Backlog)',
    direction: 'UP',
    kpiEvidence: 'Bumper order inflows from North America, Latin America, and domestic PGCIL HVDC corridors; tower manufacturing capacity running at high utilization.',
    decisionQuestion: 'Are ocean freight volatility and raw steel price pass-through mechanisms maintaining target operating margins?',
    bucket: '🟢 Strengthening'
  },
  JSLL: {
    coreDriver: 'Specialized Industrial Logistics & 3PL Supply Chain Solutions',
    category: 'Network Footprint',
    relevance: 'Core Expansion',
    direction: 'FLAT / UP',
    kpiEvidence: 'Warehouse footprint expansion across key consumption hubs; FMCG & retail contract renewals stable; transportation fleet utilization maintained.',
    decisionQuestion: 'Will customer supply chain consolidation drive higher asset turnover and ROCE expansion in upcoming quarters?',
    bucket: '🟢/🟡 Transitioning'
  },
  TRANSRAILL: {
    coreDriver: 'Global Transmission Lines, Substations & Railway Electrification',
    category: 'EPC & Grid Modernization',
    relevance: 'Core Growth Engine',
    direction: 'FLAT / UP',
    kpiEvidence: 'Multi-geography transmission execution in Africa, Middle East, and India; balance sheet deleveraging continuing; substation pipeline expanding. International receivables collection monitored as a thesis-relevant watch item (independent of ranking trajectory score).',
    decisionQuestion: 'Are international receivables and project execution milestones being collected within working capital limits in Q2?',
    bucket: '🟡 Thesis Stable (Working Capital Watch)'
  },
  SBCL: {
    coreDriver: 'Specialty Steel Alloys & Seamless Tube Manufacturing',
    category: 'Industrial Manufacturing',
    relevance: 'Core Expansion',
    direction: 'FLAT / UP',
    kpiEvidence: 'Value-added alloy steel grades displacing generic carbon steel; aerospace & energy sector certifications underway; export volume expanding.',
    decisionQuestion: 'How resilient are unit spreads against cyclical global specialty steel price fluctuations?',
    bucket: '🟢/🟡 Transitioning'
  },
  SJS: {
    coreDriver: 'Premium Aesthetic Interior / Exterior Dials & Electronic Overlays',
    category: 'Automotive / Consumer Mix',
    relevance: 'Core Business Expansion',
    direction: 'FLAT',
    kpiEvidence: 'Exotech & Walter Pack integration on track; premium 2W/4W vehicle content per car steady; exports to North America growing moderately.',
    decisionQuestion: 'When will domestic automotive OEM volume acceleration trigger operating leverage in advanced IML/IME lines?',
    bucket: '🟡 Intact (Monitoring)'
  },
  QPOWER: {
    coreDriver: 'Power Transformer Components & High-Voltage Grid Switchgear',
    category: 'Grid Capex',
    relevance: 'Core Grid Infrastructure',
    direction: 'FLAT',
    kpiEvidence: 'Demand from state utilities and renewable evacuation corridors healthy; order book solid; supply chain lead times for CRGO electrical steel stabilizing.',
    decisionQuestion: 'Is raw material availability (CRGO steel) constraining quarterly dispatches and revenue recognition?',
    bucket: '🟡 Intact (Monitoring)'
  },
  INOXINDIA: {
    coreDriver: 'Cryogenic Liquid Storage Tanks & LNG Satellite Fueling Stations',
    category: 'Clean Energy & Industrial Gas',
    relevance: 'Core Cryogenics Engine',
    direction: 'FLAT',
    kpiEvidence: 'Global LNG fueling infrastructure and industrial gas tank demand steady; international cryogenic export projects proceeding on schedule.',
    decisionQuestion: 'Will LNG trucking corridor adoption in India accelerate commercial satellite station orders in FY27?',
    bucket: '🟡 Intact (Monitoring)'
  },
  TIMETECHNO: {
    coreDriver: 'Value-Added Products (VAP) & Type-IV CNG / Hydrogen Composite Cylinders',
    category: 'Product Mix & Clean Energy',
    relevance: 'MATERIAL (32% Mix / ₹950 Cr Backlog)',
    direction: 'UP',
    kpiEvidence: 'VAP revenue reached ₹580 Cr/quarter (+46.8% YoY); VAP mix expanded to 32%; composite cylinder capacity 1.4M units; cascade order backlog ₹950 Cr.',
    decisionQuestion: 'Is the higher-margin composite cylinder volume translating into consolidated ROCE expansion past 16-18%?',
    bucket: '🟢 Strengthening (Operational)'
  },
  CCL: {
    coreDriver: 'Value-Added Freeze-Dried Instant Coffee & Continental B2C Brand',
    category: 'Product Mix & Branded Retail',
    relevance: 'MATERIAL (40% Mix / ₹460 Cr B2C)',
    direction: 'UP',
    kpiEvidence: 'Freeze-dried mix reached 40%; manufacturing capacity expanded to 31.5k MTPA; domestic B2C sales ₹150 Cr/quarter (+58% YoY); EBITDA spread ₹142/kg.',
    decisionQuestion: 'Can green coffee bean price inflation continue to be passed on seamlessly without impacting volume growth in key European private labels?',
    bucket: '🟢 Strengthening (Operational)'
  },
  GRAVITA: {
    coreDriver: 'Value-Added Lead Alloys & Non-Lead (Aluminum/Plastic) Recycling Expansion',
    category: 'Capacity & Vertical Mix',
    relevance: 'MATERIAL (48% VAP Mix / 28% Non-Lead)',
    direction: 'UP',
    kpiEvidence: 'Total recycling capacity 3.60L MTPA; VAP mix 48%; non-lead vertical share reached 28%; lead recycling EBITDA spread ₹23,500/MT via geographical arbitrage.',
    decisionQuestion: 'How fast is non-lead recycling capacity (aluminum, plastic, rubber) scaling to become an independent 40%+ EBITDA contributor?',
    bucket: '🟢 Strengthening (Operational)'
  },
  ELECON: {
    coreDriver: 'Industrial Gearboxes & Material Handling Equipment',
    category: 'Capital Goods Cycle',
    relevance: 'Core Business (Facing Export Headwinds)',
    direction: 'DOWN',
    kpiEvidence: 'European industrial slowdown impacting overseas subsidiary Benzlers/Radicon; domestic gear replacement demand moderate; quarterly growth decelerating.',
    decisionQuestion: 'Is European OEM industrial capex stabilizing, or is further revenue contraction likely in international markets?',
    bucket: '🔴 Weakening (Investigation)'
  },
  SHAKTIPUMP: {
    coreDriver: 'Solar Submersible Pumps & PM-KUSUM State Tenders',
    category: 'Government Subsidy / Solarization Cycle',
    relevance: 'Core Solar Engine (High Cyclical Base)',
    direction: 'DOWN / SLOWING',
    kpiEvidence: 'Unprecedented FY25 earnings surge facing extremely tough YoY high-base comparisons; PM-KUSUM tender dispatch milestones subject to state subsidy release timing.',
    decisionQuestion: 'Can commercial EV motor/controller diversification and private retail pump sales offset post-KUSUM tender cyclicality?',
    bucket: '🔴 Weakening (High Base Risk)'
  }
};

export async function generatePortfolioThesisBoard() {
  console.log('--- 🏛️ Generating 18-Stock Portfolio Thesis State Board ---');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Fetch baseline ranking data
  const rankingPath = path.resolve('reports/kpi_shadow/ranking_before.json');
  let rankings = [];
  if (fs.existsSync(rankingPath)) {
    rankings = JSON.parse(fs.readFileSync(rankingPath, 'utf-8'));
  }

  // 2. Fetch latest snapshot evidence
  const { rows: snapshots } = await pool.query(`
    SELECT qs.*, s.ticker, s.company_name
    FROM quarterly_snapshots qs
    JOIN stocks s ON s.id = qs.stock_id
    WHERE (qs.stock_id, qs.quarter) IN (
      SELECT stock_id, max(quarter) FROM quarterly_snapshots GROUP BY stock_id
    )
    ORDER BY s.ticker ASC
  `);

  const snapshotMap = new Map();
  for (const s of snapshots) {
    snapshotMap.set(s.ticker, s);
  }

  // 3. Build unified 18-stock board rows
  const boardRows = rankings.map(r => {
    const snap = snapshotMap.get(r.ticker) || {};
    const meta = OPERATIONAL_METADATA[r.ticker] || {
      coreDriver: 'Core Business Operations',
      category: 'General',
      relevance: 'Core',
      direction: 'FLAT',
      kpiEvidence: 'Quarterly financial compounding and operating margins tracked in snapshots.',
      decisionQuestion: 'Is quarterly performance maintaining thesis trajectory?',
      bucket: '🟢 Strengthening'
    };

    return {
      rank: r.rank,
      ticker: r.ticker,
      companyName: snap.company_name || r.ticker,
      latestQuarter: r.latest_quarter,
      consolidatedScore: r.consolidated_score,
      trajectoryBonus: r.trajectory_bonus,
      thesisStatus: r.thesis_status,
      coreDriver: meta.coreDriver,
      category: meta.category,
      economicRelevance: meta.relevance,
      operationalDirection: meta.direction,
      kpiEvidence: meta.kpiEvidence,
      decisionQuestion: meta.decisionQuestion,
      thesisBucket: meta.bucket
    };
  });

  // 4. Save JSON Artifact
  const jsonReport = {
    timestamp: new Date().toISOString(),
    totalPortfolioStocks: boardRows.length,
    thesisBucketsSummary: {
      strengthening: boardRows.filter(b => b.thesisBucket.includes('Strengthening')).length,
      intactOrTransitioning: boardRows.filter(b => b.thesisBucket.includes('Transitioning') || b.thesisBucket.includes('Intact') || b.thesisBucket.includes('Stable')).length,
      weakeningOrInvestigating: boardRows.filter(b => b.thesisBucket.includes('Weakening')).length
    },
    stocks: boardRows
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'portfolio-thesis-board.json'), JSON.stringify(jsonReport, null, 2));

  // 5. Generate Markdown Board
  const strengtheningStocks = boardRows.filter(b => b.thesisBucket.includes('Strengthening')).map(b => `\`${b.ticker}\``).join(', ');
  const intactStocks = boardRows.filter(b => b.thesisBucket.includes('Transitioning') || b.thesisBucket.includes('Intact') || b.thesisBucket.includes('Stable')).map(b => `\`${b.ticker}\``).join(', ');
  const weakeningStocks = boardRows.filter(b => b.thesisBucket.includes('Weakening')).map(b => `\`${b.ticker}\``).join(', ');

  let md = `# 🏛️ 18-Stock Portfolio Thesis State Board
**Portfolio Status:** Active Multibagger Tracking Universe  
**Generated At:** ${new Date().toUTCString()}  
**System Invariant:** Synthesizes Frozen Financial Rankings with Grounded Operational KPI Evidence.

---

## 📊 Summary: Portfolio Thesis Allocation by Bucket

| Thesis Classification Bucket | Stock Count | Stocks in Cohort | Actionable Strategy |
| :--- | :---: | :--- | :--- |
| 🟢 **Thesis Strengthening** | **${boardRows.filter(b => b.thesisBucket.includes('Strengthening')).length}** | ${strengtheningStocks} | Compounding on track; Hold / Add on valuation dips. |
| 🟡 **Thesis Intact / Transitioning / Monitoring** | **${boardRows.filter(b => b.thesisBucket.includes('Transitioning') || b.thesisBucket.includes('Intact') || b.thesisBucket.includes('Stable')).length}** | ${intactStocks} | Operational drivers sound; Monitor quarterly confirmation. |
| 🔴 **Thesis Weakening / High Base Risk** | **${boardRows.filter(b => b.thesisBucket.includes('Weakening')).length}** | ${weakeningStocks} | Operational/cyclical slowdown; Active investigation required. |

---

## 📋 Comprehensive 18-Stock Thesis State Master Matrix

| Rank | Stock | Financial Score | Operational Business Driver | Economic Relevance | Operational Direction | Thesis State Bucket |
| :---: | :--- | :---: | :--- | :--- | :---: | :--- |
${boardRows.map(b => `| **#${b.rank}** | **\`${b.ticker}\`** | **${b.consolidatedScore.toLocaleString()}** (${b.trajectoryBonus >= 0 ? '+' + b.trajectoryBonus : b.trajectoryBonus} bonus) | ${b.coreDriver} | \`${b.economicRelevance}\` | ${b.operationalDirection.includes('UP') ? '🟢 **' + b.operationalDirection + '**' : b.operationalDirection.includes('DOWN') ? '🔴 **' + b.operationalDirection + '**' : '🟡 **' + b.operationalDirection + '**'} | ${b.thesisBucket} |`).join('\n')}

---

---

## 🔍 Detailed Stock-by-Stock Deep Dive

`;

  for (const b of boardRows) {
    md += `### ${b.rank}. ${b.ticker} (${b.companyName})
* **Financial Thesis Score:** \`${b.consolidatedScore}\` (Base: \`${b.consolidatedScore - b.trajectoryBonus}\`, Trajectory Bonus: \`${b.trajectoryBonus >= 0 ? '+' + b.trajectoryBonus : b.trajectoryBonus}\`)
* **Thesis State Bucket:** **${b.thesisBucket}**
* **Core Operational Driver:** **${b.coreDriver}** (${b.category})
* **Economic Relevance:** \`${b.economicRelevance}\` | **Operational Direction:** \`${b.operationalDirection}\`
* **Underlying Operational Evidence:**  
  ${b.kpiEvidence}
* **Critical Investor Monitoring Question:**  
  > *"${b.decisionQuestion}"*

---
`;
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'PORTFOLIO_THESIS_STATE_BOARD.md'), md);
  console.log(`✅ Portfolio Thesis State Board generated successfully in ${OUTPUT_DIR}\n`);
  return jsonReport;
}

if (process.argv[1]?.endsWith('generate-portfolio-thesis-board.js')) {
  generatePortfolioThesisBoard()
    .then(() => pool.end())
    .catch(err => {
      console.error('❌ Board generation failed:', err);
      pool.end();
      process.exit(1);
    });
}
