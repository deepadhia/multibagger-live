# Server Data Health & Reconciliation Audit Report
## Execution Mode: 🟡 DRY-RUN PREVIEW

**Timestamp**: 2026-08-21T19:28:20.008Z  
**Total Stocks Evaluated**: 20  
**Total Anomalies Detected**: 398  
**Total Repairs Executed**: 0  

---

### Universe Data Health Table

| Ticker | Company Name | Quarters (XBRL) | Daily Prices | Commitments | Announcements | Anomalies | Repairs | Health Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **HBLENGINE** | HBL Engineering Limited | 5 | 1376 | 28 | 78 | 1 | 0 | **90%** |
| **GRAVITA** | Gravita India | 11 | 2226 | 511 | 415 | 26 | 0 | **90%** |
| **ASTRAMICRO** | Astra Microwave Products | 13 | 2225 | 444 | 184 | 22 | 0 | **90%** |
| **MOREPENLAB** | Morepen Laboratories Limited | 13 | 1486 | 0 | 0 | 14 | 0 | **90%** |
| **INOXINDIA** | INOX India | 11 | 1216 | 393 | 206 | 22 | 0 | **90%** |
| **CCL** | CCL Products | 14 | 2225 | 195 | 154 | 25 | 0 | **90%** |
| **GULPOLY** | Gulshan Polyols Ltd share price | 10 | 743 | 180 | 29 | 16 | 0 | **90%** |
| **TIMETECHNO** | Time Technoplast | 9 | 1485 | 143 | 189 | 19 | 0 | **90%** |
| **SKIPPER** | Skipper Ltd share price | 17 | 743 | 130 | 253 | 28 | 0 | **90%** |
| **QPOWER** | Quality Power Electrical Equipments | 8 | 639 | 85 | 155 | 15 | 0 | **90%** |
| **LUMAXTECH** | Lumax Auto Technologies | 12 | 2225 | 307 | 245 | 20 | 0 | **90%** |
| **JSLL** | Jeena Sikho Lifecare Ltd share price | 0 | 744 | 374 | 272 | 1 | 0 | **90%** |
| **JYOTICNC** | Jyoti CNC Automation | 13 | 1184 | 384 | 164 | 22 | 0 | **90%** |
| **SJS** | SJS Enterprises | 10 | 1487 | 92 | 212 | 24 | 0 | **90%** |
| **TRANSRAILL** | Transrail Lighting Ltd share price | 9 | 411 | 144 | 182 | 19 | 0 | **90%** |
| **SHAKTIPUMP** | Shakti Pumps | 14 | 1485 | 140 | 257 | 25 | 0 | **90%** |
| **ANANTRAJ** | Anant Raj Limited | 17 | 2225 | 419 | 195 | 28 | 0 | **90%** |
| **POLICYBZR** | PB Fintech Ltd share price | 13 | 743 | 1 | 206 | 24 | 0 | **90%** |
| **SBCL** | Shivalik Bimetal Controls Ltd share price | 13 | 743 | 1 | 206 | 22 | 0 | **90%** |
| **ELECON** | Elecon Engineering | 14 | 2226 | 481 | 222 | 25 | 0 | **90%** |

---

### Granular Repair & Anomaly Logs

#### HBLENGINE (HBL Engineering Limited)
- **Detected Anomalies**:
  - ⚠️ Found 317 duplicate trading date entries in prices.

