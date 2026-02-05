# 📋 MANUAL DATA COLLECTION TASK LIST

## ⚠️ CRITICAL: Current Status

**All curated data files are PLACEHOLDER/UNVERIFIED**

The system infrastructure is ready, but the data is not yet real. This document provides step-by-step instructions for collecting REAL data from authoritative sources.

---

## 🎯 Priority 1: Verify Top 10 Device Patents (2-3 days)

These are the highest-impact patents that extend exclusivity beyond compound patents.

### Task 1.1: Tiotropium (Spiriva) Device Patent

**Research Steps:**
1. Visit FDA Orange Book: https://www.accessdata.fda.gov/scripts/cder/ob/
2. Search for "Spiriva" or "Tiotropium"
3. Download patent list
4. Identify device patents (look for "inhaler" or "delivery device" in title)
5. Verify in USPTO: https://ppubs.uspto.gov/pubwebapp/static/pages/landing.html
6. Record:
   - Patent number (e.g., US7104463)
   - Filing date
   - Expiry date
   - Title
   - Current status (Active/Expired)

**Expected Result:** 1-2 device patents for Respimat/HandiHaler

**Update File:** `backend/src/data/curated/device-patents.json`

---

### Task 1.2: Semaglutide (Ozempic/Wegovy) Device Patent

**Research Steps:**
1. Search FDA Orange Book for "Ozempic" and "Wegovy"
2. Look for pen device patents
3. Cross-reference with USPTO
4. Check Novo Nordisk patent portfolio

**Expected Result:** Pen injection device patents

---

### Task 1.3: Adalimumab (Humira) Device Patent

**Research Steps:**
1. Search Orange Book for "Humira"
2. Identify autoinjector device patents (AbbVie has multiple)
3. Verify in USPTO
4. Check litigation status (AbbVie has extensive patent litigation)

**Expected Result:** 2-3 autoinjector device patents

---

### Remaining Top 10 Molecules:
- [ ] Empagliflozin (if device-specific formulation)
- [ ] Osimertinib (check for tablet formulation patents)
- [ ] Pembrolizumab (check for infusion delivery patents)
- [ ] Etanercept (Enbrel - autoinjector)
- [ ] Atorvastatin (likely no device patents)
- [ ] Lisinopril (likely no device patents)

---

## 🎯 Priority 2: Patent Litigation Research (1-2 days)

### Task 2.1: Download Orange Book Litigation List

**Steps:**
1. Visit: https://www.accessdata.fda.gov/scripts/cder/ob/
2. Click "Patent and Exclusivity for Approved Products"
3. Download litigation status file (Excel format)
4. Filter for molecules in our target list

**Data to Collect:**
- Case name
- Filing date
- Outcome (Settlement/Judgment/Pending)
- Generic launch date (if settled)

**Update File:** `backend/src/data/curated/patent-litigation.json`

---

## 🎯 Priority 3: India CDSCO Approvals (2 days)

### Task 3.1: Verify CDSCO Approval Dates

**Steps:**
1. Visit CDSCO website: https://cdsco.gov.in/opencms/opencms/en/Drugs/New-Drugs/
2. Search for each molecule:
   - Semaglutide
   - Sitagliptin
   - Adalimumab
   - Tiotropium
   - Metformin (older, may not have digital record)
3. Download gazette notifications
4. Record approval dates and type (New Drug/Generic/Biological)

**Update File:** `backend/src/data/curated/india-regulatory-approvals.json`

---

## 🎯 Priority 4: NPPA Ceiling Prices (1 day)

### Task 4.1: Download Current NPPA Price List

**Steps:**
1. Visit: http://www.nppaindia.nic.in/en/ceiling-price/
2. Download latest price list Excel file
3. Filter for our target molecules
4. Extract:
   - Ceiling price (INR)
   - MRP
   - DPCO scheduled status
   - Strength
   - Dosage form

