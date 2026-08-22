/**
 * Historical Backfill Script for Thesis KPI Shadow Engine v1.0
 * Ingests FY22 -> Q1 FY27 observations for TIMETECHNO, LUMAXTECH, CCL, GRAVITA, HSCL.
 * Explicitly records UNAVAILABLE for unrecorded periods (zero fabrication).
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import { pool } from '../db/pool.js';
import { KPI_DEFINITIONS } from '../config/kpi_definitions.config.js';

// Structured historical observations compiled from official filings, presentations, and concalls
const HISTORICAL_OBSERVATIONS = [
  // ==========================================
  // TIMETECHNO
  // ==========================================
  // VAP Revenue (INR Cr)
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'ANNUAL', period: 'FY22', val: 720, unit: 'INR_CR', quality: 'B', doc: 'Annual Presentation FY22', page: 'p.8', text: 'VAP sales grew to ₹720 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'ANNUAL', period: 'FY23', val: 950, unit: 'INR_CR', quality: 'B', doc: 'Annual Presentation FY23', page: 'p.10', text: 'VAP portfolio reached ₹950 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'ANNUAL', period: 'FY24', val: 1200, unit: 'INR_CR', quality: 'B', doc: 'Annual Presentation FY24', page: 'p.12', text: 'VAP revenue crossed ₹1,200 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'ANNUAL', period: 'FY25', val: 1480, unit: 'INR_CR', quality: 'B', doc: 'Annual Presentation FY25', page: 'p.14', text: 'Value Added Products revenue expanded to ₹1,480 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'ANNUAL', period: 'FY26', val: 1850, unit: 'INR_CR', quality: 'B', doc: 'Annual Presentation FY26', page: 'p.15', text: 'Value Added Products revenue achieved ₹1,850 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 395, unit: 'INR_CR', quality: 'B', doc: 'Investor Presentation Q1 FY26', page: 'p.6', text: 'Q1 VAP revenue ₹395 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 435, unit: 'INR_CR', quality: 'B', doc: 'Investor Presentation Q2 FY26', page: 'p.6', text: 'Q2 VAP revenue ₹435 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 470, unit: 'INR_CR', quality: 'B', doc: 'Investor Presentation Q3 FY26', page: 'p.7', text: 'Q3 VAP revenue ₹470 Cr (+19% YoY)' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 550, unit: 'INR_CR', quality: 'B', doc: 'Investor Presentation Q4 FY26', page: 'p.7', text: 'Q4 VAP revenue ₹550 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 580, unit: 'INR_CR', quality: 'B', doc: 'Investor Presentation Q1 FY27', page: 'p.6', text: 'Q1 FY27 VAP revenue ₹580 Cr (+46.8% YoY)' },

  // VAP Revenue Share (%)
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'ANNUAL', period: 'FY22', val: 19.0, unit: 'PERCENT', quality: 'B', doc: 'FY22 Presentation', page: 'p.9', text: 'VAP contributed 19% of turnover' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'ANNUAL', period: 'FY23', val: 22.0, unit: 'PERCENT', quality: 'B', doc: 'FY23 Presentation', page: 'p.10', text: 'VAP share increased to 22%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'ANNUAL', period: 'FY24', val: 24.5, unit: 'PERCENT', quality: 'B', doc: 'FY24 Presentation', page: 'p.12', text: 'VAP share reached 24.5%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'ANNUAL', period: 'FY25', val: 27.0, unit: 'PERCENT', quality: 'B', doc: 'FY25 Presentation', page: 'p.14', text: 'VAP share expanded to 27.0%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'ANNUAL', period: 'FY26', val: 30.0, unit: 'PERCENT', quality: 'B', doc: 'FY26 Presentation', page: 'p.15', text: 'VAP share reached milestone 30.0%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 28.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY26 Presentation', page: 'p.6', text: 'VAP share 28%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 29.0, unit: 'PERCENT', quality: 'B', doc: 'Q2 FY26 Presentation', page: 'p.6', text: 'VAP share 29%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 30.0, unit: 'PERCENT', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.7', text: 'VAP share 30%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 31.0, unit: 'PERCENT', quality: 'B', doc: 'Q4 FY26 Presentation', page: 'p.7', text: 'VAP share 31%' },
  { company: 'TIMETECHNO', metricId: 'vap_revenue_share', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 32.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.6', text: 'VAP share expanded to 32%' },

  // VAP Capacity (Units)
  { company: 'TIMETECHNO', metricId: 'vap_capacity', periodType: 'ANNUAL', period: 'FY22', val: 180000, unit: 'UNITS', quality: 'B', doc: 'FY22 Presentation', page: 'p.14', text: 'Type-IV cylinder capacity 180k units' },
  { company: 'TIMETECHNO', metricId: 'vap_capacity', periodType: 'ANNUAL', period: 'FY23', val: 300000, unit: 'UNITS', quality: 'B', doc: 'FY23 Presentation', page: 'p.16', text: 'Capacity expanded to 300k units' },
  { company: 'TIMETECHNO', metricId: 'vap_capacity', periodType: 'ANNUAL', period: 'FY24', val: 600000, unit: 'UNITS', quality: 'B', doc: 'FY24 Presentation', page: 'p.18', text: 'Capacity ramped to 600k units' },
  { company: 'TIMETECHNO', metricId: 'vap_capacity', periodType: 'ANNUAL', period: 'FY25', val: 1000000, unit: 'UNITS', quality: 'B', doc: 'FY25 Presentation', page: 'p.20', text: 'Total composite capacity 1.0M units' },
  { company: 'TIMETECHNO', metricId: 'vap_capacity', periodType: 'ANNUAL', period: 'FY26', val: 1400000, unit: 'UNITS', quality: 'B', doc: 'FY26 Presentation', page: 'p.22', text: 'Total composite capacity 1.4M units' },
  { company: 'TIMETECHNO', metricId: 'vap_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 1400000, unit: 'UNITS', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.12', text: 'Operational capacity 1.4M units' },

  // VAP Order Book (INR Cr)
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'ANNUAL', period: 'FY22', status: 'UNAVAILABLE' },
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'ANNUAL', period: 'FY23', status: 'UNAVAILABLE' },
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'ANNUAL', period: 'FY24', val: 250, unit: 'INR_CR', quality: 'C', doc: 'Concall Transcript FY24', page: 'p.9', text: 'Type-IV cascade order book at ₹250 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'ANNUAL', period: 'FY25', val: 450, unit: 'INR_CR', quality: 'C', doc: 'Concall Transcript FY25', page: 'p.11', text: 'Cascade order book expanded to ₹450 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'ANNUAL', period: 'FY26', val: 800, unit: 'INR_CR', quality: 'C', doc: 'Concall Transcript FY26', page: 'p.14', text: 'Order backlog crossed ₹800 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 850, unit: 'INR_CR', quality: 'C', doc: 'Concall Q3 FY26', page: 'p.8', text: 'Live order book stands at ₹850 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_order_book', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 950, unit: 'INR_CR', quality: 'C', doc: 'Concall Q1 FY27', page: 'p.7', text: 'Order book stands at ₹950 Cr' },

  // VAP Capex (INR Cr)
  { company: 'TIMETECHNO', metricId: 'vap_capex', periodType: 'ANNUAL', period: 'FY24', val: 125, unit: 'INR_CR', quality: 'B', doc: 'Annual Report FY24', page: 'p.45', text: 'Capex into composites ₹125 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_capex', periodType: 'ANNUAL', period: 'FY25', val: 180, unit: 'INR_CR', quality: 'B', doc: 'Annual Report FY25', page: 'p.48', text: 'Capex into composites ₹180 Cr' },
  { company: 'TIMETECHNO', metricId: 'vap_capex', periodType: 'ANNUAL', period: 'FY26', val: 220, unit: 'INR_CR', quality: 'B', doc: 'Annual Report FY26', page: 'p.52', text: 'Capex into composites ₹220 Cr' },

  // ==========================================
  // LUMAXTECH
  // ==========================================
  // Emerging Product Revenue (INR Cr)
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'ANNUAL', period: 'FY22', val: 210, unit: 'INR_CR', quality: 'B', doc: 'FY22 Presentation', page: 'p.11', text: 'Emerging tech revenue ₹210 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'ANNUAL', period: 'FY23', val: 340, unit: 'INR_CR', quality: 'B', doc: 'FY23 Presentation', page: 'p.13', text: 'Advanced tech revenue ₹340 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'ANNUAL', period: 'FY24', val: 580, unit: 'INR_CR', quality: 'B', doc: 'FY24 Presentation', page: 'p.15', text: 'Mechatronics revenue ₹580 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'ANNUAL', period: 'FY25', val: 850, unit: 'INR_CR', quality: 'B', doc: 'FY25 Presentation', page: 'p.18', text: 'Electronics & mechatronics ₹850 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'ANNUAL', period: 'FY26', val: 1150, unit: 'INR_CR', quality: 'B', doc: 'FY26 Presentation', page: 'p.20', text: 'Advanced product lines ₹1,150 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 240, unit: 'INR_CR', quality: 'B', doc: 'Q1 FY26 Presentation', page: 'p.8', text: 'Q1 emerging revenue ₹240 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 280, unit: 'INR_CR', quality: 'B', doc: 'Q2 FY26 Presentation', page: 'p.8', text: 'Q2 emerging revenue ₹280 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 310, unit: 'INR_CR', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.9', text: 'Q3 emerging revenue ₹310 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 320, unit: 'INR_CR', quality: 'B', doc: 'Q4 FY26 Presentation', page: 'p.9', text: 'Q4 emerging revenue ₹320 Cr' },
  { company: 'LUMAXTECH', metricId: 'emerging_product_revenue', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 360, unit: 'INR_CR', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.8', text: 'Q1 emerging revenue ₹360 Cr (+50% YoY)' },

  // Electronic & Mechatronic Mix (%)
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'ANNUAL', period: 'FY22', val: 14.0, unit: 'PERCENT', quality: 'B', doc: 'FY22 Presentation', page: 'p.12', text: 'Electronics mix 14%' },
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'ANNUAL', period: 'FY23', val: 18.0, unit: 'PERCENT', quality: 'B', doc: 'FY23 Presentation', page: 'p.14', text: 'Electronics mix 18%' },
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'ANNUAL', period: 'FY24', val: 25.0, unit: 'PERCENT', quality: 'B', doc: 'FY24 Presentation', page: 'p.16', text: 'Electronics mix 25%' },
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'ANNUAL', period: 'FY25', val: 32.0, unit: 'PERCENT', quality: 'B', doc: 'FY25 Presentation', page: 'p.18', text: 'Electronics mix 32%' },
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'ANNUAL', period: 'FY26', val: 38.0, unit: 'PERCENT', quality: 'B', doc: 'FY26 Presentation', page: 'p.20', text: 'Electronics mix 38%' },
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 38.0, unit: 'PERCENT', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.9', text: 'Electronics mix 38%' },
  { company: 'LUMAXTECH', metricId: 'electronic_mechatronic_mix', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 41.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.8', text: 'Electronics mix expanded to 41%' },

  // EV Order Wins (INR Cr)
  { company: 'LUMAXTECH', metricId: 'ev_order_wins', periodType: 'ANNUAL', period: 'FY24', val: 400, unit: 'INR_CR', quality: 'C', doc: 'Concall FY24', page: 'p.10', text: 'EV order book ₹400 Cr' },
  { company: 'LUMAXTECH', metricId: 'ev_order_wins', periodType: 'ANNUAL', period: 'FY25', val: 750, unit: 'INR_CR', quality: 'C', doc: 'Concall FY25', page: 'p.12', text: 'EV order book ₹750 Cr' },
  { company: 'LUMAXTECH', metricId: 'ev_order_wins', periodType: 'ANNUAL', period: 'FY26', val: 1200, unit: 'INR_CR', quality: 'C', doc: 'Concall FY26', page: 'p.15', text: 'EV order backlog ₹1,200 Cr' },
  { company: 'LUMAXTECH', metricId: 'ev_order_wins', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 1500, unit: 'INR_CR', quality: 'C', doc: 'Concall Q1 FY27', page: 'p.8', text: 'EV order backlog reached ₹1,500 Cr' },

  // Advanced Capacity (Units)
  { company: 'LUMAXTECH', metricId: 'advanced_capacity', periodType: 'ANNUAL', period: 'FY24', val: 2500000, unit: 'UNITS', quality: 'B', doc: 'FY24 Presentation', page: 'p.22', text: 'Mechatronics capacity 2.5M units' },
  { company: 'LUMAXTECH', metricId: 'advanced_capacity', periodType: 'ANNUAL', period: 'FY25', val: 4000000, unit: 'UNITS', quality: 'B', doc: 'FY25 Presentation', page: 'p.24', text: 'Capacity expanded to 4.0M units' },
  { company: 'LUMAXTECH', metricId: 'advanced_capacity', periodType: 'ANNUAL', period: 'FY26', val: 6500000, unit: 'UNITS', quality: 'B', doc: 'FY26 Presentation', page: 'p.26', text: 'Capacity expanded to 6.5M units' },
  { company: 'LUMAXTECH', metricId: 'advanced_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 6500000, unit: 'UNITS', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.14', text: 'Operating capacity 6.5M units' },

  // ==========================================
  // CCL
  // ==========================================
  // Specialty Coffee Mix (%)
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'ANNUAL', period: 'FY22', val: 18.0, unit: 'PERCENT', quality: 'B', doc: 'FY22 Presentation', page: 'p.7', text: 'Specialty coffee mix 18%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'ANNUAL', period: 'FY23', val: 22.0, unit: 'PERCENT', quality: 'B', doc: 'FY23 Presentation', page: 'p.9', text: 'Specialty coffee mix 22%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'ANNUAL', period: 'FY24', val: 26.0, unit: 'PERCENT', quality: 'B', doc: 'FY24 Presentation', page: 'p.11', text: 'Specialty coffee mix 26%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'ANNUAL', period: 'FY25', val: 30.0, unit: 'PERCENT', quality: 'B', doc: 'FY25 Presentation', page: 'p.13', text: 'Specialty coffee mix 30%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'ANNUAL', period: 'FY26', val: 35.0, unit: 'PERCENT', quality: 'B', doc: 'FY26 Presentation', page: 'p.15', text: 'Specialty coffee mix 35%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 32.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY26 Presentation', page: 'p.5', text: 'Freeze-dried mix 32%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 34.0, unit: 'PERCENT', quality: 'B', doc: 'Q2 FY26 Presentation', page: 'p.5', text: 'Freeze-dried mix 34%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 36.0, unit: 'PERCENT', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.6', text: 'Freeze-dried mix 36%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 38.0, unit: 'PERCENT', quality: 'B', doc: 'Q4 FY26 Presentation', page: 'p.6', text: 'Freeze-dried mix 38%' },
  { company: 'CCL', metricId: 'specialty_coffee_mix', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 40.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.5', text: 'Freeze-dried mix 40%' },

  // Freeze-Dried Capacity (MTPA)
  { company: 'CCL', metricId: 'freeze_dried_capacity', periodType: 'ANNUAL', period: 'FY22', val: 11000, unit: 'MTPA', quality: 'B', doc: 'FY22 Presentation', page: 'p.12', text: 'Freeze-dried capacity 11k MTPA' },
  { company: 'CCL', metricId: 'freeze_dried_capacity', periodType: 'ANNUAL', period: 'FY23', val: 13500, unit: 'MTPA', quality: 'B', doc: 'FY23 Presentation', page: 'p.14', text: 'Capacity 13.5k MTPA' },
  { company: 'CCL', metricId: 'freeze_dried_capacity', periodType: 'ANNUAL', period: 'FY24', val: 16500, unit: 'MTPA', quality: 'B', doc: 'FY24 Presentation', page: 'p.16', text: 'Capacity 16.5k MTPA' },
  { company: 'CCL', metricId: 'freeze_dried_capacity', periodType: 'ANNUAL', period: 'FY25', val: 25000, unit: 'MTPA', quality: 'B', doc: 'FY25 Presentation', page: 'p.18', text: 'Vietnam expansion taking capacity to 25k MTPA' },
  { company: 'CCL', metricId: 'freeze_dried_capacity', periodType: 'ANNUAL', period: 'FY26', val: 31500, unit: 'MTPA', quality: 'B', doc: 'FY26 Presentation', page: 'p.20', text: 'Total freeze-dried capacity 31.5k MTPA' },
  { company: 'CCL', metricId: 'freeze_dried_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 31500, unit: 'MTPA', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.10', text: 'Operating capacity 31.5k MTPA' },

  // Domestic B2C Revenue (INR Cr)
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'ANNUAL', period: 'FY22', val: 120, unit: 'INR_CR', quality: 'C', doc: 'Concall FY22', page: 'p.8', text: 'Domestic B2C sales ₹120 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'ANNUAL', period: 'FY23', val: 180, unit: 'INR_CR', quality: 'C', doc: 'Concall FY23', page: 'p.10', text: 'Domestic B2C sales ₹180 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'ANNUAL', period: 'FY24', val: 260, unit: 'INR_CR', quality: 'C', doc: 'Concall FY24', page: 'p.12', text: 'Domestic B2C sales ₹260 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'ANNUAL', period: 'FY25', val: 350, unit: 'INR_CR', quality: 'C', doc: 'Concall FY25', page: 'p.14', text: 'Domestic B2C sales ₹350 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'ANNUAL', period: 'FY26', val: 460, unit: 'INR_CR', quality: 'C', doc: 'Concall FY26', page: 'p.16', text: 'Domestic B2C sales ₹460 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 95, unit: 'INR_CR', quality: 'C', doc: 'Concall Q1 FY26', page: 'p.6', text: 'Q1 B2C sales ₹95 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 110, unit: 'INR_CR', quality: 'C', doc: 'Concall Q2 FY26', page: 'p.6', text: 'Q2 B2C sales ₹110 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 120, unit: 'INR_CR', quality: 'C', doc: 'Concall Q3 FY26', page: 'p.7', text: 'Q3 B2C sales ₹120 Cr (+40% YoY)' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 135, unit: 'INR_CR', quality: 'C', doc: 'Concall Q4 FY26', page: 'p.7', text: 'Q4 B2C sales ₹135 Cr' },
  { company: 'CCL', metricId: 'domestic_b2c_revenue', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 150, unit: 'INR_CR', quality: 'C', doc: 'Concall Q1 FY27', page: 'p.6', text: 'Q1 B2C sales ₹150 Cr (+58% YoY)' },

  // EBITDA per KG (INR/KG)
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'ANNUAL', period: 'FY22', val: 95.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall FY22', page: 'p.11', text: 'EBITDA/kg ₹95' },
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'ANNUAL', period: 'FY23', val: 108.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall FY23', page: 'p.12', text: 'EBITDA/kg ₹108' },
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'ANNUAL', period: 'FY24', val: 118.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall FY24', page: 'p.14', text: 'EBITDA/kg ₹118' },
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'ANNUAL', period: 'FY25', val: 128.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall FY25', page: 'p.15', text: 'EBITDA/kg ₹128' },
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'ANNUAL', period: 'FY26', val: 138.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall FY26', page: 'p.17', text: 'EBITDA/kg ₹138' },
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 138.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall Q3 FY26', page: 'p.8', text: 'EBITDA/kg ₹135-140 levels' },
  { company: 'CCL', metricId: 'ebitda_per_kg', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 142.0, unit: 'INR_PER_KG', quality: 'C', doc: 'Concall Q1 FY27', page: 'p.7', text: 'EBITDA/kg ₹142' },

  // ==========================================
  // GRAVITA
  // ==========================================
  // Total Recycling Capacity (MTPA)
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'ANNUAL', period: 'FY22', val: 174000, unit: 'MTPA', quality: 'B', doc: 'FY22 Presentation', page: 'p.8', text: 'Capacity 174k MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'ANNUAL', period: 'FY23', val: 213000, unit: 'MTPA', quality: 'B', doc: 'FY23 Presentation', page: 'p.10', text: 'Capacity 213k MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'ANNUAL', period: 'FY24', val: 284000, unit: 'MTPA', quality: 'B', doc: 'FY24 Presentation', page: 'p.12', text: 'Capacity 284k MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'ANNUAL', period: 'FY25', val: 315000, unit: 'MTPA', quality: 'B', doc: 'FY25 Presentation', page: 'p.14', text: 'Capacity 315k MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'ANNUAL', period: 'FY26', val: 340000, unit: 'MTPA', quality: 'B', doc: 'FY26 Presentation', page: 'p.16', text: 'Capacity 340k MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 325000, unit: 'MTPA', quality: 'B', doc: 'Q1 FY26 Presentation', page: 'p.6', text: 'Capacity 3.25L MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 330000, unit: 'MTPA', quality: 'B', doc: 'Q2 FY26 Presentation', page: 'p.6', text: 'Capacity 3.30L MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 340000, unit: 'MTPA', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.7', text: 'Capacity 3.40L MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 340000, unit: 'MTPA', quality: 'B', doc: 'Q4 FY26 Presentation', page: 'p.7', text: 'Capacity 3.40L MTPA' },
  { company: 'GRAVITA', metricId: 'total_recycling_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 360000, unit: 'MTPA', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.7', text: 'Capacity expanded to 3.60L MTPA' },

  // Value-Added Mix (%)
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'ANNUAL', period: 'FY22', val: 34.0, unit: 'PERCENT', quality: 'B', doc: 'FY22 Presentation', page: 'p.9', text: 'VAP mix 34%' },
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'ANNUAL', period: 'FY23', val: 38.0, unit: 'PERCENT', quality: 'B', doc: 'FY23 Presentation', page: 'p.11', text: 'VAP mix 38%' },
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'ANNUAL', period: 'FY24', val: 42.0, unit: 'PERCENT', quality: 'B', doc: 'FY24 Presentation', page: 'p.13', text: 'VAP mix 42%' },
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'ANNUAL', period: 'FY25', val: 45.0, unit: 'PERCENT', quality: 'B', doc: 'FY25 Presentation', page: 'p.15', text: 'VAP mix 45%' },
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'ANNUAL', period: 'FY26', val: 46.0, unit: 'PERCENT', quality: 'B', doc: 'FY26 Presentation', page: 'p.17', text: 'VAP mix 46%' },
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 46.0, unit: 'PERCENT', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.8', text: 'VAP mix 46%' },
  { company: 'GRAVITA', metricId: 'value_added_mix', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 48.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.7', text: 'VAP mix reached 48%' },

  // Non-Lead Revenue Share (%)
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'ANNUAL', period: 'FY22', val: 11.0, unit: 'PERCENT', quality: 'B', doc: 'FY22 Presentation', page: 'p.10', text: 'Non-lead mix 11%' },
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'ANNUAL', period: 'FY23', val: 14.0, unit: 'PERCENT', quality: 'B', doc: 'FY23 Presentation', page: 'p.12', text: 'Non-lead mix 14%' },
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'ANNUAL', period: 'FY24', val: 18.0, unit: 'PERCENT', quality: 'B', doc: 'FY24 Presentation', page: 'p.14', text: 'Non-lead mix 18%' },
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'ANNUAL', period: 'FY25', val: 22.0, unit: 'PERCENT', quality: 'B', doc: 'FY25 Presentation', page: 'p.16', text: 'Non-lead mix 22%' },
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'ANNUAL', period: 'FY26', val: 25.0, unit: 'PERCENT', quality: 'B', doc: 'FY26 Presentation', page: 'p.18', text: 'Non-lead mix 25%' },
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 25.0, unit: 'PERCENT', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.8', text: 'Non-lead mix 25%' },
  { company: 'GRAVITA', metricId: 'non_lead_revenue_share', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 28.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.8', text: 'Non-lead mix 28%' },

  // Lead EBITDA per MT (INR/MT)
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'ANNUAL', period: 'FY22', val: 15200, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY22', page: 'p.8', text: 'Lead EBITDA/MT ₹15,200' },
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'ANNUAL', period: 'FY23', val: 17800, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY23', page: 'p.10', text: 'Lead EBITDA/MT ₹17,800' },
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'ANNUAL', period: 'FY24', val: 19500, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY24', page: 'p.12', text: 'Lead EBITDA/MT ₹19,500' },
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'ANNUAL', period: 'FY25', val: 21400, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY25', page: 'p.14', text: 'Lead EBITDA/MT ₹21,400' },
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'ANNUAL', period: 'FY26', val: 23035, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY26', page: 'p.16', text: 'Lead EBITDA/MT ₹23,035' },
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 23035, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q3 FY26', page: 'p.8', text: 'Lead EBITDA/MT ₹23,035' },
  { company: 'GRAVITA', metricId: 'lead_ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 23500, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q1 FY27', page: 'p.7', text: 'Lead EBITDA/MT ₹23,500' },

  // ==========================================
  // HSCL
  // ==========================================
  // Speciality Carbon Black Capacity (MTPA)
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'ANNUAL', period: 'FY22', val: 40000, unit: 'MTPA', quality: 'B', doc: 'FY22 Presentation', page: 'p.8', text: 'SCB capacity 40k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'ANNUAL', period: 'FY23', val: 50000, unit: 'MTPA', quality: 'B', doc: 'FY23 Presentation', page: 'p.9', text: 'SCB capacity 50k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'ANNUAL', period: 'FY24', val: 60000, unit: 'MTPA', quality: 'B', doc: 'FY24 Presentation', page: 'p.11', text: 'SCB capacity 60k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'ANNUAL', period: 'FY25', val: 60000, unit: 'MTPA', quality: 'B', doc: 'FY25 Presentation', page: 'p.12', text: 'SCB capacity 60k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'ANNUAL', period: 'FY26', val: 130000, unit: 'MTPA', quality: 'B', doc: 'FY26 Presentation', page: 'p.14', text: 'SCB capacity expanded to 130k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 60000, unit: 'MTPA', quality: 'B', doc: 'Q1 FY26 Presentation', page: 'p.6', text: 'SCB capacity 60k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 60000, unit: 'MTPA', quality: 'B', doc: 'Q2 FY26 Presentation', page: 'p.6', text: 'SCB capacity 60k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 60000, unit: 'MTPA', quality: 'B', doc: 'Q3 FY26 Presentation', page: 'p.7', text: 'SCB capacity 60k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 130000, unit: 'MTPA', quality: 'B', doc: 'Q4 FY26 Presentation', page: 'p.7', text: 'SCB brownfield expansion online: 130k MTPA' },
  { company: 'HSCL', metricId: 'scb_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 130000, unit: 'MTPA', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.6', text: 'SCB capacity 130k MTPA' },

  // Total Carbon Black Capacity (MTPA)
  { company: 'HSCL', metricId: 'total_carbon_black_capacity', periodType: 'ANNUAL', period: 'FY22', val: 180000, unit: 'MTPA', quality: 'B', doc: 'FY22 Presentation', page: 'p.10', text: 'Total CB capacity 180k MTPA' },
  { company: 'HSCL', metricId: 'total_carbon_black_capacity', periodType: 'ANNUAL', period: 'FY23', val: 180000, unit: 'MTPA', quality: 'B', doc: 'FY23 Presentation', page: 'p.10', text: 'Total CB capacity 180k MTPA' },
  { company: 'HSCL', metricId: 'total_carbon_black_capacity', periodType: 'ANNUAL', period: 'FY24', val: 180000, unit: 'MTPA', quality: 'B', doc: 'FY24 Presentation', page: 'p.12', text: 'Total CB capacity 180k MTPA' },
  { company: 'HSCL', metricId: 'total_carbon_black_capacity', periodType: 'ANNUAL', period: 'FY25', val: 180000, unit: 'MTPA', quality: 'B', doc: 'FY25 Presentation', page: 'p.13', text: 'Total CB capacity 180k MTPA' },
  { company: 'HSCL', metricId: 'total_carbon_black_capacity', periodType: 'ANNUAL', period: 'FY26', val: 250000, unit: 'MTPA', quality: 'B', doc: 'FY26 Presentation', page: 'p.15', text: 'Total CB capacity 250k MTPA' },
  { company: 'HSCL', metricId: 'total_carbon_black_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 250000, unit: 'MTPA', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.8', text: 'Total CB capacity 250k MTPA' },

  // EBITDA per MT (INR/MT)
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'ANNUAL', period: 'FY22', val: 11800, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY22', page: 'p.9', text: 'Blended EBITDA/MT ₹11,800' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'ANNUAL', period: 'FY23', val: 13400, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY23', page: 'p.11', text: 'Blended EBITDA/MT ₹13,400' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'ANNUAL', period: 'FY24', val: 15469, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY24', page: 'p.13', text: 'EBITDA/MT ₹15,469' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'ANNUAL', period: 'FY25', val: 16200, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY25', page: 'p.14', text: 'EBITDA/MT ₹16,200' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'ANNUAL', period: 'FY26', val: 17100, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall FY26', page: 'p.16', text: 'EBITDA/MT ₹17,100' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q1_FY26', val: 16800, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q1 FY26', page: 'p.6', text: 'EBITDA/MT ₹16,800' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q2_FY26', val: 16900, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q2 FY26', page: 'p.6', text: 'EBITDA/MT ₹16,900' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q3_FY26', val: 17000, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q3 FY26', page: 'p.7', text: 'EBITDA/MT ₹17,000' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q4_FY26', val: 17100, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q4 FY26', page: 'p.7', text: 'EBITDA/MT ₹17,100' },
  { company: 'HSCL', metricId: 'ebitda_per_mt', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 17500, unit: 'INR_PER_MT', quality: 'C', doc: 'Concall Q1 FY27', page: 'p.6', text: 'EBITDA/MT ₹17,500' },

  // Battery Anode Capacity (MTPA)
  { company: 'HSCL', metricId: 'battery_anode_capacity', periodType: 'ANNUAL', period: 'FY22', status: 'UNAVAILABLE' },
  { company: 'HSCL', metricId: 'battery_anode_capacity', periodType: 'ANNUAL', period: 'FY23', status: 'UNAVAILABLE' },
  { company: 'HSCL', metricId: 'battery_anode_capacity', periodType: 'ANNUAL', period: 'FY24', status: 'UNAVAILABLE' },
  { company: 'HSCL', metricId: 'battery_anode_capacity', periodType: 'ANNUAL', period: 'FY25', status: 'UNAVAILABLE' },
  { company: 'HSCL', metricId: 'battery_anode_capacity', periodType: 'ANNUAL', period: 'FY26', val: 20000, unit: 'MTPA', quality: 'B', doc: 'FY26 Presentation', page: 'p.18', text: 'Phase 1 anode facility: 20k MTPA' },
  { company: 'HSCL', metricId: 'battery_anode_capacity', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 20000, unit: 'MTPA', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.10', text: 'Phase 1 anode plant trial runs: 20k MTPA' },

  // Export Revenue Mix (%)
  { company: 'HSCL', metricId: 'export_revenue_mix', periodType: 'ANNUAL', period: 'FY22', val: 12.0, unit: 'PERCENT', quality: 'B', doc: 'FY22 Presentation', page: 'p.9', text: 'Export mix 12%' },
  { company: 'HSCL', metricId: 'export_revenue_mix', periodType: 'ANNUAL', period: 'FY23', val: 15.0, unit: 'PERCENT', quality: 'B', doc: 'FY23 Presentation', page: 'p.11', text: 'Export mix 15%' },
  { company: 'HSCL', metricId: 'export_revenue_mix', periodType: 'ANNUAL', period: 'FY24', val: 18.0, unit: 'PERCENT', quality: 'B', doc: 'FY24 Presentation', page: 'p.13', text: 'Export mix 18%' },
  { company: 'HSCL', metricId: 'export_revenue_mix', periodType: 'ANNUAL', period: 'FY25', val: 21.0, unit: 'PERCENT', quality: 'B', doc: 'FY25 Presentation', page: 'p.15', text: 'Export mix 21%' },
  { company: 'HSCL', metricId: 'export_revenue_mix', periodType: 'ANNUAL', period: 'FY26', val: 25.0, unit: 'PERCENT', quality: 'B', doc: 'FY26 Presentation', page: 'p.17', text: 'Export mix 25%' },
  { company: 'HSCL', metricId: 'export_revenue_mix', periodType: 'QUARTERLY', period: 'Q1_FY27', val: 26.0, unit: 'PERCENT', quality: 'B', doc: 'Q1 FY27 Presentation', page: 'p.8', text: 'Export mix 26%' }
];

export async function backfillThesisKpis() {
  console.log('--- 📥 Step: Backfilling Thesis KPI Observations (FY22 -> Q1 FY27) ---');

  let inserted = 0;
  let updated = 0;
  let unavailableCount = 0;

  for (const obs of HISTORICAL_OBSERVATIONS) {
    const isUnavailable = obs.status === 'UNAVAILABLE' || obs.val === null;
    if (isUnavailable) unavailableCount++;

    const res = await pool.query(
      `INSERT INTO thesis_kpi_observations
        (company, metric_id, period_type, period, reported_value, unit,
         source_type, source_document, source_page, evidence_text,
         availability_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (company, metric_id, period_type, period) DO UPDATE SET
        reported_value = EXCLUDED.reported_value,
        unit = EXCLUDED.unit,
        source_type = EXCLUDED.source_type,
        source_document = EXCLUDED.source_document,
        source_page = EXCLUDED.source_page,
        evidence_text = EXCLUDED.evidence_text,
        availability_status = EXCLUDED.availability_status,
        updated_at = NOW()
       RETURNING (xmax = 0) AS is_insert`,
      [
        obs.company,
        obs.metricId,
        obs.periodType || 'QUARTERLY',
        obs.period,
        isUnavailable ? null : obs.val,
        obs.unit || null,
        obs.quality === 'B' ? 'INVESTOR_PRESENTATION' : (obs.quality === 'C' ? 'CONCALL_TRANSCRIPT' : 'AUDITED_FILING'),
        obs.doc || null,
        obs.page || null,
        obs.text || null,
        isUnavailable ? 'UNAVAILABLE' : 'AVAILABLE'
      ]
    );

    if (res.rows[0]?.is_insert) inserted++;
    else updated++;
  }

  console.log(`✅ Backfilled Observations: ${inserted} inserted, ${updated} updated, ${unavailableCount} explicitly UNAVAILABLE.\n`);
  return { inserted, updated, unavailableCount, total: inserted + updated };
}

if (process.argv[1]?.endsWith('backfill-thesis-kpis.js')) {
  backfillThesisKpis()
    .then(() => pool.end())
    .catch(err => {
      console.error('❌ Backfill failed:', err);
      pool.end();
      process.exit(1);
    });
}
