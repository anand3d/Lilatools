# LILA BLACK — Telemetry Insights

**Dataset:** 20 sessions · 9 players · 2 maps (AmbroseValley, Lockdown) · 220 events with coordinates
**Note:** All 9 players are human. No bot sessions recovered in this sample.

---

## Insight 1 — Loot is the fight trigger, not position or rotation

**What caught my eye**

Every single kill hotzone cell overlaps with a loot hotzone cell. That's 12 out of 12 — 100% overlap. This isn't coincidence.

**The numbers**

The top kill cluster (world coords X: 56–100, Z: 110–129) accounts for **22% of all kills** and **18% of all loot pickups** — the highest concentration of both on the map. The ranking of kill cells and loot cells tracks almost identically across the map.

**What this means for design**

Players aren't fighting over angles or high ground. They're colliding because they're both going for the same chest or drop. Combat in this map is loot-driven, not position-driven.

**Actionable items**
- If you want to spread fights across the map, redistribute high-value loot into currently low-traffic zones rather than adding new cover or paths
- If you want to control pacing, reduce loot density in the top hotzone — fewer simultaneous pickups means fewer forced collisions
- Consider whether the top hotzone is narratively earned (a landmark, a building, a POI people recognise) or if the cluster is a side effect of loot spawner placement

**Metrics to watch:** Kill spread across the map, average engagement distance, time-to-first-contact per match

**Why a level designer should care**

If loot placement is your de facto fight placement, then loot is your most powerful design lever — more powerful than cover, routing, or geometry. That's either a tool or a problem, depending on whether your loot layout is intentional.

---

## Insight 2 — The top-right half of AmbroseValley is a dead zone

**What caught my eye**

The entire right side of the map (pixel x > 512, roughly half the total playable area) accounts for only **37.5% of all events**. The top-right quadrant specifically registers **zero activity** — no positions, no kills, no loot pickups.

**The numbers**

Quadrant traffic breakdown (each cell = 256×256 px block of the minimap):

```
  0 |   2 |   2 |   0   ← top row
  8 |  14 |  22 |   0
  4 |  11 |   0 |   0
  1 |   1 |   0 |   0   ← bottom row
```

The centre-left is pulling nearly all the traffic. The right half exists in the data as terrain but not as gameplay.

**What this means for design**

Players are routing around the right side entirely. Either there's nothing worth going to, the geometry creates a perceived dead end, or the path cost to reach it is too high relative to the reward.

**Actionable items**
- Walk the right side of the map and ask: what's the pull? If there's no landmark, no loot incentive, and no rotation path that passes through it, players won't go there
- Add a high-value loot spawn or a POI in the dead zone — based on Insight 1, that alone may be enough to redirect traffic
- Check sightlines from the active centre into the right side — if players can be shot at while crossing into that zone with no cover, they'll stop trying

**Metrics to watch:** Event distribution across map quadrants, average player path length, time spent in underused zones

**Why a level designer should care**

Half the map not being used means half your design work isn't contributing to the game. It also compresses all gameplay into a smaller space than intended, which can skew encounter pacing, loot balance, and storm timing.

---

## Insight 3 — Lockdown is dramatically slower than AmbroseValley

**What caught my eye**

The one Lockdown session with timestamp data ran for **28 minutes** at **0.4 events per minute**. AmbroseValley sessions average **10–11 minutes** at **1.0–1.2 events per minute** — three times the activity rate.

**The numbers**

| Map | Avg duration | Avg event rate |
|-----|-------------|----------------|
| AmbroseValley | ~10 min | ~1.1 events/min |
| Lockdown | 28 min | 0.4 events/min |

Zero kills and zero deaths recorded in the Lockdown session. The player looted and moved but never engaged.

**What this means for design**

Lockdown either has a scale problem, a loot density problem, or a sightline problem that makes players passive. A 28-minute match with no kills suggests players can avoid each other for too long — which in a battle royale reads as low tension, not strategic depth.

**Actionable items**
- Check the storm compression timing on Lockdown — if the safe zone shrinks too slowly, players can survive by hiding indefinitely
- Compare loot density per square metre between the two maps — if Lockdown has fewer chests relative to its size, players have less reason to converge on the same locations
- Check for long open sightlines that discourage crossing — if traversal feels punishing, players stay put