#### GRAVITA (Gravita India)
- **Detected Anomalies**:
  - ⚠️ Quarter FY24-Q3 (2023-12-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 810767bf-fdbf-4743-879d-08511bf57e14 for FY24-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q1 (2024-06-28) missing xbrl_filing_id relation.
  - ⚠️ Filing fa741377-db5a-43dc-b979-5a7b5e841ec4 for FY25-Q1 missing verified filing_date.
  - ⚠️ Quarter FY25-Q2 (2024-09-28) missing xbrl_filing_id relation.
  - ⚠️ Filing 4ce5da69-ad08-4023-aebd-11df535aed14 for FY25-Q2 missing verified filing_date.
  - ⚠️ Quarter FY25-Q3 (2024-12-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 4962e8f4-f705-4dfd-a8c2-39dc3eef4b6b for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q3 (2024-12-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 2385484c-eb07-4346-9336-84d13bc9ddd8 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 6afe5265-ab9e-4786-9125-e48b0b902133 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹10370700000 Cr) and PAT (₹949200000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 6059cf7c-8341-45dd-97bf-4f3793bf8735 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹10399400000 Cr) and PAT (₹930600000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 435ad126-6d29-42c3-8cc4-295f4ac60e2e for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹10355000000 Cr) and PAT (₹959700000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 315bff53-223c-4782-9326-a0f8e32c62b2 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹10170700000 Cr) and PAT (₹974900000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 84982435-9b81-4222-b462-ec5e3b407cf0 for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹11727600000 Cr) and PAT (₹918100000 Cr).
  - ⚠️ Found 741 duplicate trading date entries in prices.

#### ASTRAMICRO (Astra Microwave Products)
- **Detected Anomalies**:
  - ⚠️ Filing ddd9f272-6f4f-47d8-ac2f-fbda74356cc1 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 1a282952-c0d9-407f-8c7f-33e62b39b6d7 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing ddd9f272-6f4f-47d8-ac2f-fbda74356cc1 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing bb9c9f23-d5be-4ba8-a848-e9324450ffbf for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing ddd9f272-6f4f-47d8-ac2f-fbda74356cc1 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 1513dfa9-f854-4a97-a8ce-9eefe2972eed for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing ddd9f272-6f4f-47d8-ac2f-fbda74356cc1 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing ddd9f272-6f4f-47d8-ac2f-fbda74356cc1 for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 44ec2bd8-d482-4021-a853-bf5b02105f07 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing a84edeb1-bbcb-4a1f-98a9-da84c25eb8a6 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹4078512000 Cr) and PAT (₹734851000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing b9cff878-4d53-40a1-b546-870a71e7d412 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹1997250000 Cr) and PAT (₹162738000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 901cecb2-d089-487a-8425-e79c102becda for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹2145882000 Cr) and PAT (₹239040000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing ebf4037d-d347-4e89-8d69-e42fb5445b0a for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹2582357000 Cr) and PAT (₹388753000 Cr).
  - ⚠️ Found 740 duplicate trading date entries in prices.

#### MOREPENLAB (Morepen Laboratories Limited)
- **Detected Anomalies**:
  - ⚠️ Quarter FY24-Q1 (2023-06-29) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY24-Q2 (2023-09-29) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY24-Q3 (2023-12-30) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY24-Q4 (2024-03-30) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY25-Q1 (2024-06-29) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY25-Q2 (2024-09-29) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY25-Q3 (2024-12-30) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Quarter FY27-Q1 (2026-06-29) missing xbrl_filing_id relation.
  - ⚠️ Found 742 duplicate trading date entries in prices.

#### INOXINDIA (INOX India)
- **Detected Anomalies**:
  - ⚠️ Filing 77a80616-738d-474f-91cd-05f8ea8bbb0b for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 6c6626d5-2ce8-43ce-87e2-f8721858339f for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 77a80616-738d-474f-91cd-05f8ea8bbb0b for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing f5fc914f-8b0d-4637-85fb-d9ab79c78f0f for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 77a80616-738d-474f-91cd-05f8ea8bbb0b for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 77a80616-738d-474f-91cd-05f8ea8bbb0b for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing b4839b01-1433-40cf-9d38-4372e09497a8 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹3691435000 Cr) and PAT (₹651322000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 4ea36eca-1f94-433d-9ea3-9849877949d1 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹3273915000 Cr) and PAT (₹603952000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 5e07120a-ad01-4779-b641-2f3f57dcc670 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹3555626000 Cr) and PAT (₹608379000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing ef38ae7b-acc1-4565-809d-af8ded4d6a9a for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹4188554000 Cr) and PAT (₹606955000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing d6b02889-e5b8-4d5a-8419-2801782564d9 for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹4554630000 Cr) and PAT (₹752371000 Cr).
  - ⚠️ Found 556 duplicate trading date entries in prices.

