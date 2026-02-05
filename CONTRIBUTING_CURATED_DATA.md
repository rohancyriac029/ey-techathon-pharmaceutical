# Contributing Curated Data

## Overview

This document establishes standards for manually collecting, verifying, and contributing curated pharmaceutical data to ensure all data meets enterprise-grade quality requirements.

---

## 🎯 Data Quality Principles

1. **Verify Every Data Point**: All curated data must be verified against authoritative sources
2. **Document Provenance**: Every entry requires source URL, collection date, and reviewer name
3. **Classify Confidence**: Explicitly mark confidence level (HIGH/MEDIUM/LOW)
4. **Update Regularly**: Curated data requires quarterly review and updates

---

## 📋 Patent Data Curation

### How to Verify a Patent Number

**USPTO Verification (US Patents)**

1. Visit USPTO Patent Public Search: https://ppubs.uspto.gov/pubwebapp/static/pages/landing.html
2. Search by patent number (e.g., "US8168620")
3. Verify:
   - ✅ Patent exists and number matches exactly
   - ✅ Patent title describes the molecule/technology
   - ✅ Filing date and expiry date are accurate
   - ✅ Assignee matches innovator company
4. Copy the USPTO URL as `ustptoVerificationUrl`

**India Patent Verification**

1. Visit IP India Public Search: https://iprsearch.ipindia.gov.in/PublicSearch
2. Search by patent number or molecule name
3. Download patent document PDF
4. Extract filing date, expiry date, and status
5. Store PDF reference as `ipIndiaUrl`

### Patent Classification Checklist

**Device vs Compound vs Formulation vs Process**

Use this decision tree:

```
Does patent title contain: "device", "inhaler", "pen", "delivery", "applicator"?
  → YES: DEVICE patent
  → NO: Continue

Does patent describe physical mechanism for drug delivery?
  → YES: DEVICE patent
  → NO: Continue

Does patent cover the chemical compound/molecule itself?
  → YES: COMPOUND patent
  → NO: Continue

Does patent cover specific formulation, dosage form, or composition?
  → YES: FORMULATION patent
  → NO: PROCESS patent
```

**Keywords for Classification:**

- **DEVICE**: device, inhaler, pen, injector, delivery system, applicator, nebulizer, autoinjector
- **COMPOUND**: compound, molecule, chemical structure, active ingredient, NCE (new chemical entity)
- **FORMULATION**: formulation, composition, dosage form, tablet, capsule, suspension, solution
- **PROCESS**: process, method of making, synthesis, manufacturing process, purification

### Required Metadata Fields

Every patent entry must include:

```json
{
  "molecule": "Tiotropium",
  "patentNumber": "US7104463B2",
  "patentType": "DEVICE",
  "isPrimary": false,
  "filingDate": "2000-09-20",
  "expiryDate": "2030-09-12",
  "status": "Active",
  "title": "Respimat Soft Mist Inhaler Device",
  "assignee": "Boehringer Ingelheim",
  "devicePatent": true,
  "ustptoVerificationUrl": "https://ppubs.uspto.gov/dirsearch-public/...",
  "reviewedBy": "Your Name",
  "reviewDate": "2026-02-05",
  "confidenceLevel": "HIGH",
  "notes": "Device patent extending exclusivity beyond compound patent expiry"
}
```

### Approval Checklist Before Committing Patent Data

- [ ] Patent number verified in USPTO/IP India
- [ ] Patent type classified using keyword checklist
- [ ] Filing date < Expiry date (logic check)
- [ ] Verification URL included and working
- [ ] Reviewer name and date added
- [ ] Confidence level assigned (HIGH for manual review, MEDIUM for heuristic)
- [ ] Notes explain any special circumstances (litigation, continuation patents, etc.)

---

## 🧪 Clinical Trial Outcome Verification

### When to Mark Outcome as Verified

**DO NOT mark outcome as verified unless:**

1. Published in peer-reviewed journal with DOI/PubMed ID
2. Results posted on ClinicalTrials.gov Results Database
3. FDA approval documents cite specific endpoints
4. Company press release with verifiable data

**Default for all trials: `outcomeVerified: false`**

### Required Fields for Verified Outcomes

```json
{
  "trialId": "NCT02345678",
  "outcome": "Positive",
  "outcomeVerified": true,
  "outcomeSource": "https://pubmed.ncbi.nlm.nih.gov/12345678",
  "outcomeNotes": "Primary endpoint met: HbA1c reduction of 1.2% vs placebo (p<0.001). Published in NEJM 2024.",
  "reviewedBy": "Your Name",
  "reviewDate": "2026-02-05"
}
```

---

## 🇮🇳 India Regulatory Data Curation

### CDSCO Approval Verification

**Sources:**
- CDSCO website: https://cdsco.gov.in/opencms/opencms/en/Drugs/New-Drugs/
- CDSCO monthly approved drugs list
- CDSCO gazette notifications

**Required Fields:**

```json
{
  "molecule": "Semaglutide",
  "approvalDate": "2019-03-15",
  "approvalType": "New Drug",
  "cdscoCitation": "CDSCO Gazette Notification March 2019",
  "sourceUrl": "https://cdsco.gov.in/...",
  "dateCollected": "2026-02-05",
  "reviewedBy": "Your Name",
  "verificationStatus": "VERIFIED"
}
```

### NPPA Ceiling Price Verification

**Sources:**
- NPPA official website: http://www.nppaindia.nic.in/
- NPPA price list downloads (Excel format)
- DPCO notification documents

**Required Fields:**

```json
{
  "molecule": "Metformin",
  "strength": "500mg",
  "ceilingPriceINR": 2.50,
  "mrpINR": 2.30,
  "dpcoScheduled": true,
  "nppaCitation": "NPPA Price List 2024-Q1",
  "lastUpdated": "2024-01-15",
  "sourceUrl": "http://www.nppaindia.nic.in/ceiling-price/",
  "reviewedBy": "Your Name"
}
```

