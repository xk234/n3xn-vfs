"""Analyze the bundled sales.csv file."""
import csv
from pathlib import Path

path = Path(__file__).parent / "data" / "sales.csv"
with path.open(newline="", encoding="utf-8") as stream:
    rows = list(csv.DictReader(stream))

total = sum(float(row["revenue"]) for row in rows)
print("SALES REPORT")
print("=" * 38)
print(f"Records: {len(rows)}")
print(f"Total revenue: ${total:,.2f}")
print()
for row in sorted(rows, key=lambda item: float(item["revenue"]), reverse=True):
    print(f'{row["product"]:<18} ${float(row["revenue"]):>9,.2f}')
