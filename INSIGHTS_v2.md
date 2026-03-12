# LILA BLACK — Design Insights

**Dataset:** 20 sessions · 9 players · AmbroseValley + Lockdown · 5 days production data (Feb 10–14, 2026)
**Coordinate system:** Verified against 2000×2000 minimap images and README origin/scale values.

---

## Insight 1 — Players are only using 31% of AmbroseValley

**What caught my eye**

When you map all recorded events onto an 8×8 grid of the minimap, only 20 of 64 cells register any activity. Nearly 70% of the map produces no gameplay at all.

**The data**

```
 ·  ·  ·  ·  ·  ·  ·  ·
 ·  ·  5  ·  2  2  ·  ·
 4  6  4 13 33  7  ·  ·
 1  7  2 13 12  ·  ·  ·
 3  8  5 15  ·  ·  ·  ·
 ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  1  ·  ·  ·  ·
 ·  ·  ·  ·  ·  ·  ·  ·
```
Event count per cell. · = zero. Top-left = NW corner of map.

The active zone is a roughly 4×4 block in the centre-left. Everything east of that, the entire northern strip, the entire southern strip, and the bottom half of the map: empty. The right side of the map has only **4 events total — 3% of all activity** — and zero kills.

**Actionable items**
- The eastern half needs a pull. Based on Insight 2, a high-value loot spawn is the most reliable way to redirect traffic — players go where loot is
- Check what is in the dead zones geometrically. No landmarks, no cover worth crossing open ground for, no named POI? Players will never go there regardless of how well built it is
- Consider whether the map's intended play area matches its physical footprint. If 70% is reliably avoided, every design decision made for that 70% has no effect on the game

**Metrics to watch:** Event distribution across map grid, percentage of cells visited per match, average player path length

**Why a level designer should care**

If players consistently ignore 70% of the map, every piece of that terrain — cover placement, sight lines, verticality, points of interest — is wasted work. The playable space is effectively much smaller than the map you built, and the encounter pacing, loot balance, and storm timing that were designed for the full area are now miscalibrated.

---

## Insight 2 — Loot is where fights happen. Every time.

**What caught my eye**

92% of kill grid cells overlap with loot grid cells. That is 11 out of 12. The kill-per-loot ratio holds almost constant across every zone that has activity.

**The data**

| Zone | Kills | Loot pickups | Kill-per-loot |
|------|-------|--------------|---------------|
| Centre (X: -100 to 150) | 16 | 32 | 0.50 |
| Left (X < -100) | 5 | 11 | 0.45 |
| Right (X > 150) | 0 | 2 | 0.00 |

Centre and Left both sit around 0.5 kills per loot pickup regardless of geography. The Right zone has loot but zero kills — because no one else is there to contest it. The ratio only breaks when a player is alone. When two players are in the same zone, a fight happens roughly once every two loot pickups.

**Actionable items**
- Loot placement is your fight placement tool. If you want a fight at a specific location, put desirable loot there — the data says players will converge on it
- To reduce fight density in the current hotzone (world X: 80–157, Z: 107–131), reduce loot spawn count there rather than adjusting cover or pathing
- The Right zone has loot but no fights because no one is there to contest it. Moving that loot to the active zone's eastern edge could create an incentive to push east without a full geometry redesign

**Metrics to watch:** Kill-per-loot ratio by zone, loot pickup distribution vs kill distribution, contest rate at individual spawn locations

**Why a level designer should care**

If loot placement is the actual fight driver — more than cover, elevation, or routing — then the loot layout is your most powerful design lever. Changing cover without moving loot will not move fights. That is worth knowing before spending time on geometry changes that will not shift player behaviour.

---

## Insight 3 — The southern half of AmbroseValley has almost no gameplay

**What caught my eye**

The north-south split is as dramatic as the east-west one. Players are not just avoiding the right side — they are also avoiding the bottom half of the map almost entirely.

**The data**

| Zone | Events | Kills |
|------|--------|-------|
| North (world Z > 100) | 65 | 6 |
| Mid (Z: -100 to 100) | 18 | 4 |
| South (Z < -100) | 16 | 3 |

North has four times the activity of the south despite covering roughly the same area. Combined with the east-west dead zone, nearly all gameplay is compressed into the upper-centre portion of the map — a fraction of the total playable area.

**Actionable items**
- Check whether the storm contracts northward. If the final circle consistently lands in the north, players have no reason to start south
- Look at drop-in spawn points. If players default to the northern zone at match start, the south never gets an early foothold and gets routed around for the rest of the match
- Elevation may be a factor. If the northern zone offers a height advantage over any southern approach, players will hold north and never push south

**Metrics to watch:** Match start positions by zone, storm final circle location, event density by latitude over match duration

**Why a level designer should care**

A map that collapses into one corner is not delivering the experience it was designed for. Encounter variety, routing decisions, and the strategic value of different areas all depend on players actually moving through the full space. If north always wins by default, the rest of the design is irrelevant to the match outcome.

---