---

## ⚖️ Patent Litigation Data

### Sources

- FDA Orange Book Patent and Exclusivity Listings
- FDA Orange Book Litigation Status (monthly updates)
- Federal Circuit court records (PACER system)
- Company investor relations announcements

### Required Fields

```json
{
  "molecule": "Tiotropium",
  "patentNumber": "US7104463B2",
  "case": "Boehringer Ingelheim v. Mylan Pharmaceuticals",
  "parties": ["Boehringer Ingelheim", "Mylan"],
  "filingDate": "2014-03-20",
  "outcome": "Settlement",
  "genericLaunchDate": "2021-01-15",
  "jurisdiction": "Federal Circuit",
  "riskLevel": "MEDIUM",
  "summary": "Settlement allowed generic entry in 2021 despite patent extending to 2030. Generic must use different device.",
  "sourceUrl": "https://www.accessdata.fda.gov/scripts/cder/ob/...",
  "reviewedBy": "Your Name",
  "reviewDate": "2026-02-05"
}
```

---

## 📊 Market Data Estimation (India)

### When Market Data is ESTIMATED (Not Verified)

India market sizing requires estimation when:
- NPPA provides ceiling price only (not actual transaction price)
- No public sales volume data available
- Market share must be inferred from manufacturer counts

### Confidence Bands Requirement

All India market estimates must include ±50% confidence bands:

```json
{
  "molecule": "Sitagliptin",
  "country": "IN",
  "estimatedRevenueUSD": 150000000,
  "confidenceBands": {
    "low": 75000000,
    "high": 225000000,
    "methodology": "NPPA ceiling price × estimated patient population × treatment rate"
  },
  "assumptions": [
    "Based on NPPA ceiling prices (regulatory caps, not transaction prices)",
    "Patient estimates from WHO 2024 epidemiology data",
    "Treatment rate estimated from IDF Diabetes Atlas",
    "Assumes uniform distribution across 15 generic manufacturers"
  ],
  "dataQuality": "ESTIMATED",
  "confidenceLevel": "LOW"
}
```

---

## 🔄 Quarterly Update Process

### Schedule

- **Q1 (January)**: Update NPPA price lists
- **Q2 (April)**: Review FDA Orange Book for new patents/litigation
- **Q3 (July)**: Update CDSCO approval lists
- **Q4 (October)**: Review CMS Part D data (released annually)

### Update Checklist

For each quarterly update:

1. [ ] Download latest source files (NPPA Excel, Orange Book, etc.)
2. [ ] Compare with existing curated data
3. [ ] Add new entries with full metadata
4. [ ] Update `lastVerified` date for unchanged entries
5. [ ] Document any changes in git commit message
6. [ ] Run validation script to ensure data quality
7. [ ] Update `CHANGELOG.md` with summary of changes

---

## ✅ Pre-Commit Validation

Before committing any curated data file, run:

```bash
npm run validate-data
```

This checks:
- ✅ All required fields present
- ✅ Date formats valid (YYYY-MM-DD)
- ✅ Patent numbers match USPTO/India format
- ✅ URLs are accessible
- ✅ Confidence levels assigned
- ✅ Review metadata complete

---

## 🚫 What NOT to Do

**NEVER:**
- ❌ Generate random patent numbers
- ❌ Estimate filing/expiry dates using formulas
- ❌ Infer trial outcomes from status alone
- ❌ Use Wikipedia as primary source
- ❌ Copy data without verification
- ❌ Omit source URLs or reviewer names
- ❌ Mark data as VERIFIED unless authoritative source confirms
- ❌ Sum market opportunities across competing molecules

---

## 📝 Example: Complete Patent Curation Workflow

**Scenario: Adding Tiotropium Respimat device patent**

1. **Research**:
   - Search USPTO: "Tiotropium device inhaler Boehringer"
   - Find patent: US7104463B2
   
2. **Verify**:
   - Open USPTO link: https://ppubs.uspto.gov/pubwebapp/static/pages/ppubsbasic.html
   - Confirm: Title = "Respimat® Soft Mist Inhaler"
   - Confirm: Assignee = Boehringer Ingelheim
   - Confirm: Filing date = 2000-09-20, Expiry = 2030-09-12
   
3. **Classify**:
   - Title contains "inhaler" and "device" → DEVICE patent
   - Not primary compound patent → `isPrimary: false`
   - Still active → `status: "Active"`
   
4. **Document**:
   ```json
   {
     "molecule": "Tiotropium",
     "patentNumber": "US7104463B2",
     "patentType": "DEVICE",
     "isPrimary": false,
     "devicePatent": true,
     "filingDate": "2000-09-20",
     "expiryDate": "2030-09-12",
     "status": "Active",
     "title": "Respimat Soft Mist Inhaler",
     "assignee": "Boehringer Ingelheim",
     "ustptoVerificationUrl": "https://ppubs.uspto.gov/pubwebapp/static/pages/ppubsbasic.html",
     "reviewedBy": "Data Curator Name",
     "reviewDate": "2026-02-05",
     "confidenceLevel": "HIGH",
     "notes": "Device patent extends exclusivity beyond compound patent expiry (2015). Generic entry requires different device or license."
   }
   ```

5. **Commit**:
   ```bash
   git add backend/src/data/curated/device-patents.json
   git commit -m "Add Tiotropium Respimat device patent US7104463B2 (verified USPTO)"
   ```

---

## 📞 Questions?

For questions about data curation standards, contact the data quality team or open an issue in the repository.

**Remember: Enterprise-grade pharma intelligence requires enterprise-grade data quality.**