#### CCL (CCL Products)
- **Detected Anomalies**:
  - ⚠️ Filing 68ce0a8a-74fb-420d-b738-2fe6300e8e6b for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing faf013c1-2413-464a-9c05-fff4776e870f for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 68ce0a8a-74fb-420d-b738-2fe6300e8e6b for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing fe00cd5b-ed5d-4932-bdf1-a88e0dd67079 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 68ce0a8a-74fb-420d-b738-2fe6300e8e6b for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 672cb5a5-4852-40f1-861a-74b38c683bae for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 68ce0a8a-74fb-420d-b738-2fe6300e8e6b for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 68ce0a8a-74fb-420d-b738-2fe6300e8e6b for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing c3c86edd-8964-42c4-84ee-16a2b1ded83d for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 4da89240-3e6e-42b0-aeec-32060048e42d for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹8358476000 Cr) and PAT (₹1018684000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing a9dad63c-69ad-4c3b-aefd-8180859543e4 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹5348108000 Cr) and PAT (₹724486000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 8ce747fd-9736-4ded-a25b-056797257a29 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹5591802000 Cr) and PAT (₹1008575000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 3123b59d-537b-4e63-b601-5fb1e4b08ad8 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹5642943000 Cr) and PAT (₹1002678000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 591bc55c-e3e1-4bbf-b667-9385946366cd for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹12244438000 Cr) and PAT (₹1073135000 Cr).
  - ⚠️ Found 740 duplicate trading date entries in prices.

#### GULPOLY (Gulshan Polyols Ltd share price)
- **Detected Anomalies**:
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 53180d1f-9a2a-42cb-b9b5-1649c784db08 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹5148819000 Cr) and PAT (₹70059000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing e864e3ca-3af5-4ddb-a757-dd36a91c061d for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹5932322000 Cr) and PAT (₹131404000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 71ec911d-7c82-4909-b60f-e4a5b25218b9 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹5417193000 Cr) and PAT (₹157512000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 5e8a4a43-3e47-45b4-9699-9cb8c3a68b54 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹6266518000 Cr) and PAT (₹409044000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing b5001239-6a9c-417a-be3d-7fb8321c953b for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹5508184000 Cr) and PAT (₹375403000 Cr).
  - ⚠️ Found 1 duplicate trading date entries in prices.

#### TIMETECHNO (Time Technoplast)
- **Detected Anomalies**:
  - ⚠️ Quarter FY24-Q3 (2023-12-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 40240cd9-4860-4fa9-80e7-368b5a64039e for FY24-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q1 (2024-06-28) missing xbrl_filing_id relation.
  - ⚠️ Filing 19a11b00-af3b-49d8-908c-1b89b5e4bdb6 for FY25-Q1 missing verified filing_date.
  - ⚠️ Quarter FY25-Q2 (2024-09-28) missing xbrl_filing_id relation.
  - ⚠️ Filing 147bd7ed-18d3-41d7-9c77-6ae1d02144db for FY25-Q2 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 887b73a8-16c5-4da5-b5c4-4a4d7eb482b9 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹7123300000 Cr) and PAT (₹500300000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 264ecc7f-a795-4a42-931f-429b61664b91 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹6424600000 Cr) and PAT (₹448300000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 8258c043-4235-4544-a91e-f8aed2187dd4 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹7397400000 Cr) and PAT (₹1172400000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing bea11589-5c19-4c74-b8ef-9ad5d32b8de4 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹6896300000 Cr) and PAT (₹1285200000 Cr).
  - ⚠️ Found 641 duplicate trading date entries in prices.