## Insight 4 — One player is winning every session by barely moving

**What caught my eye**

Player `2c551757` has a 6 kill / 0 death record across 3 separate sessions. Their movement range in two of those sessions is under 70 map pixels — and in one session, just 7 pixels wide. That is roughly 6 world units of lateral movement across an entire match. They are holding one spot and other players are walking into them, repeatedly.

**The data**

| Session | Kills | Deaths | Loot | X movement |
|---------|-------|--------|------|------------|
| 363f3851 | 2 | 0 | 4 | 26 px |
| 39a88d87 | 2 | 0 | 4 | 66 px |
| e325a53a | 2 | 0 | 5 | 7 px |

Same result across all 3 sessions. The strategy is reliable enough that they repeat it every match with zero variation.

**Actionable items**
- Cross-reference `2c551757`'s X/Z coordinates across all 3 sessions — if they cluster to the same world location, that is a confirmed camp spot
- Examine the geometry: single entry point, wide angle window, height advantage with no counter-position, or a choke the storm forces players through?
- Fix options: add a second approach angle, add a destructible element that opens a flank, reduce the sight line, or shift a loot spawn to force a different approach direction

**Metrics to watch:** Position variance over time per player, kills per map area unit, time stationary above a movement threshold

**Why a level designer should care**

A position that produces a clean 6/0 record across multiple sessions is not a skill expression — it is a map failure. When one static spot reliably outperforms all other strategies with no cost, the map is giving players the correct answer. That removes meaningful decision-making and frustrates everyone who is not using it.

---

## Insight 5 — Lockdown produces almost no fights

**What caught my eye**

The one timed Lockdown session ran for **28 minutes** — nearly three times the average AmbroseValley match — with just 1 kill. The event rate is 0.4 per minute versus AmbroseValley's 1.1. A player spent half an hour in a battle royale match and barely saw combat.

**The data**

| Map | Avg duration | Event rate | Kills |
|-----|-------------|------------|-------|
| AmbroseValley | ~10–11 min | 1.1 ev/min | 33 total |
| Lockdown | 28 min | 0.4 ev/min | 1 |

Single session sample — treat it as a signal, not a conclusion. But the gap is large enough to investigate.

**Actionable items**
- Check storm compression timing on Lockdown. If the safe zone shrinks slowly, players can survive by avoiding each other for extended periods — this session suggests that is exactly what is happening
- Compare loot density per square metre between maps. Fewer convergence points means more room to avoid other players
- Look for long open sightlines that punish traversal. If crossing open ground feels dangerous with no reward, players stay put and wait for the storm to move them

**Metrics to watch:** Average match duration, time-to-first-kill, kills per match, storm death rate

**Why a level designer should care**

A battle royale map needs to funnel players together at a predictable rate. A 28-minute match with one kill is not a high-tension game — it is a waiting match. If Lockdown consistently plays slower than AmbroseValley, players will feel the difference immediately, regardless of how well designed the map looks.

---

## Insight 6 — The storm is not threatening anyone

**What caught my eye**

Across all 20 sessions, there is exactly **1 storm death out of 8 total deaths**. Players are dying to each other seven times more often than to the storm. The one storm death happened near the map centre, not on the periphery where a late-game squeeze would put it.

**The data**

- Total recorded deaths: 8
- KilledByStorm: 1 (12% of all deaths)
- Storm deaths per match: effectively zero in 19 of 20 sessions

**Actionable items**
- Check storm damage values. If players can absorb storm hits for 20–30 seconds without urgency they will not change their routing because of it
- Reduce storm warning time or increase contraction speed in mid-game. Players should occasionally be caught out if they are not actively repositioning
- Check final circle size. If the endgame zone is large enough that two players can still avoid each other inside it, the storm has already failed its purpose

**Metrics to watch:** Storm death rate per match, average player distance from storm edge at match end, time spent outside safe zone per match

**Why a level designer should care**

The storm is your pacing mechanism. It controls how quickly players are forced together, determines routing decisions, and creates urgency in the endgame. If it has no real teeth, match pacing depends entirely on player initiative — some will push, others will wait, and the result is inconsistent match length and inconsistent tension that you cannot control through design.

---

## Summary

| # | Insight | Confidence | Fix effort | Expected impact |
|---|---------|-----------|------------|-----------------|
| 1 | 69% of map unused | High | Medium | High |
| 2 | Loot placement = fight placement | High | Low | High |
| 3 | Southern half has almost no gameplay | High | Medium | Medium |
| 4 | Camp spot producing consistent 6K/0D | Medium* | Low | Medium |
| 5 | Lockdown generates no fights | Medium* | Medium | High |
| 6 | Storm not creating pressure | High | Low | High |

*Medium confidence — small sample. Validate against the full 1,243-session dataset before acting.

---

*All coordinates verified against the 2000×2000 minimap images and README origin/scale values. Pixel positions in sessions.json use a normalised [0–1024] space mapped to world coordinates via: `world_x = (px / 1024) * scale + origin_x`*
