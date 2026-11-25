#!/usr/bin/env python3
"""
REDasm Download Append Script
Reads releases.json, extracts download counts for the last 3 tracked versions,
writes today's row to downloads.csv (replacing it if already present) and keeps only
the last RETENTION_DAYS days.
When tracked versions change, the CSV is remapped to the new column set.

Run from the root of the data branch:
    python3 scripts/append_downloads.py
"""

import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path
from common import load_tracked_releases, PLATFORM_ORDER, RETENTION_DAYS

DOWNLOADS_CSV = Path("downloads.csv")


def build_fieldnames(releases: list) -> list:
    versions = [r["tag"] for r in releases]
    platforms = [p for p in PLATFORM_ORDER
                 if any(p in r["platforms"] for r in releases)]
    return ["date"] + [f"{v}_{p}" for v in versions for p in platforms]


def load_csv(csv_path: Path) -> tuple[list, list | None]:
    """Returns (rows, fieldnames) or ([], None) if file doesn't exist."""
    if not csv_path.exists():
        return [], None
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader), list(reader.fieldnames or [])


def remap_row(row: dict, fieldnames: list) -> dict:
    """Map an existing row to the current column set (new columns start at 0)."""
    new_row = {"date": row["date"]}
    for col in fieldnames[1:]:
        new_row[col] = int(row.get(col) or 0)
    return new_row


def write_csv(csv_path: Path, fieldnames: list, rows: list) -> None:
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    cutoff = (now - timedelta(days=RETENTION_DAYS)).strftime("%Y-%m-%d")

    releases = load_tracked_releases()
    if not releases:
        print("No tracked releases found, skipping.")
        return

    fieldnames = build_fieldnames(releases)
    counts = {r["tag"]: r["platforms"] for r in releases}

    existing_rows, existing_fields = load_csv(DOWNLOADS_CSV)
    if existing_fields != fieldnames:
        print(f"Columns changed: {fieldnames}")

    # counts are cumulative: if today's row already exists (e.g. a manual re-run),
    # replace it with the latest values instead of keeping a stale snapshot
    rows = [remap_row(r, fieldnames) for r in existing_rows if r["date"] != today]
    replaced = len(rows) != len(existing_rows)

    row = {"date": today}
    for col in fieldnames[1:]:
        version, platform = col.rsplit("_", 1)
        row[col] = counts.get(version, {}).get(platform, 0)
    rows.append(row)
    print(f"{'Updated' if replaced else 'Appended'} {today}: { {r['tag']: r['platforms'] for r in releases} }")

    # ISO dates compare correctly as strings
    kept = [r for r in rows if r["date"] >= cutoff]
    if len(kept) != len(rows):
        print(f"Dropped {len(rows) - len(kept)} rows older than {cutoff}")

    write_csv(DOWNLOADS_CSV, fieldnames, kept)


if __name__ == "__main__":
    main()
