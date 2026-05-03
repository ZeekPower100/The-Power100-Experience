#!/usr/bin/env python3
"""
Backfill IC WordPress content into TPX PostgreSQL (video_content + entity_embeddings).

Usage:
    python backfill-video-content.py                    # Full run: insert + update + embeddings
    python backfill-video-content.py --insert-only      # Only insert/update video_content rows
    python backfill-video-content.py --embeddings-only  # Only generate embeddings for rows missing them
    python backfill-video-content.py --dry-run           # Show what would happen without writing

Prerequisites:
    pip install psycopg2-binary openai
"""

import json
import sys
import os
import re
import time
import argparse
import html
from pathlib import Path

# Force UTF-8 output on Windows and disable buffering
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
os.environ['PYTHONUNBUFFERED'] = '1'

# --- Config ---
SCRIPT_DIR = Path(__file__).parent
EXPORT_FILE = SCRIPT_DIR / "ic-content-export.json"

PROD_DB = {
    "host": "tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "tpedb",
    "user": "tpeadmin",
    "password": "dBP0wer100!!",
    "sslmode": "require",
}

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY environment variable not set. "
        "Export it before running: `export OPENAI_API_KEY=sk-...`"
    )
EMBEDDING_MODEL = "text-embedding-ada-002"


def get_db_connection():
    """Get a psycopg2 connection to the production database."""
    import psycopg2
    return psycopg2.connect(**PROD_DB)


def parse_duration(duration_str):
    """Parse 'MM:SS' or 'H:MM:SS' or 'HH:MM:SS' into seconds."""
    if not duration_str:
        return None
    parts = duration_str.strip().split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except (ValueError, IndexError):
        pass
    return None


def extract_youtube_id(url):
    """Extract YouTube video ID from various URL formats."""
    if not url:
        return None
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


def youtube_thumbnail(video_id):
    """Get the best YouTube thumbnail URL."""
    if not video_id:
        return None
    return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"


def load_shows(conn):
    """Load shows table into a slug->id map."""
    cur = conn.cursor()
    cur.execute("SELECT id, slug, wp_term_slug FROM shows ORDER BY id")
    shows = {}
    for row in cur.fetchall():
        sid, slug, wp_slug = row
        if slug:
            shows[slug] = sid
        if wp_slug and wp_slug != slug:
            shows[wp_slug] = sid
    cur.close()
    return shows


def load_existing_wp_ids(conn):
    """Load existing wp_post_id -> video_content.id mapping."""
    cur = conn.cursor()
    cur.execute("SELECT wp_post_id, id FROM video_content WHERE wp_post_id IS NOT NULL")
    mapping = {row[0]: row[1] for row in cur.fetchall()}
    cur.close()
    return mapping


def load_existing_embeddings(conn):
    """Load set of entity_ids that already have embeddings for video_content."""
    cur = conn.cursor()
    cur.execute("SELECT entity_id FROM entity_embeddings WHERE entity_type = 'video_content'")
    ids = {row[0] for row in cur.fetchall()}
    cur.close()
    return ids


def build_content_text(post, pillars):
    """Build the searchable text content for embedding + BM25."""
    parts = []
    parts.append(html.unescape(post.get("title", "")))

    excerpt = post.get("excerpt", "")
    # Strip HTML from excerpt, decode entities
    excerpt = html.unescape(re.sub(r'<[^>]+>', '', excerpt)).strip()
    if excerpt and "unauthorized" not in excerpt.lower():
        parts.append(excerpt)

    # Speakers
    speakers = post.get("speakers", [])
    speaker_names = [s["name"] for s in speakers if s.get("name")]
    if speaker_names:
        parts.append("Featuring: " + ", ".join(speaker_names))

    # Pillars/topics
    if pillars:
        parts.append("Topics: " + ", ".join(pillars))

    # Takeaways
    takeaways = post.get("takeaways", [])
    if takeaways:
        parts.append("Key Takeaways: " + " | ".join(t for t in takeaways if t))

    # Timestamps (labels only, for searchability)
    timestamps = post.get("timestamps", [])
    if timestamps:
        labels = [ts["label"] for ts in timestamps if ts.get("label")]
        if labels:
            parts.append("Segments: " + ", ".join(labels))

    # Companies
    companies = post.get("companies", [])
    if companies:
        parts.append("Companies: " + ", ".join(companies))

    # Leaders
    leaders = post.get("leaders", [])
    if leaders:
        parts.append("Leaders: " + ", ".join(leaders))

    return "\n".join(parts)


