# Upgrade Guide: Indian Patents Integration & System Improvements

**Version**: February 2026 Release  
**Migration Time**: ~15 minutes  
**Database Reset**: Required

---

## 🆕 What's New

### Major Features
- ✅ **Indian Patent Data Integration** - 19 curated Indian patents across 13 molecules
- ✅ **Dual-Country Patent Analysis** - Both 🇮🇳 India and 🇺🇸 USA patents in FTO analysis
- ✅ **Real Data Only** - All synthetic patent generation removed
- ✅ **Enhanced Executive Summary** - Markdown formatting with bold sections
- ✅ **Smart PDF Filenames** - Downloads named after your query instead of random IDs
- ✅ **Full Database** - 24 molecules across 5 therapeutic areas (Diabetes, COPD, Oncology, Rheumatology, Cardiovascular)

### Data Coverage
- **Total Patents**: 1,826 (1,807 US + 19 India)
- **Molecules**: 24 fully seeded with clinical trials, patents, regulatory data
- **Indian Patents Added For**:
  - Semaglutide (2), Sitagliptin (2), Empagliflozin (1)
  - Tiotropium (2), Umeclidinium (2), Indacaterol (2), Roflumilast (2)
  - Osimertinib (1), Pembrolizumab (1), Adalimumab (1)
  - Atorvastatin (1), Lisinopril (1), Metformin (1)

---

## ⚡ Quick Start (TL;DR)

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if package.json changed)
cd backend && npm install
cd ../frontend && npm install

# 3. Reset database with new schema
cd backend
npx prisma migrate reset --force --skip-seed

# 4. Seed with real data (including Indian patents)
cd prisma
npx ts-node seedRealData.ts

# 5. Copy database to correct location
cd ..
cp prisma/prisma/dev.db prisma/dev.db

# 6. Start servers
cd backend && npm run dev          # Terminal 1
cd frontend && npm run dev          # Terminal 2
```

---

## 📋 Detailed Upgrade Steps

### Step 1: Backup Current Data (Optional)

```bash
cd backend
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d)
```

### Step 2: Pull Latest Code

```bash
git pull origin main
```

**Files Changed:**
- `backend/src/services/realPatentFetcher.ts` - Added Indian patent loading
- `backend/src/data/curated/india-patents.json` - New Indian patent database (19 patents)
- `backend/routes/reportRoutes.ts` - Smart PDF filename generation
- `frontend/src/components/Dashboard.tsx` - Markdown rendering for executive summary
- `backend/prisma/seedRealData.ts` - Updated to include Indian patents

### Step 3: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (if needed)
cd ../frontend
npm install
```

### Step 4: Database Migration

The database schema has been updated with data quality tracking fields. Reset and migrate:

```bash
cd backend

# Reset database (drops all data and re-applies migrations)
npx prisma migrate reset --force --skip-seed

# This will apply these migrations:
# - 20251209121357_init
# - 20260131180217_decision_platform
# - 20260202140043_add_market_data_tables
# - 20260205041418_add_data_quality_fields (NEW)
```

**What's Added in Schema:**
- `Patent.dataQuality` - VERIFIED/CURATED/ESTIMATED/INCOMPLETE
- `Patent.confidenceLevel` - HIGH/MEDIUM/LOW
- `Patent.devicePatent` - Boolean flag for device patents
- `Patent.litigationHistory` - JSON field for litigation tracking
- `Patent.litigationRisk` - LOW/MEDIUM/HIGH/UNKNOWN

### Step 5: Seed Database with Real Data

```bash
cd backend/prisma

# This will take 3-5 minutes
# Fetches from ClinicalTrials.gov, OpenFDA, and loads real patents
npx ts-node seedRealData.ts

# Expected output:
# ✅ Created 24 molecules
# ✅ Created 436 clinical trials
# ✅ Created 1826 patents (1807 US + 19 IN)
# ✅ Created 47 regulatory statuses
# ✅ Created 12 disease market records
```

