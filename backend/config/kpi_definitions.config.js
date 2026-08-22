/**
 * Static KPI Definitions for Thesis KPI Shadow Engine v1.0
 * 5 Core Evolving Multibagger Stories (3-5 high-conviction KPIs each).
 */

export const KPI_DEFINITIONS = {
  TIMETECHNO: [
    {
      metricId: 'vap_revenue',
      metricName: 'Value-Added Products Revenue',
      category: 'revenue',
      unit: 'INR_CR',
      thesisLink: 'VAP (composite cylinders & IBCs) margin transition from legacy packaging',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'vap_revenue_share',
      metricName: 'Value-Added Product Revenue Share',
      category: 'revenue_mix',
      unit: 'PERCENT',
      thesisLink: 'VAP share expanding past 25-30% of consolidated turnover',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'vap_capacity',
      metricName: 'Type-IV Composite Cylinder Capacity',
      category: 'capacity',
      unit: 'UNITS',
      thesisLink: 'Capacity ramp-up to service PESO approved CNG & Hydrogen cascade demand',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 2
    },
    {
      metricId: 'vap_order_book',
      metricName: 'Type-IV Cascade Order Backlog',
      category: 'order_book',
      unit: 'INR_CR',
      thesisLink: 'Multi-year visibility from major CGD players (Indraprastha, Mahanagar, IOCL)',
      expectedDirection: 'UP',
      measurementQuality: 'C',
      sourcePriority: 2
    },
    {
      metricId: 'vap_capex',
      metricName: 'High-Pressure Composite Capex Allocation',
      category: 'capex',
      unit: 'INR_CR',
      thesisLink: 'Capital reinvestment earmarked specifically for composites expansion',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 3
    }
  ],

  LUMAXTECH: [
    {
      metricId: 'emerging_product_revenue',
      metricName: 'Advanced & Emerging Product Revenue',
      category: 'revenue',
      unit: 'INR_CR',
      thesisLink: 'Pivot toward high-margin mechatronics, sensors, and electronic gear shifters',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'electronic_mechatronic_mix',
      metricName: 'Electronic & Mechatronic Revenue Mix',
      category: 'revenue_mix',
      unit: 'PERCENT',
      thesisLink: 'Increasing share of electronic content per vehicle displacing mechanical parts',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'ev_order_wins',
      metricName: 'EV & Hybrid Platform Order Wins Backlog',
      category: 'order_book',
      unit: 'INR_CR',
      thesisLink: 'Order backlog for next-generation electric & hybrid 2W/4W platforms',
      expectedDirection: 'UP',
      measurementQuality: 'C',
      sourcePriority: 2
    },
    {
      metricId: 'advanced_capacity',
      metricName: 'Electronics & Sensor Manufacturing Capacity',
      category: 'capacity',
      unit: 'UNITS',
      thesisLink: 'Facility footprint expansion at Chakan and Bawal for IAC / Lumax tech',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 2
    }
  ],

  CCL: [
    {
      metricId: 'specialty_coffee_mix',
      metricName: 'Freeze-Dried & Value-Added Coffee Mix',
      category: 'revenue_mix',
      unit: 'PERCENT',
      thesisLink: 'Shift from commoditized spray-dried coffee to premium freeze-dried products',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'freeze_dried_capacity',
      metricName: 'Freeze-Dried Instant Coffee Capacity',
      category: 'capacity',
      unit: 'MTPA',
      thesisLink: 'Global manufacturing scale in Vietnam & India servicing international private labels',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'domestic_b2c_revenue',
      metricName: 'Domestic Branded B2C Revenue',
      category: 'revenue',
      unit: 'INR_CR',
      thesisLink: 'Continental Coffee B2C distribution scaling into domestic retail leadership',
      expectedDirection: 'UP',
      measurementQuality: 'C',
      sourcePriority: 2
    },
    {
      metricId: 'ebitda_per_kg',
      metricName: 'Value-Added EBITDA per KG',
      category: 'operational_efficiency',
      unit: 'INR_PER_KG',
      thesisLink: 'Unit economic expansion from ₹90-100/kg up to ₹135-140/kg levels',
      expectedDirection: 'UP',
      measurementQuality: 'C',
      sourcePriority: 2
    }
  ],

  GRAVITA: [
    {
      metricId: 'total_recycling_capacity',
      metricName: 'Total Operational Recycling Capacity',
      category: 'capacity',
      unit: 'MTPA',
      thesisLink: 'Scaling global recycling capacity across Lead, Aluminum, Plastic & Rubber',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'value_added_mix',
      metricName: 'Value-Added Lead & Alloys Mix',
      category: 'revenue_mix',
      unit: 'PERCENT',
      thesisLink: 'High-margin pure lead and specialized alloys expanding past 45-50% mix',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'non_lead_revenue_share',
      metricName: 'Non-Lead (Aluminum/Plastic/Rubber) Revenue Share',
      category: 'revenue_mix',
      unit: 'PERCENT',
      thesisLink: 'Diversification of circular economy earnings away from pure lead recycling',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 2
    },
    {
      metricId: 'lead_ebitda_per_mt',
      metricName: 'Lead Recycling EBITDA per MT',
      category: 'operational_efficiency',
      unit: 'INR_PER_MT',
      thesisLink: 'Value-add spread protection exceeding ₹20,000-23,000/MT via geographical arbitrage',
      expectedDirection: 'UP',
      measurementQuality: 'C',
      sourcePriority: 2
    }
  ],

  HSCL: [
    {
      metricId: 'scb_capacity',
      metricName: 'Speciality Carbon Black Capacity',
      category: 'capacity',
      unit: 'MTPA',
      thesisLink: 'Expansion from 60,000 to 130,000 MTPA displacing Chinese niche grades',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'total_carbon_black_capacity',
      metricName: 'Total Carbon Black Operational Capacity',
      category: 'capacity',
      unit: 'MTPA',
      thesisLink: 'Total installed base driving fixed-cost dilution and operating leverage',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 1
    },
    {
      metricId: 'ebitda_per_mt',
      metricName: 'Specialty Chemicals EBITDA per MT',
      category: 'operational_efficiency',
      unit: 'INR_PER_MT',
      thesisLink: 'Unit margin expansion from ₹12,000/MT toward ₹17,000+/MT via value-added pitch & SCB',
      expectedDirection: 'UP',
      measurementQuality: 'C',
      sourcePriority: 2
    },
    {
      metricId: 'battery_anode_capacity',
      metricName: 'Synthetic Battery Anode Material Capacity',
      category: 'capacity',
      unit: 'MTPA',
      thesisLink: 'Phase-1 20,000 MTPA anode plant catering to EV & energy storage gigafactories',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 2
    },
    {
      metricId: 'export_revenue_mix',
      metricName: 'Advanced Materials Export Revenue Mix',
      category: 'revenue_mix',
      unit: 'PERCENT',
      thesisLink: 'Global export penetration to 50+ countries expanding blended margins',
      expectedDirection: 'UP',
      measurementQuality: 'B',
      sourcePriority: 2
    }
  ]
};