#### SKIPPER (Skipper Ltd share price)
- **Detected Anomalies**:
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing da098010-db27-44c4-bd5d-cd685d1669f0 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing e340948b-3ea7-4e10-8892-1e7e872a675a for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 97e6fd11-55f4-4ea3-8d93-8143c063043c for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 331d0c36-a1f2-4bbd-9ecf-d59ac1a37243 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹12877520000 Cr) and PAT (₹479050000 Cr).
  - ⚠️ Filing 0b22fb22-29c6-476b-9f1d-4ea06a9e7179 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹12877520000 Cr) and PAT (₹479050000 Cr).
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹12538620000 Cr) and PAT (₹446600000 Cr).
  - ⚠️ Filing 4c452e5c-924a-4123-8787-e7c6ecf1f644 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹12538620000 Cr) and PAT (₹446600000 Cr).
  - ⚠️ Filing 473194bb-18e7-470b-8956-418390042e84 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹12617870000 Cr) and PAT (₹368910000 Cr).
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹12617870000 Cr) and PAT (₹368910000 Cr).
  - ⚠️ Filing e1cf284b-ab7a-45bd-b5fe-ea995d8d4155 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹13705910000 Cr) and PAT (₹501690000 Cr).
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹13705910000 Cr) and PAT (₹501690000 Cr).
  - ⚠️ Filing 12a6d8d2-bfb3-4cba-87d0-9cc8fa1499d3 for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹16665820000 Cr) and PAT (₹1260130000 Cr).
  - ⚠️ Filing ac7c6ef6-82c7-4285-a0b8-12ffd3ec360d for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹16665820000 Cr) and PAT (₹1260130000 Cr).
  - ⚠️ Found 1 duplicate trading date entries in prices.

#### QPOWER (Quality Power Electrical Equipments)
- **Detected Anomalies**:
  - ⚠️ Filing cde00624-d04d-436b-9d27-9327066c0947 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing d9cd9e53-5c38-40ab-9787-5cc36ca98886 for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 50521178-b302-4941-adb8-083756110ddd for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing d9cd9e53-5c38-40ab-9787-5cc36ca98886 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹1083230000 Cr) and PAT (₹305010000 Cr).
  - ⚠️ Filing d9cd9e53-5c38-40ab-9787-5cc36ca98886 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹1767170000 Cr) and PAT (₹370640000 Cr).
  - ⚠️ Filing d9cd9e53-5c38-40ab-9787-5cc36ca98886 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹2057580000 Cr) and PAT (₹351680000 Cr).
  - ⚠️ Filing d9cd9e53-5c38-40ab-9787-5cc36ca98886 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹2839910000 Cr) and PAT (₹627650000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 366748a7-a2b8-4fee-8a98-933c81638a17 for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹2808080000 Cr) and PAT (₹505510000 Cr).
  - ⚠️ Found 269 duplicate trading date entries in prices.

#### LUMAXTECH (Lumax Auto Technologies)
- **Detected Anomalies**:
  - ⚠️ Filing 4422f88e-a05f-4174-935d-2624f33f9bff for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 61d0c4fd-1733-49f0-9f35-b0f2633a9869 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 61d0c4fd-1733-49f0-9f35-b0f2633a9869 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 61d0c4fd-1733-49f0-9f35-b0f2633a9869 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 8001c8d6-6f85-46b6-bd26-9bb369c3e47f for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 61d0c4fd-1733-49f0-9f35-b0f2633a9869 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing e5bb03f5-3583-43da-ae3b-17fbd85879e4 for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 61d0c4fd-1733-49f0-9f35-b0f2633a9869 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing c2a8129e-c16d-45af-a195-cbb2431b51a8 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 0b7e192e-09ec-48de-bd39-f4441628be3f for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹3673953000 Cr) and PAT (₹403423000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing a6865833-bf75-4608-9212-8236288873a7 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹4360019000 Cr) and PAT (₹775554000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 05079400-abba-4c8a-a819-f6558e91f67d for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹4552377000 Cr) and PAT (₹1080630000 Cr).
  - ⚠️ Found 742 duplicate trading date entries in prices.

#### JSLL (Jeena Sikho Lifecare Ltd share price)
- **Detected Anomalies**:
  - ⚠️ Found 2 duplicate trading date entries in prices.