**Note:** If you see Gemini API rate limit errors (429), the seed will still work using cached/fallback data.

### Step 6: Fix Database Location

The seed script writes to `prisma/prisma/dev.db` but the app reads from `prisma/dev.db`. Copy to correct location:

```bash
cd backend
cp prisma/prisma/dev.db prisma/dev.db

# Verify
ls -lh prisma/dev.db
# Should show ~560K file size
```

### Step 7: Verify Data

```bash
# Check molecules
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Molecule;"
# Expected: 24

# Check patents by country
sqlite3 prisma/dev.db "SELECT country, COUNT(*) FROM Patent GROUP BY country;"
# Expected: IN|19, US|1807

# Verify Indian patent coverage
sqlite3 prisma/dev.db "SELECT molecule, patentNumber, status FROM Patent WHERE country='IN' ORDER BY molecule;"
# Should show 19 Indian patents
```

### Step 8: Start Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev

# Should see:
# 🚀 Server running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev

# Should see:
# Local: http://localhost:5173
```

### Step 9: Test New Features

#### Test 1: Indian Patents Display
1. Open http://localhost:5173
2. Query: "Find molecules with low competition in respiratory disease in India"
3. Verify: Tiotropium, Umeclidinium, Indacaterol, Roflumilast all show Indian patents in the 🇮🇳 India Patents section

#### Test 2: Dual-Country Analysis
1. Query: "Analyze Semaglutide for diabetes"
2. Verify: Both 🇺🇸 US patents (171) and 🇮🇳 Indian patents (2) displayed
3. Check: IN268115, IN278901 shown with expiry dates

#### Test 3: Executive Summary Formatting
1. Run any query
2. Verify: Executive Summary has **bold headers** for sections like "Generic Opportunities" and "Strategic Recommendation"
3. Check: Proper paragraph breaks between sections

#### Test 4: Smart PDF Filenames
1. Run query: "Evaluate cardiovascular treatments for emerging markets"
2. Click "📄 Download Full PDF Report"
3. Verify: Downloaded file is named like `evaluate-cardiovascular-treatments-for-emerging-2026-02-05.pdf` (not random ID)

---

## 🔧 Troubleshooting

### Issue: "No patents found" for Umeclidinium/Indacaterol/Roflumilast

**Cause:** Database not copied to correct location  
**Fix:**
```bash
cd backend
cp prisma/prisma/dev.db prisma/dev.db
# Restart backend
```

### Issue: Executive summary shows `**text**` instead of bold

**Cause:** Frontend not updated or browser cache  
**Fix:**
```bash
cd frontend
npm install
# Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
```

### Issue: "No molecules found for condition: Cardiovascular"

**Cause:** Database not seeded or only has 4 COPD molecules  
**Fix:**
```bash
cd backend/prisma
npx ts-node seedRealData.ts
cd ..
cp prisma/prisma/dev.db prisma/dev.db
```

### Issue: Gemini API 429 errors in seed

**Cause:** Rate limits on free tier  
**Solution:** This is expected. The seed script has fallback mechanisms and will complete successfully. Wait 2-3 minutes between queries after seeding.

### Issue: Backend can't find database

**Error:** "no such table: Patent"  
**Fix:**
```bash
cd backend
# Make sure migrations are applied
npx prisma migrate deploy
# Copy correct database
cp prisma/prisma/dev.db prisma/dev.db
```

---

## 📊 Database Schema Changes

### New Fields Added

**Patent Table:**
```sql
dataQuality       String    @default("CURATED")  -- VERIFIED/CURATED/ESTIMATED/INCOMPLETE
confidenceLevel   String?                        -- HIGH/MEDIUM/LOW
devicePatent      Boolean   @default(false)       -- Device patent flag
litigationHistory String?                        -- JSON litigation data
litigationRisk    String?                        -- LOW/MEDIUM/HIGH/UNKNOWN
```

**Report Table:**
```sql
-- No changes, but job relationship used for smart PDF filenames
```

---

## 📁 New Files Added

1. **`backend/src/data/curated/india-patents.json`**
   - 19 Indian patents with verified data
   - Curated from IP India portal + Google Patents
   - Format: Patent number, type, filing/expiry dates, status

2. **`backend/scripts/scrapeIndiaPatents.ts`**
   - Script used to generate india-patents.json
   - Reference for adding more patents in future

3. **`backend/test-india-patents.ts`**
   - Test script to verify Indian patent loading
   - Usage: `npx ts-node test-india-patents.ts`

4. **`backend/quick-seed-respiratory.ts`**
   - Quick seed for just respiratory molecules (development tool)

---

## 🎯 Verification Checklist

Use this checklist to confirm successful upgrade:

- [ ] Backend starts without errors on port 3001
- [ ] Frontend starts without errors on port 5173
- [ ] Database has 24 molecules (check with SQL query)
- [ ] Database has 1826 patents (1807 US + 19 IN)
- [ ] Query "respiratory disease in India" returns 4 molecules
- [ ] Tiotropium shows 2 Indian patents (IN193398, IN234567)
- [ ] Semaglutide shows 2 Indian patents (IN268115, IN278901)
- [ ] Executive summary displays with bold formatting
- [ ] PDF download has query-based filename
- [ ] Cardiovascular queries work (8 molecules)

---

## 🔄 Rollback Instructions

If you need to rollback to previous version:

```bash
# Restore database backup
cd backend
cp prisma/dev.db.backup-YYYYMMDD prisma/dev.db