def build_ai_insights(post):
    """Build the ai_insights JSONB object."""
    insights = {}

    takeaways = post.get("takeaways", [])
    if takeaways:
        insights["takeaways"] = [t for t in takeaways if t]

    timestamps = post.get("timestamps", [])
    if timestamps:
        insights["timestamps"] = timestamps

    speakers = post.get("speakers", [])
    if speakers:
        insights["speakers"] = speakers

    companies = post.get("companies", [])
    if companies:
        insights["companies"] = companies

    leaders = post.get("leaders", [])
    if leaders:
        insights["leaders"] = leaders

    return insights if insights else None


def insert_or_update_video_content(conn, posts, shows_map, existing_wp_ids, dry_run=False):
    """Insert new posts and update existing ones in video_content."""
    cur = conn.cursor()
    inserted = 0
    updated = 0
    errors = []

    for post in posts:
        wp_id = post["wp_post_id"]
        title = html.unescape(post.get("title", ""))

        try:
            # Determine show_id
            show_slugs = post.get("show_slugs", [])
            show_id = None
            for slug in show_slugs:
                if slug in shows_map:
                    show_id = shows_map[slug]
                    break

            # entity_id is NOT NULL — use show_id if available, else 0
            entity_id = show_id if show_id else 0
            # entity_type: 'show' if has show, 'general' otherwise
            entity_type = 'show' if show_id else 'general'

            # Parse fields
            duration = parse_duration(post.get("duration"))
            yt_id = extract_youtube_id(post.get("video_url"))
            thumb = youtube_thumbnail(yt_id)
            episode_num = post.get("episode_number") or None
            if episode_num == 0:
                episode_num = None

            # Featured names
            speakers = post.get("speakers", [])
            featured = [s["name"] for s in speakers if s.get("name")]

            # Excerpt (strip HTML, decode entities)
            excerpt = html.unescape(re.sub(r'<[^>]+>', '', post.get("excerpt", ""))).strip()
            if "unauthorized" in excerpt.lower():
                excerpt = None

            # Pillars
            pillar_names = [p["name"] for p in post.get("pillars", []) if p.get("name")]

            # AI fields
            ai_summary = excerpt
            ai_key_topics = json.dumps(pillar_names) if pillar_names else None
            ai_insights = build_ai_insights(post)
            ai_insights_json = json.dumps(ai_insights) if ai_insights else None

            if wp_id in existing_wp_ids:
                # UPDATE existing row with enriched data
                vc_id = existing_wp_ids[wp_id]
                if dry_run:
                    print(f"  [DRY] Would UPDATE vc.id={vc_id} wp={wp_id}: {title[:60]}")
                    updated += 1
                    continue

                cur.execute("""
                    UPDATE video_content SET
                        title = %s,
                        description = %s,
                        entity_type = COALESCE(entity_type, %s),
                        entity_id = COALESCE(%s, entity_id),
                        video_type = COALESCE(video_type, 'episode'),
                        file_url = COALESCE(%s, file_url),
                        thumbnail_url = COALESCE(%s, thumbnail_url),
                        duration_seconds = COALESCE(%s, duration_seconds),
                        show_id = COALESCE(%s, show_id),
                        episode_number = COALESCE(%s, episode_number),
                        featured_names = COALESCE(%s, featured_names),
                        ai_summary = COALESCE(%s, ai_summary),
                        ai_key_topics = COALESCE(%s::jsonb, ai_key_topics),
                        ai_insights = COALESCE(%s::jsonb, ai_insights),
                        ai_processing_status = 'backfill_complete',
                        processed_status = 'backfilled',
                        approval_status = 'published',
                        is_active = true,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    title,
                    excerpt,
                    entity_type,
                    entity_id,
                    post.get("video_url"),
                    thumb,
                    duration,
                    show_id,
                    episode_num,
                    featured,
                    ai_summary,
                    ai_key_topics,
                    ai_insights_json,
                    vc_id,
                ))
                updated += 1
                if updated % 10 == 0:
                    print(f"  Updated {updated} existing rows...")

            else:
                # INSERT new row
                if dry_run:
                    print(f"  [DRY] Would INSERT wp={wp_id}: {title[:60]}")
                    inserted += 1
                    continue

                cur.execute("""
                    INSERT INTO video_content (
                        entity_type, entity_id, video_type, title, description,
                        file_url, thumbnail_url, duration_seconds, show_id,
                        episode_number, featured_names, wp_post_id,
                        ai_summary, ai_key_topics, ai_insights,
                        ai_processing_status, processed_status, approval_status,
                        is_active, upload_date, created_at, updated_at
                    ) VALUES (
                        %s, %s, 'episode', %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s::jsonb, %s::jsonb,
                        'backfill_complete', 'backfilled', 'published',
                        true, %s, NOW(), NOW()
                    )
                    RETURNING id
                """, (
                    entity_type,
                    entity_id,
                    title,
                    excerpt,
                    post.get("video_url"),
                    thumb,
                    duration,
                    show_id,
                    episode_num,
                    featured,
                    wp_id,
                    ai_summary,
                    ai_key_topics,
                    ai_insights_json,
                    post.get("recording_date") or post.get("date"),
                ))
                new_id = cur.fetchone()[0]
                existing_wp_ids[wp_id] = new_id
                inserted += 1
                if inserted % 10 == 0:
                    print(f"  Inserted {inserted} new rows...")

        except Exception as e:
            errors.append({"wp_post_id": wp_id, "title": title, "error": str(e)})
            print(f"  ERROR wp={wp_id}: {e}")
            conn.rollback()
            # Re-establish cursor after rollback
            cur = conn.cursor()

    if not dry_run:
        conn.commit()
    cur.close()

    return inserted, updated, errors


def generate_embeddings(conn, posts, shows_map, existing_wp_ids, existing_embedding_ids, dry_run=False):
    """Generate embeddings for all video_content rows that don't have them yet."""
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    cur = conn.cursor()
    generated = 0
    skipped = 0
    errors = []

    # Build wp_id -> post lookup
    post_lookup = {p["wp_post_id"]: p for p in posts}

    # Get ALL video_content rows (not just WP-linked ones)
    cur.execute("SELECT id, wp_post_id, title, description, ai_summary, ai_key_topics, featured_names, show_id FROM video_content WHERE is_active = true ORDER BY id")
    all_rows = cur.fetchall()

    print(f"\n  Total active video_content rows: {len(all_rows)}")
    print(f"  Already have embeddings: {len(existing_embedding_ids)}")

    rows_to_embed = []
    for row in all_rows:
        vc_id = row[0]
        if vc_id in existing_embedding_ids:
            skipped += 1
            continue
        rows_to_embed.append(row)

    print(f"  Rows needing embeddings: {len(rows_to_embed)}")

    if dry_run:
        print(f"  [DRY] Would generate {len(rows_to_embed)} embeddings")
        return len(rows_to_embed), skipped, []

    # Process in batches of 20
    batch_size = 20
    for batch_start in range(0, len(rows_to_embed), batch_size):
        batch = rows_to_embed[batch_start:batch_start + batch_size]
        texts = []
        batch_ids = []

        for row in batch:
            vc_id, wp_id, title, description, ai_summary, ai_key_topics, featured_names, show_id = row

            # Build content text
            parts = [title or ""]
            if description:
                clean_desc = re.sub(r'<[^>]+>', '', description).strip()
                if clean_desc and "unauthorized" not in clean_desc.lower():
                    parts.append(clean_desc)
            if ai_summary:
                clean_summary = re.sub(r'<[^>]+>', '', ai_summary).strip()
                if clean_summary and clean_summary != clean_desc if description else True:
                    parts.append(clean_summary)

            # Add enriched data from WP export if available
            if wp_id and wp_id in post_lookup:
                post = post_lookup[wp_id]
                pillar_names = [p["name"] for p in post.get("pillars", []) if p.get("name")]
                if pillar_names:
                    parts.append("Topics: " + ", ".join(pillar_names))
                takeaways = [t for t in post.get("takeaways", []) if t]
                if takeaways:
                    parts.append("Key Takeaways: " + " | ".join(takeaways))
                ts_labels = [ts["label"] for ts in post.get("timestamps", []) if ts.get("label")]
                if ts_labels:
                    parts.append("Segments: " + ", ".join(ts_labels))

            # Featured names
            if featured_names:
                if isinstance(featured_names, list):
                    names = featured_names
                elif isinstance(featured_names, str):
                    names = [n.strip() for n in featured_names.strip("{}").split(",") if n.strip()]
                else:
                    names = []
                if names:
                    parts.append("Featuring: " + ", ".join(names))

            # Key topics
            if ai_key_topics:
                if isinstance(ai_key_topics, str):
                    try:
                        topics = json.loads(ai_key_topics)
                    except json.JSONDecodeError:
                        topics = []
                elif isinstance(ai_key_topics, list):
                    topics = ai_key_topics
                else:
                    topics = []
                if topics:
                    parts.append("Topics: " + ", ".join(str(t) for t in topics))

            content_text = "\n".join(parts)
            # Truncate to ~8000 tokens (~32000 chars)
            if len(content_text) > 32000:
                content_text = content_text[:32000]

            # Build per-row metadata for the entity_embeddings.metadata JSONB blob.
            # CRITICAL: include `entity_name` (canonical cross-type name field) AND
            # `title` (alias for AIOS find() consumer per TPX_HYBRID_SEARCH_CONTRACT.md).
            # Without these, AIOS renders results as "(untitled)". This was the bug
            # surfaced 2026-05-02 — original code only stored {source, wp_post_id}.
            featured_names_list = []
            if featured_names:
                if isinstance(featured_names, list):
                    featured_names_list = featured_names
                elif isinstance(featured_names, str):
                    featured_names_list = [n.strip() for n in featured_names.strip("{}").split(",") if n.strip()]
            row_metadata = {
                "source":         "ic_wordpress_backfill",
                "entity_name":    title or "",
                "title":          title or "",
                "featured_names": featured_names_list,
                "show_id":        show_id,
                "wp_post_id":     wp_id,
            }

            texts.append(content_text)
            batch_ids.append((vc_id, content_text, row_metadata))

        # Generate embeddings via OpenAI batch API
        try:
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=texts,
            )

            # Sort by index to match input order
            sorted_data = sorted(response.data, key=lambda x: x.index)

            for i, emb_data in enumerate(sorted_data):
                vc_id, content_text, row_metadata = batch_ids[i]
                embedding = emb_data.embedding

                # Format as pgvector string
                vector_str = "[" + ",".join(str(x) for x in embedding) + "]"

                try:
                    cur.execute("""
                        INSERT INTO entity_embeddings (
                            entity_type, entity_id, embedding_type, model_version,
                            content, content_embedding, metadata, created_at, updated_at
                        ) VALUES (
                            'video_content', %s, 'hybrid_search', %s,
                            %s, %s::vector, %s::jsonb, NOW(), NOW()
                        )
                        ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                            content = EXCLUDED.content,
                            content_embedding = EXCLUDED.content_embedding,
                            model_version = EXCLUDED.model_version,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW()
                    """, (
                        vc_id,
                        EMBEDDING_MODEL,
                        content_text,
                        vector_str,
                        json.dumps(row_metadata),
                    ))
                    generated += 1
                except Exception as e:
                    errors.append({"vc_id": vc_id, "error": str(e)})
                    print(f"  ERROR inserting embedding for vc.id={vc_id}: {e}")
                    conn.rollback()
                    cur = conn.cursor()

            conn.commit()
            total_done = generated + skipped
            print(f"  Embeddings: {generated} generated, {skipped} skipped ({total_done}/{len(all_rows)} total)")

            # Rate limit: 1 second between batches
            if batch_start + batch_size < len(rows_to_embed):
                time.sleep(1)

        except Exception as e:
            print(f"  ERROR in batch starting at idx {batch_start}: {e}")
            errors.append({"batch_start": batch_start, "error": str(e)})
            # Try one-by-one fallback
            for i, (vc_id, content_text, row_metadata) in enumerate(batch_ids):
                try:
                    single_resp = client.embeddings.create(
                        model=EMBEDDING_MODEL,
                        input=content_text,
                    )
                    embedding = single_resp.data[0].embedding
                    vector_str = "[" + ",".join(str(x) for x in embedding) + "]"

                    cur.execute("""
                        INSERT INTO entity_embeddings (
                            entity_type, entity_id, embedding_type, model_version,
                            content, content_embedding, metadata, created_at, updated_at
                        ) VALUES (
                            'video_content', %s, 'hybrid_search', %s,
                            %s, %s::vector, %s::jsonb, NOW(), NOW()
                        )
                        ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                            content = EXCLUDED.content,
                            content_embedding = EXCLUDED.content_embedding,
                            model_version = EXCLUDED.model_version,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW()
                    """, (
                        vc_id,
                        EMBEDDING_MODEL,
                        content_text,
                        vector_str,
                        json.dumps(row_metadata),
                    ))
                    conn.commit()
                    generated += 1
                    time.sleep(0.5)
                except Exception as e2:
                    errors.append({"vc_id": vc_id, "error": str(e2)})
                    print(f"  ERROR (single) vc.id={vc_id}: {e2}")
                    conn.rollback()
                    cur = conn.cursor()

    cur.close()
    return generated, skipped, errors


