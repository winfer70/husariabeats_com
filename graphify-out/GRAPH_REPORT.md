# Graph Report - .  (2026-05-21)

## Corpus Check
- 56 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 305 nodes · 393 edges · 24 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `SongOut` - 19 edges
2. `showToast()` - 12 edges
3. `_db_url()` - 8 edges
4. `_row_to_out()` - 7 edges
5. `upload_file()` - 6 edges
6. `_base_html()` - 5 edges
7. `QueueTriggerOut` - 5 edges
8. `_assert_slug_exists()` - 5 edges
9. `get_upload_status()` - 5 edges
10. `main()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `triggerRelease()` --calls--> `showToast()`  [INFERRED]
  admin\src\app\queue\page.tsx → admin\src\app\voting\page.tsx
- `cancelEntry()` --calls--> `showToast()`  [INFERRED]
  admin\src\app\queue\page.tsx → admin\src\app\voting\page.tsx
- `patchAlbum()` --calls--> `showToast()`  [INFERRED]
  admin\src\app\roadmap\page.tsx → admin\src\app\voting\page.tsx
- `submitAddSong()` --calls--> `showToast()`  [INFERRED]
  admin\src\app\roadmap\page.tsx → admin\src\app\voting\page.tsx
- `submitNewAlbum()` --calls--> `showToast()`  [INFERRED]
  admin\src\app\roadmap\page.tsx → admin\src\app\voting\page.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (15): cancelEntry(), formatScheduled(), handleSubmit(), isValid(), patch(), patchAlbum(), patchSong(), patchTopic() (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (38): BaseModel, _call_n8n_webhook(), CaptionPlatform, cmd_import(), cmd_list(), cmd_queue(), cmd_queue_list(), cmd_status() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (20): _assert_exists(), create_figure(), delete_figure(), FigureCreate, FigureOut, FigureUpdate, get_figure(), list_figures() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (16): _base_html(), _button(), in_development_email(), magic_link_email(), Notify a subscriber that their voted-for topic has entered production.      Tr, Notify a subscriber that their voted-for track is now live on YouTube.      Tr, Wrap body_content in the shared HusariaBeats dark-theme email shell.      Args, Render a gold CTA button anchor tag.      Args:         url   (str): Href for (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (17): check_song_files(), create_song(), delete_song(), get_song(), list_songs(), All SongUpdate fields plus required identifiers for creating a new song., Return songs ordered by year_event ASC (nulls last), then slug.      Args:, Create a new song record.      Validates slug uniqueness and that era/status v (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (18): _assert_slug_exists(), _check_and_advance_status(), delete_file(), FileEntry, FileStatusOut, get_upload_status(), Auto-advance song to render_done when all 6 expected files are present., Stream a release file to disk at /releases/{slug}/{filename}.      Validates: (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): add_to_queue(), delete_queue_entry(), _format_queue_row(), list_queue(), QueueEntryCreate, QueueEntryOut, QueueEntryUpdate, Return all release queue entries ordered by scheduled date ascending. (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (12): AlbumCreate, AlbumOut, AlbumUpdate, create_album(), get_album(), list_albums(), Fetch a single album by its slug.      Args:         slug: URL path parameter, Create a new album record.      Validates slug uniqueness, and that era/status (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.24
Nodes (10): _fetch_yt_batch(), get_stats(), Fetch YouTube Data API v3 statistics for all released songs and upsert     plat, Platform statistics for a single song., Result summary after refreshing YouTube stats for all released songs., Fetch YouTube video statistics for a batch of video IDs.      Args:         i, Return the stored platform_stats JSONB for a single song.      Args:, refresh_all_stats() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (9): create_topic(), list_topics(), Update a topic's status or planned_release label (admin use).      Only non-No, Return all topics ordered by vote count descending., Create a new community topic suggestion.      Rate limited to 5 submissions pe, TopicCreate, TopicOut, TopicUpdate (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (9): find_feed_in_fallback(), find_thumbnail(), find_video(), main(), process_song(), Return first file matching any of the given glob patterns in search_dir., Try both hyphen and underscore thumbnail naming variants.     e.g. wojtek-niedz, Search zapomnianiFeed/ for a feed video matching this slug + language.     File (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (8): main(), parse_args(), print_song_summary(), Validate argument values that have constrained domains.      Exits with a clea, Print a formatted summary of the song being created.      Input: args — parsed, Main entry point: validate inputs, check slug uniqueness, insert song., Parse and return command-line arguments., validate_args()

### Community 13 - "Community 13"
Cohesion: 0.31
Nodes (8): fetch_published_dates(), main(), psql_exec(), psql_query(), fetch_release_dates.py — Fetch YouTube publishedAt for released songs and update, Run a SQL query in the DB container, return stdout., Execute a SQL statement in the DB container., Batch-fetch publishedAt for YouTube video IDs. Returns video_id → date.

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (5): get_settings(), Return all site settings as a flat key→value dict., Upsert a single setting value.      Key must be in the allowed set. Returns fu, SettingUpdate, update_setting()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (4): health(), lifespan(), Connect to DB and Redis on startup; disconnect on shutdown., Quick health check for nginx / uptime monitoring.

### Community 17 - "Community 17"
Cohesion: 0.4
Nodes (4): cast_vote(), Cast an upvote for a topic.     Rate-limited to once per email per topic per 24, VoteRequest, VoteResult

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.6
Nodes (3): formatCount(), GET(), getSpotifyToken()

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Coerce JSONB string to list — databases library returns JSONB as str.

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **79 isolated node(s):** `Wrap body_content in the shared HusariaBeats dark-theme email shell.      Args`, `Render a gold CTA button anchor tag.      Args:         url   (str): Href for`, `Build the vote-subscription confirmation email with a magic link.      Sent im`, `Notify a subscriber that their voted-for topic has entered production.      Tr`, `Notify a subscriber that their voted-for track is now live on YouTube.      Tr` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (1 nodes): `middleware.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `Coerce JSONB string to list — databases library returns JSONB as str.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `request.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SongOut` connect `Community 1` to `Community 4`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `FigureOut` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `SongUpdate` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `SongOut` (e.g. with `VideoBlock` and `YoutubePlatform`) actually correct?**
  _`SongOut` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `showToast()` (e.g. with `triggerRelease()` and `scheduleRelease()`) actually correct?**
  _`showToast()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `_db_url()` (e.g. with `cmd_import()` and `cmd_status()`) actually correct?**
  _`_db_url()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `_row_to_out()` (e.g. with `FigureOut` and `list_figures()`) actually correct?**
  _`_row_to_out()` has 5 INFERRED edges - model-reasoned connections that need verification._