# Checkout previous version
git log --oneline  # Find commit hash before upgrade
git checkout <previous-commit-hash>

# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install

# Restart servers
```

---

## 📞 Support

**Issues After Upgrade?**

1. Check database file size: `ls -lh backend/prisma/dev.db` (should be ~560K)
2. Verify Indian patents: `sqlite3 backend/prisma/dev.db "SELECT COUNT(*) FROM Patent WHERE country='IN';"` (should return 19)
3. Check backend logs: `tail -f backend/backend-new.log`
4. Clear browser cache and restart frontend

**Still stuck?**
- Review troubleshooting section above
- Check terminal output for specific error messages
- Verify Node.js version: `node -v` (requires v18+)

---

## 📈 Performance Notes

- **Seed Time**: 3-5 minutes (depends on external API rate limits)
- **First Query**: ~15-30 seconds (Gemini API + agent pipeline)
- **Cached Queries**: ~1-2 seconds (database lookup)
- **PDF Generation**: ~2-3 seconds per report

**API Rate Limits:**
- Gemini API: 60 requests/minute (free tier)
- ClinicalTrials.gov: ~2 requests/second
- OpenFDA: No strict limits, but throttled on high volume

---

## ✅ Post-Upgrade Recommendations

1. **Test All Therapeutic Areas:**
   - Diabetes: "Analyze diabetes treatments in India"
   - Respiratory: "COPD molecules for generic opportunity"
   - Cardiovascular: "Cardiovascular treatments for emerging markets"
   - Oncology: "Lung cancer targeted therapies"
   - Rheumatology: "Rheumatoid arthritis biologics"

2. **Verify Patent Accuracy:**
   - Cross-reference a few Indian patents with IP India portal
   - Check US patent numbers in FDA Orange Book
   - Validate expiry dates

3. **Monitor Performance:**
   - Watch for Gemini 429 errors
   - Check if queries complete within 30 seconds
   - Verify PDF generation works consistently

4. **Add More Data (Optional):**
   - Add more Indian patents to `india-patents.json`
   - Follow format in existing file
   - Re-seed database to include new patents

---

## 🎉 You're Done!

Your pharmaceutical intelligence platform is now upgraded with:
- ✅ Real Indian patent data integration
- ✅ Dual-country FTO analysis
- ✅ Enhanced reporting and UX
- ✅ 24 fully-seeded molecules

**Start querying and enjoy the enhanced capabilities!** 🚀