**Update File:** `backend/src/data/curated/nppa-ceiling-prices.json`

---

## 🎯 Priority 5: Implement Orange Book Parser (3-4 days coding)

### Task 5.1: Download Orange Book Data Files

**Steps:**
1. Visit: https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files
2. Download:
   - `patent.txt` - Patent data
   - `exclusivity.txt` - Exclusivity data
   - `products.txt` - Approved products

**File Format:** Pipe-delimited text files

### Task 5.2: Build Parser

**Create:** `backend/src/services/orangeBookParser.ts`

```typescript
/**
 * Parse FDA Orange Book data files
 * 
 * Files: patent.txt, exclusivity.txt, products.txt
 * Format: Pipe-delimited (|)
 */

export function parseOrangeBookPatents(filePath: string): Patent[] {
  // Read patent.txt
  // Parse each line
  // Return patent data with REAL numbers
}
```

### Task 5.3: Update realPatentFetcher.ts

Replace the TODO placeholder with actual Orange Book parsing.

---

## 🎯 Priority 6: USPTO PatentsView Integration (ALREADY DONE ✅)

The USPTO API integration is already implemented in `realPatentFetcher.ts`.

**Test it:**
```bash
cd backend
npm run test:patents
```

---

## 📊 Verification Checklist Template

For each patent verified, fill out:

```json
{
  "molecule": "Tiotropium",
  "patentNumber": "US7104463B2",  // ✅ Verified in USPTO
  "verificationUrl": "https://ppubs.uspto.gov/...",  // ✅ Link saved
  "verifiedBy": "Your Name",
  "verificationDate": "2026-02-05",
  "verificationNotes": "Confirmed in USPTO search. Title matches. Assignee confirmed as Boehringer Ingelheim.",
  "confidenceLevel": "HIGH",  // Only HIGH after manual verification
  "dataQuality": "CURATED"    // Only CURATED after manual verification
}
```

---

## 📅 Recommended Timeline

| Week | Task | Hours | Owner |
|------|------|-------|-------|
| Week 1 | Top 10 Device Patents | 16-24h | Patent Researcher |
| Week 2 | Litigation Research | 8-16h | Legal/Patent Team |
| Week 2 | India CDSCO Data | 8-16h | Regulatory Affairs |
| Week 2 | NPPA Pricing | 4-8h | Pricing Analyst |
| Week 3 | Orange Book Parser | 24-32h | Developer |
| Week 3 | Integration Testing | 8-16h | Developer + QA |

**Total Estimated Effort:** 68-112 hours (2-3 weeks with dedicated team)

---

## 🚫 What NOT to Do

**❌ NEVER:**
- Copy data from Wikipedia
- Use patent numbers from blog posts without USPTO verification
- Estimate filing/expiry dates
- Mark data as VERIFIED without checking authoritative source
- Use "example" or "placeholder" data in production

**✅ ALWAYS:**
- Verify every patent number in USPTO
- Save verification URL
- Record who verified and when
- Include source citation
- Mark unverified data as PLACEHOLDER

---

## 🎓 Success Criteria

The system will be ready for production when:

✅ All Top 10 molecules have verified device patents (or confirmed "NO DEVICE PATENTS")
✅ All patent numbers verified in USPTO
✅ Litigation data matches Orange Book records
✅ India approvals confirmed in CDSCO documents
✅ NPPA prices match current official list
✅ Orange Book parser tested and working
✅ Validation script passes with 0 warnings
✅ No "PLACEHOLDER" or "UNVERIFIED" flags in data

---

## 📞 Questions?

If you encounter issues during data collection:
1. Check CONTRIBUTING_CURATED_DATA.md for detailed procedures
2. Document the issue (e.g., "CDSCO website down", "Patent not found in USPTO")
3. Mark data as INCOMPLETE with explanation
4. Never fill in estimated/guessed data

**Remember: Honest "DATA NOT AVAILABLE" is better than plausible-looking fake data.**