#### JYOTICNC (Jyoti CNC Automation)
- **Detected Anomalies**:
  - ⚠️ Filing 15936c77-dcbd-4673-b069-b73ba218d795 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 2e785960-9a8e-4133-a85f-bf05d825a66f for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 15936c77-dcbd-4673-b069-b73ba218d795 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 15936c77-dcbd-4673-b069-b73ba218d795 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 5e1441b6-8b3f-4056-950a-af7432e4e47d for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 70fd6829-fc92-4ee4-927f-cefd0c70d131 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 15936c77-dcbd-4673-b069-b73ba218d795 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 15936c77-dcbd-4673-b069-b73ba218d795 for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing e56a5699-95be-43e8-a8cc-a6d7f6f8e073 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing e03cc3e6-d387-43e3-9fe3-53fa5b5408f6 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹5756800000 Cr) and PAT (₹1089700000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 24c5a9f7-0150-40fd-82d5-fa2af92c6175 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹4101700000 Cr) and PAT (₹714200000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 0408435f-f82f-45c6-b1f4-e6baf4e53501 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹5079000000 Cr) and PAT (₹855000000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 7cceb597-cee0-4f2e-be59-c786ec8bc447 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹5759000000 Cr) and PAT (₹885100000 Cr).
  - ⚠️ Found 540 duplicate trading date entries in prices.

#### SJS (SJS Enterprises)
- **Detected Anomalies**:
  - ⚠️ Quarter FY25-Q1 (2024-06-28) missing xbrl_filing_id relation.
  - ⚠️ Filing b31acdcc-df10-41bf-9974-727e59b65845 for FY25-Q1 missing verified filing_date.
  - ⚠️ Quarter FY25-Q2 (2024-09-28) missing xbrl_filing_id relation.
  - ⚠️ Filing f9e80fe0-bb21-427a-a018-5a6707a91135 for FY25-Q2 missing verified filing_date.
  - ⚠️ Quarter FY25-Q3 (2024-12-29) missing xbrl_filing_id relation.
  - ⚠️ Filing cdaefe1b-9dac-4bf9-bea4-e82b782aef88 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q3 (2024-12-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 6cc6ebfb-382e-4ddb-be4d-382d2e0782c3 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing c02ac0f1-b446-4db5-9942-ee96c1908426 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹2005120000 Cr) and PAT (₹337340000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 630e9044-43b1-40d4-b556-fba8ea0954f6 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹2096580000 Cr) and PAT (₹346160000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 8bac26d6-d52d-4f13-b0e0-59362b86e2f0 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹2417570000 Cr) and PAT (₹432690000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 330e9b1b-e820-4fbb-9147-9b02c23b1890 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹2435310000 Cr) and PAT (₹450390000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 6329d1ba-f115-404e-b7d0-c9677a0a685a for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹2601220000 Cr) and PAT (₹488720000 Cr).
  - ⚠️ Found 644 duplicate trading date entries in prices.

#### TRANSRAILL (Transrail Lighting Ltd share price)
- **Detected Anomalies**:
  - ⚠️ Quarter FY24-Q4 (2024-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 0dce6357-5bc2-431f-8184-e72c954e6c1b for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 01681372-ce3d-4d62-b323-fc2ce8f7c52a for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 2ff16893-bbb3-4814-93eb-42c3ea32516e for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 2ff16893-bbb3-4814-93eb-42c3ea32516e for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing cf70cfeb-7fd3-4e4e-9f02-e378ca1f7a75 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 08838cee-0971-4411-839d-bed79067a405 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹19460200000 Cr) and PAT (₹1265700000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 8c8ee50c-5593-456a-8ac3-1b9564da35e9 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹16598400000 Cr) and PAT (₹1058200000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 96ff9bc0-d0dd-4efe-9395-de88ba174ba1 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹15609600000 Cr) and PAT (₹909800000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 9755f697-a070-44c2-8bf2-094a2247814d for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹17958400000 Cr) and PAT (₹1097400000 Cr).
  - ⚠️ Found 1 duplicate trading date entries in prices.

