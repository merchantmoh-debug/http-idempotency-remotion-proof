# Checked proof sample

Verified 2026-10-01. The delivered video uses actual synthetic example outputs rather than invented terminal results.

| Check | Result |
| --- | --- |
| HTTP example | 12/12 assertions pass: lost response, committed state, retry status, order identity/count, and changed-payload conflict |
| Clean execution | Two runs with only three example files and no dependencies produce identical execution evidence |
| Packaged source | Independently extracted and executed successfully |
| TypeScript | Compilation check passes |
| Text bounds | 17 representative 1920×1080 frames pass screen and parent-card text checks, including entrances and final frame |
| Visual inspection | Seven encoded-frame samples reviewed across all scenes; a subsequent review checked the preview and eight encoded frames |
| Video | H.264 / yuv420p; 1920×1080; 30fps; 1,800 frames; exact 60.000 seconds |
| Decode | Entire delivered MP4 decodes with no errors |
| Ending | Five-second hold; source stills at 55 seconds and the final frame are byte-identical; final encoded frame inspected |
| Audio | Zero audio streams; intentionally silent and captioned |

Delivered MP4 SHA-256: `eb35d78493ab580f5ddbc0cffe15e8d52621d1eb4c1761bbbedf9a04b1ee97ac`.

Listening review is not applicable because no audio track exists. Continuous real-time playback review, fresh dependency/browser installation on another machine, production concurrency/persistence and commercial conversion remain unverified. The example demonstrates sequential retries against an in-memory service, not a complete payment system.

The repository includes only original source, synthetic execution evidence, documentation, and rendered media. No private harness, credentials, client material, dependency cache, font binaries, or local delivery metadata is included. Existing rights remain unchanged.
