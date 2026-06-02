# App Store Screenshots — VividCoach

## Spec

**Platform:** iOS App Store (iPhone 6.7")  
**Canvas size:** 1290 × 2796 px (3× scale, iPhone 16 Pro Max)  
**Device frame:** iPhone 16 Pro frame, screen corner radius 47pt (141px at 3×)  
**App Store listing:** [App ID 6767934258](https://appstoreconnect.apple.com/apps/6767934258)

---

## 5 Required Screenshots

| # | Screen | Overlay Headline |
|---|--------|-----------------|
| 1 | Coach reveal (onboarding) | *"28 coaches. One perfect match."* |
| 2 | Active chat / Train tab | *"Coaching that actually knows you."* |
| 3 | Progress dashboard | *"Every rep. Every step. Every win."* |
| 4 | Home + health auto-sync | *"No manual logging required."* |
| 5 | Weekly recap card | *"Your weekly debrief, from your coach."* |

---

## Demo State for Simulator Capture

Use a seeded demo account with ~4 weeks of realistic data. Target state:

### Demo account seed data
```
User name: Jordan
Goals: "Lose 15 lbs before summer, build strength to run a 5K"
Constraints: ["No gym access", "Morning workouts"]
Selected coach: Mara (ID 1, warm vibe)
Custom coach name: (none — use "Mara")
```

### Data requirements

| Table | Volume | Notes |
|-------|--------|-------|
| `workout_logs` | 20–25 entries | Mix of Upper Body, Lower Body, Cardio, Morning Run across last 28 days |
| `meal_logs` | 50–60 entries | 2–3 meals/day, mix of protein-heavy meals |
| `weight_logs` | 28 entries | Starting ~166 lbs, trending down to ~163 lbs over 4 weeks |
| `messages` | 15–20 messages | 2–3 recent chat exchanges with Mara |

### Health data (iOS Simulator only)
- Steps: 7,218 today, ~43k this week
- Sleep: 7.2h last night
- Active calories: 312
- Resting heart rate: 62 bpm

---

## Screen-by-Screen Capture Guide

### Screen 1 — Coach Reveal
**Route:** `/onboarding/coach-reveal` or replay via Profile → Dev → Replay Reveal  
**State:** Coach = Mara, vibe = warm, full-bleed photo visible  
**Before capture:** Ensure the page is scrolled to show Mara's full-body photo, vibe badge, bio, and green CTA button  
**Capture key:** ⌘+S in Simulator at 6.7" size

### Screen 2 — Active Chat (Train tab)
**Route:** `/(tabs)/train`  
**State:** 3–5 messages visible, most recent coach message showing data-informed insight, typing indicator or fresh coach reply  
**Before capture:** Send a message and wait for coach reply so the conversation feels alive

### Screen 3 — Progress Dashboard
**Route:** `/(tabs)/progress`  
**State:** Week strip shows 5–6 active days, steps ring at ~90%, active days ring at 5/7, weight trending down, steps bar chart with 7 bars visible  
**Before capture:** Scroll to top so week strip, metrics row, and steps chart all visible

### Screen 4 — Home + Health Sync
**Route:** `/(tabs)/home`  
**State:** Coach photo (left), "Hey Jordan," greeting (right), health card shows live steps/sleep/calories/heart rate with data (not dashes)  
**Before capture:** Ensure HealthKit is connected and data is populated — steps, sleep, active cal, heart rate all showing real values

### Screen 5 — Weekly Recap
**Route:** `/weekly-recap`  
**State:** Recap card fully generated with Jordan's data, stats row shows workouts/meals/weight/active days, VividCoach brand header visible  
**Before capture:** Wait for AI generation to complete; scroll so the full card is visible

---

## Post-Processing in Figma

### Setup
1. Open Figma → New File → Frame: iPhone 16 Pro Max (430 × 932)  
2. Import the iPhone 16 Pro device frame (corner radius: **47pt**)  
3. Place simulator screenshot inside the frame, clip to device screen

### Per-screenshot composition (1290 × 2796px canvas)
1. Background: `#0e100f` solid fill
2. Device frame centered, screenshot clipped inside
3. Add overlay copy (above the device):

**Typography:**
- Eyebrow: `VividCoach` — **Inter Tight Bold**, 11pt, color `#d8ff3e`, tracking +500
- Headline: **Fraunces 700 Italic**, 36pt, color `#f4f1ea`, tracking -2
- (Optional) Sub-copy: **Inter Tight Regular**, 15pt, color `rgba(244,241,234,0.75)`

**Headline layout:**
- Eyebrow centered at y=80pt from top safe area
- Headline centered at y=108pt from top safe area

### Export settings
- Format: PNG
- Scale: 1× (canvas is already at 1290 × 2796px device pixels)
- Color profile: sRGB
- Max file size: 30 MB per image (App Store limit)
- Optimize: run through `pngquant --quality 85` or equivalent

---

## Hero Lifestyle Images (Higgsfield)

Available for background/marketing use in compositions:

| Ratio | URL |
|-------|-----|
| 9:16 | `https://d8j0ntlcm91z4.cloudfront.net/user_3EPnXnTjWjKh3eDpIKoTRk46K9V/hf_20260602_050132_c464f660-0578-4db9-acec-573e88e4841a.png` |
| 16:9 | `https://d8j0ntlcm91z4.cloudfront.net/user_3EPnXnTjWjKh3eDpIKoTRk46K9V/hf_20260602_050136_024aee91-51db-4604-8e9b-3683b726f4d8.png` |

---

## HTML Mockup Compositions (Marketing Engineer deliverable)

High-fidelity HTML compositions have been produced at 1290×2796px matching the VividCoach design system. These serve as layout references and can be refined into final Figma exports.

**Location:** `docs/app-store-screenshots/` in this repo  
**Files:**
- `screen1-coach-reveal.html` + `01-coach-reveal.png`
- `screen2-chat-train.html` + `02-chat-train.png`
- `screen3-progress.html` + `03-progress.png`
- `screen4-home-health.html` + `04-home-health.png`
- `screen5-weekly-recap.html` + `05-weekly-recap.png`

---

## Acceptance Criteria

- [ ] 5 screenshots exported at 1290×2796px
- [ ] Each screenshot includes overlay headline matching the brief
- [ ] iPhone 16 Pro device frame applied (47pt corner radius)
- [ ] Overlay copy in Fraunces Italic (headline) + Inter Tight (body)
- [ ] File size ≤ 30 MB each
- [ ] Uploaded to App Store Connect listing for app 6767934258