#### SHAKTIPUMP (Shakti Pumps)
- **Detected Anomalies**:
  - ⚠️ Filing f9fe3ffd-55e1-4529-b929-d03eff541e85 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 9481febd-6262-4d5b-8c8f-2fe50ba931ab for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 9481febd-6262-4d5b-8c8f-2fe50ba931ab for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 9481febd-6262-4d5b-8c8f-2fe50ba931ab for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing b8dde966-a3f0-45b2-9a66-363c0df05389 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 9481febd-6262-4d5b-8c8f-2fe50ba931ab for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 98d32036-482a-4a32-a7c4-4496071b7b21 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 2eec6188-5590-495c-b77d-ead9e83ba92b for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 9481febd-6262-4d5b-8c8f-2fe50ba931ab for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 5c112aba-14d5-4355-bd06-4d32d18519c5 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹6653200000 Cr) and PAT (₹1102300000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 8ea32229-97bf-451a-8e0d-dfe357f02534 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹6225000000 Cr) and PAT (₹968300000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing f4f818a1-6e70-4b46-8f34-2ab7d1689cbe for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹6663500000 Cr) and PAT (₹907100000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 8620917d-29e0-48f5-a2b1-8fe667264692 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹5460800000 Cr) and PAT (₹300500000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 468c1711-2357-4f4a-939a-b2e3b1562384 for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹8577700000 Cr) and PAT (₹383300000 Cr).
  - ⚠️ Found 641 duplicate trading date entries in prices.

#### ANANTRAJ (Anant Raj Limited)
- **Detected Anomalies**:
  - ⚠️ Filing c04aaaaf-9e3f-4fe8-82bc-01f711457464 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 2a025a1a-e322-40a9-9aac-b624cab4e794 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing b0eb3294-714f-4de0-821a-39eae38a5e0f for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 0e8e14b7-a0dc-45a9-9685-631b8c35a187 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹3372300000 Cr) and PAT (₹651100000 Cr).
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹3372300000 Cr) and PAT (₹651100000 Cr).
  - ⚠️ Filing ca5b2929-1b75-4933-bf77-0cc3577005fb for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹3524100000 Cr) and PAT (₹697000000 Cr).
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹3524100000 Cr) and PAT (₹697000000 Cr).
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹3706200000 Cr) and PAT (₹1381800000 Cr).
  - ⚠️ Filing 29a6a191-9292-49ad-9678-c8096667a73e for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹3706200000 Cr) and PAT (₹1381800000 Cr).
  - ⚠️ Filing e89d2e28-e553-4ff0-9aea-f20f919800b5 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹3740900000 Cr) and PAT (₹1442300000 Cr).
  - ⚠️ Filing 1bab9813-b407-4f98-8d3a-0a273f982da7 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹3740900000 Cr) and PAT (₹1442300000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing dbd389e2-91fd-4cb9-aa91-fa160cf40375 for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹3944000000 Cr) and PAT (₹1487100000 Cr).
  - ⚠️ Found 740 duplicate trading date entries in prices.

#### POLICYBZR (PB Fintech Ltd share price)
- **Detected Anomalies**:
  - ⚠️ Filing 17ddbd91-9333-4f35-98e7-a0cfd3859a84 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 7ab38fd4-4990-454c-b622-cc7455090af2 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 7ab38fd4-4990-454c-b622-cc7455090af2 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 7ab38fd4-4990-454c-b622-cc7455090af2 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 7f140619-5fc3-4d39-8063-3ecf64f53cb8 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 9ae88822-5e6c-4cfd-a42b-adee49ab37d2 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 7ab38fd4-4990-454c-b622-cc7455090af2 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 7ab38fd4-4990-454c-b622-cc7455090af2 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 9f9dd575-d432-450e-96b3-7115adb2544a for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹468500000 Cr) and PAT (₹-157900000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 63af2635-9c5b-40c1-b8cb-c1574b60fd53 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹13479900000 Cr) and PAT (₹846500000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing af45ffdb-286c-4561-86e9-cefc6552fb2b for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹493800000 Cr) and PAT (₹6900000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 83bf6468-7ed2-4911-bc8c-6eabda09507b for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹17711500000 Cr) and PAT (₹1894300000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 44f4c762-62c5-4e07-9315-b74631e5f35f for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹651400000 Cr) and PAT (₹177800000 Cr).
  - ⚠️ Found 1 duplicate trading date entries in prices.

