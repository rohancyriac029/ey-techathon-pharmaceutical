#!/bin/bash

###############################################################################
# Automated Real Data Download Script v1.2
# Downloads FDA Orange Book, CMS Part D, and other public datasets
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$BACKEND_DIR/src/data"
ORANGE_BOOK_DIR="$DATA_DIR/orange-book"
CMS_DIR="$DATA_DIR/cms"
WHO_DIR="$DATA_DIR/who"
CURATED_DIR="$DATA_DIR/curated"
DOWNLOADS_DIR="$DATA_DIR/downloads"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Pharmaceutical Data Download Script v1.2         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Create Directory Structure
###############################################################################

echo -e "${YELLOW}📁 Creating directory structure...${NC}"

mkdir -p "$ORANGE_BOOK_DIR"
mkdir -p "$CMS_DIR"
mkdir -p "$WHO_DIR"
mkdir -p "$CURATED_DIR"
mkdir -p "$DOWNLOADS_DIR"

echo -e "${GREEN}✅ Directories created${NC}"
echo ""

###############################################################################
# Download FDA Orange Book Data (FIXED - Using Alternative Source)
###############################################################################

echo -e "${YELLOW}📥 Downloading FDA Orange Book data...${NC}"
echo -e "${BLUE}Note: Using alternative download method for proper format${NC}"
echo ""

# The FDA direct download links sometimes serve compressed/malformed data
# Using the full Orange Book download page approach instead

# Download full Orange Book ZIP package
echo "  → Downloading Orange Book complete package..."
curl -L -o "$DOWNLOADS_DIR/orange-book-full.zip" \
  "https://www.fda.gov/media/154850/download" \
  --progress-bar \
  || {
    echo -e "${RED}⚠️  Full package download failed. Trying individual files...${NC}"
    
    # Fallback: Try direct file links with proper headers
    echo "  → Trying patent file with headers..."
    curl -L -o "$DOWNLOADS_DIR/patent.zip" \
      -H "User-Agent: Mozilla/5.0" \
      -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
      "https://www.fda.gov/media/76860/download" \
      --progress-bar
  }

# Extract if ZIP exists
if [ -f "$DOWNLOADS_DIR/orange-book-full.zip" ]; then
  echo "  → Extracting Orange Book package..."
  if command -v unzip &> /dev/null; then
    unzip -q -o "$DOWNLOADS_DIR/orange-book-full.zip" -d "$DOWNLOADS_DIR/orange-book-temp"
    
    # Find and move the text files
    find "$DOWNLOADS_DIR/orange-book-temp" -name "patent.txt" -exec mv {} "$ORANGE_BOOK_DIR/" \;
    find "$DOWNLOADS_DIR/orange-book-temp" -name "products.txt" -exec mv {} "$ORANGE_BOOK_DIR/" \;
    find "$DOWNLOADS_DIR/orange-book-temp" -name "exclusivity.txt" -exec mv {} "$ORANGE_BOOK_DIR/" \;
    
    # Cleanup temp
    rm -rf "$DOWNLOADS_DIR/orange-book-temp"
    
    echo -e "${GREEN}✅ Orange Book data extracted${NC}"
  else
    echo -e "${RED}⚠️  unzip not found. Please install: brew install unzip${NC}"
  fi
elif [ -f "$DOWNLOADS_DIR/patent.zip" ]; then
  echo "  → Extracting patent.zip..."
  unzip -q -o "$DOWNLOADS_DIR/patent.zip" -d "$ORANGE_BOOK_DIR"
fi

# If extraction failed, try direct text file download (some systems work with this)
if [ ! -f "$ORANGE_BOOK_DIR/patent.txt" ]; then
  echo -e "${YELLOW}  → Trying direct text file download...${NC}"
  
  curl -L -o "$ORANGE_BOOK_DIR/patent.txt" \
    -H "User-Agent: Mozilla/5.0" \
    "https://www.accessdata.fda.gov/cder/ob/docs/patentlist/patent.txt" \
    --progress-bar \
    || echo -e "${RED}⚠️  All Orange Book download methods failed${NC}"
fi

echo ""

###############################################################################
# Verify Orange Book Files
###############################################################################

echo -e "${YELLOW}🔍 Verifying Orange Book files...${NC}"

if [ -f "$ORANGE_BOOK_DIR/patent.txt" ]; then
  # Check if file is actually text
  FILE_TYPE=$(file "$ORANGE_BOOK_DIR/patent.txt" | cut -d: -f2)
  
  if [[ "$FILE_TYPE" == *"text"* ]]; then
    echo -e "${GREEN}✅ patent.txt is valid text file${NC}"
  elif [[ "$FILE_TYPE" == *"gzip"* ]]; then
    echo -e "${YELLOW}⚠️  patent.txt is gzipped, decompressing...${NC}"
    gunzip -f "$ORANGE_BOOK_DIR/patent.txt.gz" 2>/dev/null || mv "$ORANGE_BOOK_DIR/patent.txt" "$ORANGE_BOOK_DIR/patent.txt.gz" && gunzip -f "$ORANGE_BOOK_DIR/patent.txt.gz"
  else
    echo -e "${RED}⚠️  patent.txt has unexpected format: $FILE_TYPE${NC}"
    echo -e "${YELLOW}    You may need to download manually from:${NC}"
    echo -e "${YELLOW}    https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files${NC}"
  fi
else
  echo -e "${RED}❌ patent.txt not found!${NC}"
  echo -e "${YELLOW}Manual download required from:${NC}"
  echo -e "${YELLOW}https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files${NC}"