def update_show_episode_counts(conn):
    """Update episode_count on each show based on actual video_content rows."""
    cur = conn.cursor()
    cur.execute("""
        UPDATE shows SET episode_count = sub.cnt, updated_at = NOW()
        FROM (
            SELECT show_id, COUNT(*) as cnt
            FROM video_content
            WHERE show_id IS NOT NULL AND is_active = true
            GROUP BY show_id
        ) sub
        WHERE shows.id = sub.show_id
    """)
    conn.commit()
    updated = cur.rowcount
    cur.close()
    return updated


def main():
    parser = argparse.ArgumentParser(description="Backfill IC WordPress content into TPX PostgreSQL")
    parser.add_argument("--insert-only", action="store_true", help="Only insert/update video_content rows")
    parser.add_argument("--embeddings-only", action="store_true", help="Only generate embeddings")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without writing")
    args = parser.parse_args()

    print("=" * 70)
    print("IC WordPress -> TPX PostgreSQL Backfill")
    print("=" * 70)

    # Load export
    if not EXPORT_FILE.exists():
        print(f"ERROR: Export file not found: {EXPORT_FILE}")
        print("Run the WP CLI export first (see script header).")
        sys.exit(1)

    with open(EXPORT_FILE, "r", encoding="utf-8") as f:
        posts = json.load(f)
    print(f"Loaded {len(posts)} posts from {EXPORT_FILE.name}")

    # Connect to production DB
    print(f"Connecting to production DB at {PROD_DB['host']}...")
    conn = get_db_connection()
    print("Connected.")

    # Load reference data
    shows_map = load_shows(conn)
    print(f"Loaded {len(shows_map)} show slug mappings")

    existing_wp_ids = load_existing_wp_ids(conn)
    print(f"Existing video_content rows with wp_post_id: {len(existing_wp_ids)}")

    existing_embedding_ids = load_existing_embeddings(conn)
    print(f"Existing video_content embeddings: {len(existing_embedding_ids)}")

    # --- Step 1: Insert/Update video_content ---
    if not args.embeddings_only:
        print("\n" + "=" * 50)
        print("STEP 1: Insert/Update video_content rows")
        print("=" * 50)

        inserted, updated, insert_errors = insert_or_update_video_content(
            conn, posts, shows_map, existing_wp_ids, args.dry_run
        )
        print(f"\n  Results: {inserted} inserted, {updated} updated, {len(insert_errors)} errors")
        if insert_errors:
            for e in insert_errors[:5]:
                print(f"    - wp={e['wp_post_id']}: {e['error']}")

        # Refresh existing data after inserts
        existing_wp_ids = load_existing_wp_ids(conn)

        # Update show episode counts
        if not args.dry_run:
            shows_updated = update_show_episode_counts(conn)
            print(f"  Updated episode counts for {shows_updated} shows")

    # --- Step 2: Generate embeddings ---
    if not args.insert_only:
        print("\n" + "=" * 50)
        print("STEP 2: Generate embeddings for entity_embeddings")
        print("=" * 50)

        # Refresh embedding count
        existing_embedding_ids = load_existing_embeddings(conn)

        generated, skipped, embed_errors = generate_embeddings(
            conn, posts, shows_map, existing_wp_ids, existing_embedding_ids, args.dry_run
        )
        print(f"\n  Results: {generated} generated, {skipped} skipped, {len(embed_errors)} errors")
        if embed_errors:
            for e in embed_errors[:5]:
                print(f"    - {e}")

    # --- Step 3: Verify ---
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)

    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM video_content")
    total_vc = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM video_content WHERE processed_status = 'backfilled'")
    backfilled = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM video_content WHERE wp_post_id IS NOT NULL")
    with_wp = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM entity_embeddings WHERE entity_type = 'video_content'")
    embeddings = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM video_content WHERE is_active = true")
    active = cur.fetchone()[0]

    cur.execute("""
        SELECT s.name, COUNT(vc.id) as episodes
        FROM shows s
        LEFT JOIN video_content vc ON s.id = vc.show_id AND vc.is_active = true
        GROUP BY s.id, s.name
        HAVING COUNT(vc.id) > 0
        ORDER BY episodes DESC
    """)
    show_stats = cur.fetchall()

    cur.close()
    conn.close()

    print(f"  Total video_content rows:       {total_vc}")
    print(f"  Backfilled rows:                {backfilled}")
    print(f"  Rows with wp_post_id:           {with_wp}")
    print(f"  Active rows:                    {active}")
    print(f"  entity_embeddings (video):      {embeddings}")
    print(f"\n  Episodes by show:")
    for name, count in show_stats:
        print(f"    {name}: {count}")

    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)


if __name__ == "__main__":
    main()
