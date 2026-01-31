#!/usr/bin/env python3
"""
Database Viewer Script
View all contents of the Pharmaceutical Intelligence Platform database
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path


def format_json(json_str):
    """Format JSON string for better readability"""
    try:
        if json_str:
            obj = json.loads(json_str)
            return json.dumps(obj, indent=2)
    except:
        pass
    return json_str


def print_table_header(table_name, count):
    """Print a formatted table header"""
    print("\n" + "="*80)
    print(f"📋 {table_name.upper()} ({count} records)")
    print("="*80)


def view_database(db_path):
    """Connect to database and display all contents"""
    
    if not Path(db_path).exists():
        print(f"❌ Database not found at: {db_path}")
        return
    
    print(f"🔍 Connecting to database: {db_path}\n")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Access columns by name
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    
    print(f"📊 Found {len(tables)} tables: {', '.join(tables)}\n")
    
    # Display each table
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        
        print_table_header(table, count)
        
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        
        if rows:
            # Get column names
            columns = [description[0] for description in cursor.description]
            
            for i, row in enumerate(rows, 1):
                print(f"\n--- Record {i} ---")
                for col in columns:
                    value = row[col]
                    
                    # Format special columns
                    if col in ['trace', 'data'] and value:
                        print(f"  {col}: [JSON data, {len(value)} chars]")
                        # Optionally show formatted JSON (uncomment if needed)
                        # formatted = format_json(value)
                        # print(f"    {formatted[:200]}..." if len(formatted) > 200 else f"    {formatted}")
                    elif isinstance(value, str) and len(value) > 100:
                        print(f"  {col}: {value[:100]}...")
                    else:
                        print(f"  {col}: {value}")
        else:
            print("  (No records)")
    
    # Summary statistics
    print("\n" + "="*80)
    print("📈 SUMMARY")
    print("="*80)
    
    cursor.execute("SELECT COUNT(*) FROM ClinicalTrial")
    clinical_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM Patent")
    patent_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM Job")
    job_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM Report")
    report_count = cursor.fetchone()[0]
    
    print(f"  Clinical Trials: {clinical_count}")
    print(f"  Patents: {patent_count}")
    print(f"  Jobs: {job_count}")
    print(f"  Reports: {report_count}")
    
    # Additional insights
    if clinical_count > 0:
        print("\n  Clinical Trials by Phase:")
        cursor.execute("SELECT phase, COUNT(*) as count FROM ClinicalTrial GROUP BY phase ORDER BY count DESC")
        for row in cursor.fetchall():
            print(f"    {row[0]}: {row[1]}")
        
        print("\n  Clinical Trials by Country:")
        cursor.execute("SELECT country, COUNT(*) as count FROM ClinicalTrial GROUP BY country ORDER BY count DESC")
        for row in cursor.fetchall():
            print(f"    {row[0]}: {row[1]}")
    
    if patent_count > 0:
        print("\n  Patents by Status:")
        cursor.execute("SELECT status, COUNT(*) as count FROM Patent GROUP BY status ORDER BY count DESC")
        for row in cursor.fetchall():
            print(f"    {row[0]}: {row[1]}")
        
        print("\n  Patents by FTO Flag:")
        cursor.execute("SELECT ftoFlag, COUNT(*) as count FROM Patent GROUP BY ftoFlag ORDER BY count DESC")
        for row in cursor.fetchall():
            print(f"    {row[0]}: {row[1]}")
    
    if job_count > 0:
        print("\n  Jobs by Status:")
        cursor.execute("SELECT status, COUNT(*) as count FROM Job GROUP BY status ORDER BY count DESC")
        for row in cursor.fetchall():
            print(f"    {row[0]}: {row[1]}")
    
    print("\n" + "="*80)
    
    conn.close()
    print("\n✅ Database view complete!\n")


if __name__ == "__main__":
    # Path to the SQLite database
    db_path = Path(__file__).parent / "backend" / "prisma" / "dev.db"
    
    try:
        view_database(str(db_path))
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