fi

echo ""

###############################################################################
# Download CMS Medicare Part D Data
###############################################################################

echo -e "${YELLOW}📥 Downloading CMS Medicare Part D spending data...${NC}"

# CMS Direct Download (2022 data - most recent available)
CMS_URL="https://data.cms.gov/sites/default/files/2023-09/e6e2b7a9-db64-4c5d-8f04-ca3c7bb7d343/MUP_DPR_RY22_P04_V10_DY21_NUPD.csv"

echo "  → Downloading Part D spending data (2022)..."
curl -L -o "$CMS_DIR/medicare_part_d_spending_2022.csv" "$CMS_URL" \
  --progress-bar \
  || echo -e "${RED}⚠️  CMS download failed. Manual download may be required.${NC}"

echo -e "${GREEN}✅ CMS Part D data download attempted${NC}"
echo ""

###############################################################################
# Create Placeholder Files for Manual Collection
###############################################################################

echo -e "${YELLOW}📝 Creating placeholder files...${NC}"

# Device Patents Placeholder
cat > "$CURATED_DIR/device-patents.json" <<'EOF'
{
  "_meta": {
    "description": "Device patent data - MANUAL VERIFICATION REQUIRED",
    "status": "PLACEHOLDER",
    "instructions": "See MANUAL_DATA_COLLECTION.md"
  },
  "patents": []
}
EOF

# Patent Litigation Placeholder
cat > "$CURATED_DIR/patent-litigation.json" <<'EOF'
{
  "_meta": {
    "description": "Patent litigation data",
    "status": "PLACEHOLDER",
    "instructions": "Parse Orange Book after successful download"
  },
  "litigationCases": []
}
EOF

# India Data Placeholders
cat > "$CURATED_DIR/india-regulatory-approvals.json" <<'EOF'
{
  "_meta": {
    "description": "India CDSCO approvals - MANUAL COLLECTION REQUIRED",
    "website": "https://cdsco.gov.in/",
    "status": "PLACEHOLDER"
  },
  "approvals": []
}
EOF

cat > "$CURATED_DIR/nppa-ceiling-prices.json" <<'EOF'
{
  "_meta": {
    "description": "India NPPA prices - MANUAL COLLECTION REQUIRED",
    "website": "http://www.nppaindia.nic.in/",
    "status": "PLACEHOLDER"
  },
  "prices": []
}
EOF

echo -e "${GREEN}✅ Placeholder files created${NC}"
echo ""

###############################################################################
# Generate Summary Report
###############################################################################

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 Download Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check Orange Book
if [ -f "$ORANGE_BOOK_DIR/patent.txt" ]; then
  FILE_TYPE=$(file "$ORANGE_BOOK_DIR/patent.txt" | cut -d: -f2)
  FILE_SIZE=$(du -h "$ORANGE_BOOK_DIR/patent.txt" | cut -f1)
  
  if [[ "$FILE_TYPE" == *"text"* ]]; then
    LINE_COUNT=$(wc -l < "$ORANGE_BOOK_DIR/patent.txt" | tr -d ' ')
    echo -e "  ✅ Orange Book Patents: ${GREEN}${LINE_COUNT} records (${FILE_SIZE})${NC}"
    echo -e "     First line: $(head -n 1 "$ORANGE_BOOK_DIR/patent.txt" | cut -c1-60)..."
  else
    echo -e "  ⚠️  Orange Book Patents: ${YELLOW}Downloaded but format issue${NC}"
    echo -e "     File type: $FILE_TYPE"
    echo -e "     Size: $FILE_SIZE"
  fi
else
  echo -e "  ❌ Orange Book Patents: ${RED}NOT DOWNLOADED${NC}"
  echo -e "     ${YELLOW}Manual download required from:${NC}"
  echo -e "     ${YELLOW}https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files${NC}"
fi

# Check CMS
if [ -f "$CMS_DIR/medicare_part_d_spending_2022.csv" ] && [ -s "$CMS_DIR/medicare_part_d_spending_2022.csv" ]; then
  CMS_SIZE=$(du -h "$CMS_DIR/medicare_part_d_spending_2022.csv" | cut -f1)
  CMS_LINES=$(wc -l < "$CMS_DIR/medicare_part_d_spending_2022.csv" | tr -d ' ')
  echo -e "  ✅ CMS Part D Spending: ${GREEN}${CMS_LINES} records (${CMS_SIZE})${NC}"
else
  echo -e "  ⚠️  CMS Part D Spending: ${YELLOW}Download may have failed${NC}"
fi

echo ""
echo -e "${YELLOW}🔄 Next Steps:${NC}"

if [ -f "$ORANGE_BOOK_DIR/patent.txt" ]; then
  FILE_TYPE=$(file "$ORANGE_BOOK_DIR/patent.txt" | cut -d: -f2)
  if [[ "$FILE_TYPE" == *"text"* ]]; then
    echo -e "  1. Run Orange Book parser: ${GREEN}npm run parse:orange-book${NC}"
    echo -e "  2. Verify parsed data: ${GREEN}cat src/data/orange-book/parsed-patents.json${NC}"
  else
    echo -e "  1. ${RED}Fix Orange Book format issue${NC}"
    echo -e "  2. Try manual download from FDA website"
  fi
else
  echo -e "  1. ${RED}Manual download required:${NC}"
  echo -e "     Visit: https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files"
  echo -e "     Download: Products, Patents, and Exclusivity files"
  echo -e "     Save to: $ORANGE_BOOK_DIR"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"