#### SBCL (Shivalik Bimetal Controls Ltd share price)
- **Detected Anomalies**:
  - ⚠️ Filing caced84f-5781-41b0-9165-c43d105449a6 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing eae92164-0162-4ce1-b444-1178cceb26ef for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing eae92164-0162-4ce1-b444-1178cceb26ef for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 393ae886-a5ee-4be6-9028-9589b46fba89 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing eae92164-0162-4ce1-b444-1178cceb26ef for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 50b4bd89-81d4-49a8-8adc-f0d69fe6e142 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing eae92164-0162-4ce1-b444-1178cceb26ef for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing eae92164-0162-4ce1-b444-1178cceb26ef for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 67e310ef-ba03-4bcd-9b5e-b8138578f2d4 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing a6e3c644-b635-4b04-b0ef-23b13fc66440 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹1324380000 Cr) and PAT (₹210516000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 2d1f6028-eaa8-4639-95b0-836f939df64b for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹1365968000 Cr) and PAT (₹227806000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing dfb31442-e0de-4022-b750-f6dcd9d7130d for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹1374025000 Cr) and PAT (₹248538000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 79c02840-87b8-4338-aa79-361f7bc4f213 for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹1342313000 Cr) and PAT (₹221768000 Cr).
  - ⚠️ Found 1 duplicate trading date entries in prices.

#### ELECON (Elecon Engineering)
- **Detected Anomalies**:
  - ⚠️ Filing 90fb92bb-668f-4abc-bbc2-00918787622b for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 4fd7f2b9-f7bd-45c4-94d0-da5f58502b08 for FY24-Q3 missing verified filing_date.
  - ⚠️ Filing 4fd7f2b9-f7bd-45c4-94d0-da5f58502b08 for FY24-Q4 missing verified filing_date.
  - ⚠️ Filing 4fd7f2b9-f7bd-45c4-94d0-da5f58502b08 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing a414de7e-968d-496f-8784-0e19d70d5674 for FY25-Q1 missing verified filing_date.
  - ⚠️ Filing 4fd7f2b9-f7bd-45c4-94d0-da5f58502b08 for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 6cea1815-0ecf-4c35-810c-a5b51eb4f6ca for FY25-Q2 missing verified filing_date.
  - ⚠️ Filing 0ce2a9cd-88a1-49c9-829e-f4eb2ec46e3e for FY25-Q3 missing verified filing_date.
  - ⚠️ Filing 4fd7f2b9-f7bd-45c4-94d0-da5f58502b08 for FY25-Q3 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 (2025-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing af22925a-9ee6-4edb-a1ee-7d493d53a1a2 for FY25-Q4 missing verified filing_date.
  - ⚠️ Quarter FY25-Q4 has null EBITDA with positive Revenue (₹7975700000 Cr) and PAT (₹1464800000 Cr).
  - ⚠️ Quarter FY26-Q1 (2025-06-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 851ae8fb-aad8-484b-bc3b-f07e95d0e0f5 for FY26-Q1 missing verified filing_date.
  - ⚠️ Quarter FY26-Q1 has null EBITDA with positive Revenue (₹4905700000 Cr) and PAT (₹1754400000 Cr).
  - ⚠️ Quarter FY26-Q2 (2025-09-29) missing xbrl_filing_id relation.
  - ⚠️ Filing 37c05d46-9748-422c-bef7-a2abc51bf051 for FY26-Q2 missing verified filing_date.
  - ⚠️ Quarter FY26-Q2 has null EBITDA with positive Revenue (₹5781300000 Cr) and PAT (₹877200000 Cr).
  - ⚠️ Quarter FY26-Q3 (2025-12-30) missing xbrl_filing_id relation.
  - ⚠️ Filing a8b3b7c0-f34f-4373-bfa5-ba1619aecd1f for FY26-Q3 missing verified filing_date.
  - ⚠️ Quarter FY26-Q3 has null EBITDA with positive Revenue (₹5517400000 Cr) and PAT (₹719900000 Cr).
  - ⚠️ Quarter FY26-Q4 (2026-03-30) missing xbrl_filing_id relation.
  - ⚠️ Filing 4a11fb23-d379-4539-985c-67220bec37bc for FY26-Q4 missing verified filing_date.
  - ⚠️ Quarter FY26-Q4 has null EBITDA with positive Revenue (₹7456100000 Cr) and PAT (₹60000000 Cr).
  - ⚠️ Found 741 duplicate trading date entries in prices.

