## [2026-05-06] Key Decisions

- childPrice: null (not 0) = "not found/unavailable", 0 = "free"
- snapshot-based interaction preferred over evaluate()
- sleep() kept as last resort fallback
- Retry max 2 with 1s delay
- 20-line → 40-line look-ahead for tier text parsing
- 3-tier → 10-tier limit in extractChildPricesPerTier()
- /gi regex: confirmed working correctly (fresh objects per call) — leave as-is