**Metrics to watch:** Average match duration, time-to-first-kill, storm death rate, kills per match

**Why a level designer should care**

A battle royale map needs to funnel players together at a predictable rate. If one map lets players avoid combat for 28 minutes, it's not delivering the same experience as your other maps — and players will notice.

---

## Insight 4 — One player dominates by barely moving

**What caught my eye**

Player `2c551757` has the highest kill efficiency in the dataset: **6 kills, 0 deaths across 3 sessions**. Their movement range within each session is tiny — sometimes just **7 pixels** of lateral movement on the minimap (roughly 6 world units).

**The numbers**

| Session | Kills | Deaths | Loot | Movement range (px) |
|---------|-------|--------|------|---------------------|
| 363f3851 | 2 | 0 | 4 | 26 wide × 128 tall |
| 39a88d87 | 2 | 0 | 4 | 66 wide × 149 tall |
| e325a53a | 2 | 0 | 5 | **7 wide** × 132 tall |

They're not roaming — they're holding a corridor or a choke and letting kills come to them. And it's working every time.

**What this means for design**

There's at least one static position (likely a doorway, stairwell, or narrow path) where a player can anchor for an entire match without needing to reposition, and still achieve a positive K/D. That's a camp spot, and it's being exploited consistently.

**Actionable items**
- Cross-reference `2c551757`'s coordinates across sessions — if their X/Z ranges cluster to the same world location across matches, that's a confirmed problem spot
- Look at the geometry there: is there single-entry cover with no flank? A window with a wide angle? A height advantage with no counter-position?
- Solutions: add a second entry, remove or soften the cover, add a destructible element, or shift a loot spawn to incentivise players to approach from a different angle

**Metrics to watch:** Variance in player position over time, kills-per-area, camp spot detection (time stationary > threshold)

**Why a level designer should care**

Camp spots that work reliably every match aren't a player skill expression — they're a map design failure. If one position consistently outperforms all others with zero cost, the map is telling players the correct answer. That removes meaningful decision-making and frustrates everyone who isn't using it.

---

## Insight 5 — The storm is not doing its job

**What caught my eye**

Across all 20 sessions and 220+ events, there is **exactly 1 storm death** in the entire dataset. Players are dying to each other 23 times more than to the storm.

**The numbers**

- BotKill (kills): 34
- KilledByStorm: 1
- Storm death rate: **~3% of all deaths**

The one storm death occurred at world coords X: 93, Z: 0 — near the centre of the map, not on the periphery where you'd expect a late-game squeeze.

**What this means for design**

In a battle royale, the storm is a pacing tool. It should be compressing the playable space at a rate that forces engagement. A near-zero storm death rate means players are staying ahead of it comfortably — the storm is a visual effect, not a mechanical pressure.

**Actionable items**
- Reduce storm warning time or increase contraction speed in early phases — players should occasionally be caught if they're not paying attention
- Check if storm damage is high enough to be threatening — if players can tank it for 30 seconds without urgency, it's not working
- Consider tightening the final circle size — if the endgame safe zone is too large, players can still avoid each other in the final ring

**Metrics to watch:** Storm deaths per match, average distance from storm edge at match end, time players spend outside the zone

**Why a level designer should care**

The storm is your map's invisible hand. It controls pacing, forces route decisions, and makes the game feel alive even when there are no players nearby. If it has no teeth, you lose all of that. Match pacing becomes entirely dependent on player initiative — and this data shows players aren't always initiating.

---

## Summary table

| # | Insight | Confidence | Effort to fix | Impact |
|---|---------|-----------|--------------|--------|
| 1 | Loot placement = fight placement | High | Low | High |
| 2 | Right half of AmbroseValley unused | High | Medium | High |
| 3 | Lockdown too slow, no engagement | Medium* | Medium | High |
| 4 | Static camp spot being exploited | Medium* | Low | Medium |
| 5 | Storm not creating pressure | High | Low | High |

*Medium confidence due to single-session sample for Lockdown, and single-player sample for camp spot. Both warrant follow-up with a larger dataset.

---

*Generated from 5 days of production telemetry (Feb 10–14, 2026). Expand to the full 1,243-session dataset to raise confidence on insights 3 and 4.*
