# RBR World Tour: design file

The site at auroruse.github.io/rbrwt. Every page is built against this file. When a build and this file disagree, either the build is wrong or this file changes first, on purpose.

Decided with Moukden and Kirin, 2 October 2026. Reworked the same day after the first sample read as barebones: Neue Montreal throughout, the new header art and wordmark, the S1 ticker cut, the page continuing the art's water.

---

## 1. The site

**Job:** showcase, official record and fan hub for the Rocket Bot Royale World Tour. Recruitment is one section, never the headline.

**Seasons.** Season 1 is RBRWT I to X and is an archive. Season 2 is the focus. It opens with RBRWT XI; numbering never resets. Each tour stands alone: no season standings, no season champion.

**The S2 field** is whatever sits in `assets/franchises/`. A former franchise rejoins when its logo moves there from `assets/former franchises/`.

### Menu

Home · Tours · Franchises · Stats · History · About

Home is the dispatch in site form, so About, Franchises and History scroll to their sections on Home and the menu follows the section in view. Tours and Stats are pages of their own once S2 is running.

### Pages

**Home**, in the dispatch's order:
1. The hero: the scene from `assets/header/background.avif` with the header wordmark (`assets/header/header.png`) surfacing over its water. On phones the wordmark stacks: logo, WORLD, TOUR.
2. The season band, laid across the seam where the header meets the water and spanning the whole screen: SEASON 2, RBRWT XI, the start. No date yet: "Date TBA". Once XI has a date, a countdown takes its place.
3. About: the dispatch's Overview as the lead, three facts beside it (tours played, matches played, franchises to date), the dispatch's Format as five numbered steps, and Joining the Tour as three steps in order.
4. Franchises: every S2 franchise with its home region and roster, in alphabetical order of code until S2 has results.
5. History: the S1 champions hanging from the rafters, the tours table, the records and the kill leaders.

**Tours.** S2 tours from XI onward, one row each: numeral, date, host, champion once played. Each tour has its own page: format bracket, standings, kill leaderboard game by game, awards, replay links. Replays always link out, never embed.

**Franchises.** A logo grid of the S2 field. Each tile opens a franchise page:
1. The banner, playing the broadcast intro.
2. Tabs: S2 (default) and S1.
3. S2: roster cards, tour-by-tour record, franchise records, home region panel (region flag from NationStates, link to the region, founding tour).
4. S1: titles, award winners, the S1 roster.

Former franchises have no page; they live in History. A franchise that rejoins gets its page back, S1 tab included.

**Stats.** S2 only: player leaderboard (sortable, filter by franchise), franchise table, records. No charts. Kills per game is ranked only from 10 games up; players under that show their numbers unranked. Before XI is played: "Starts at XI".

**History** and **About** are sections of Home (see above). S1 has no tour pages and no game-by-game numbers on the site.

### Words

- Broadcast voice, short. No intro paragraphs, no "welcome", nothing that explains what a page is. A heading and the content are the page.
- Empty states are two or three words: "Date TBA", "Starts at XI", "Roster TBA".
- Players appear by in-game name only. NationStates nations are never shown. Garbelia appears as Garbelia everywhere.
- Names never wrap onto a second line and never shrink to fit. A name too long for its space slides sideways and back under a fade at the right edge, the same way the football engine's names do.
- Home regions use the names in the table under Franchise colours, linked to their NationStates region where one exists.
- Franchises: code above name, as in the dispatch (`TAL` over `EAGLES`). In running text: "TAL Eagles".
- Tours: "RBRWT XI", Roman numerals always.
- Dates: "25 May 2026".
- Awards: MVP (Most Valuable Player), TF (top fragger of the finals), RotM (Rookie of the Month), MI (Most Improved). The abbreviation in tables; the full name in the legend and on hover. X's TF carries the note "conference stage only".
- Footer, every page: "Produced by Moukden and Kirin. Do not reproduce without explicit permission." / "This event adheres to MGC Sanctions." (linked) / "Fan tournament, not affiliated with Winterpixel Games."

### Data

- Kill sheets: `assets/sheets/*.tsv`, Kirin's cleaned copies. They beat the Google sheets and the all-time sheet wherever they disagree, and S1 totals are rebuilt from them.
- `10 finals.tsv` is a copy of VIII's finals and is never read. X's kills cover its conference stage only.
- After each S2 tour Kirin sends that tour's sheet; it is added and the site republished. The browser never fetches a sheet.
- S2 sheets need each game's winner as well as the kills. Wins, win rates, standings and finals reached cannot come from kill sheets.
- NationStates nations are used only behind the scenes: the dispatch gives I to VIII's award winners by nation, and they are turned into in-game names before anything is shown.

---

## 2. Look

Pro esports broadcast over the game's flooding map. The header is the surface; everything below it is the water, darkening with depth, so the art never ends in a hard edge. Game art appears only in the header. Everything else is type, colour fields, hairlines and motion.

### Colour

| Token | Hex | Use |
|---|---|---|
| `--abyss` | #030A1F | the deepest water: the bottom of every page, footer, menu sheet, solid bar |
| `--deep` | #061433 | card bodies |
| `--surface` | #0A1C45 | panels, table bodies |
| `--surface-2` | #0F2658 | hover, raised panels, table heads |
| `--line` | #1B3672 | hairlines on abyss, deep and surface |
| `--line-strong` | #2A4C96 | hairlines on surface-2, outlines |
| `--text` | #F2F6FF | primary text |
| `--text-2` | #A9BAE0 | secondary text, nations under names |
| `--text-3` | #7F93C4 | labels, metadata, empty states |
| `--water` | #0428B8 | the art's waterline: where the page begins under the header, and the page-change wipe |
| `--tour-sky` | #0066D1 | the art's upper sky |
| `--gold` | #FDE80A | the wordmark's yellow: current menu item, focus ring, counts, the season band's ticks and markers, the wipe's stripe, rank 1 |
| `--cyan` | #00B4F7 | text links in running copy |
| `--live` | #FF4674 | LIVE badge only |

**The water.** Under the header the page background runs `--water` at 0, #05209A at 260px, #071A6E at 640px, #061541 at 1100px and `--abyss` from 1700px down, so About sits in the shallows, Franchises deeper, History on the bottom. The header art fades into `--water` over its bottom 20%, and the season band covers the join. Faint light rays fall from the surface over the first 900px.

Measured contrast: text 10.5:1 on `--water` and above 13:1 on the dark steps; text-2 5.4:1 on `--water`, 9.3:1 on `--deep`; text-3 5.9:1 on `--deep`; gold 8.4:1 on `--water`, 4.6:1 on the art's sky; ink on gold 15.7:1.

**The tour gradient** lives in the wordmark, top to bottom `#FFE5F8 0%, #FFB5EC 20%, #FF76B8 40%, #FF4674 60%, #FDA734 80%, #FDE80A 100%`. On the site's own type it appears in one place only: the numeral on a tour page head.

### Franchise colours

Primary is the field colour from Kirin's own dispatch banners; secondary comes from the logo; ink is the text colour on the primary. "Dark" ink is `#030A1F`.

| Code | Name | Primary | Secondary | Ink | Status |
|---|---|---|---|---|---|
| CSS | Cannonballs | #FCCB55 | #212E52 | dark | S2 |
| SLD | Exiles | #640229 | #FDAA14 | white | S2 |
| TAL | Eagles | #3D5243 | #D2EAD2 | white | S2 |
| TPoP | Lightbringers | #D3A42C | #3A4239 | dark | S2 |
| WC | Jokers | #476A9A | #ABCDFE | white | former |
| ARN | Admirals | #BCB768 | #070B34 | dark | former |
| BAL | Ravens | #3B5288 | #F9A41A | white | former |
| LILY | Spartans | #FFFFFF | rainbow | dark | former |
| NBB | Watchdogs | #D0010A | #0071FB | white | former |
| SO | Mariners | #002D59 | #066768 | white | former |
| STL | Hyperion Guards | #294969 | #F3BA44 | white | former |
| TL&C | Minutemen | #35485B | #B82E2E | white | former |
| TNP | Rams | #01237C | #FFFFFF | white | former |
| TO | Bushrangers | #702D2D | #B59292 | white | former |
| TSP | Spits | #3FB1DE | #092458 | dark | former |
| TWP | Rumrunners | #291548 | #BD0000 | white | former |

- WC and STL have no dispatch banner, so both of their colours come from the logo.
- LILY's secondary is the logo's rainbow, used as a 4px band.
- Several primaries are nearly as dark as the page (TWP, SO, TNP and SLD are under 1.5:1 against `--abyss`), so every franchise field carries a 1px inner rim in its secondary.
- Status follows the folders and changes when a logo moves.

**Home regions** as shown on the site, set by Kirin on 2 October 2026. A former franchise's gets set when it rejoins.

| Code | Shown as | Links to |
|---|---|---|
| CSS | Commonwealth of Sovereign States | nationstates.net/region=commonwealth_of_sovereign_states |
| SLD | Solidarity | nationstates.net/region=nsleft |
| TAL | Talonia | nationstates.net/region=talonia |
| TPoP | Perdition | nationstates.net/region=the_plains_of_perdition |
| WC | Wild Card (inactive since 2 Oct 2026) | no link |

Region links open in a new tab and carry a small arrow.

### Type

Two families. **PP Neue Montreal** (Pangram Pangram) in Book 400, Medium 500 and Bold 700 for everything you read, self-hosted from `assets/fonts/`; until the files are there, pages fall back to Helvetica Neue. **Kode Mono** (Google Fonts, 400 to 700) for the futuristic text: every figure, every Mono label, the strips. It is loaded by name and never left to the system's monospace, which shows JetBrains Mono on some machines and reads as stock AI design.

| Role | Face | Desktop / phone | Tracking | Line height |
|---|---|---|---|---|
| Mega: section titles ("The field") | Bold, upper | 118px to 56px, fluid | −0.045em | 0.86 |
| Display: page titles | Bold, upper | 72 / 44px | −0.035em | 0.9 |
| Team name | Bold, upper | 34 / 26px | −0.03em | 0.9 |
| Title: player names | Bold | 17px | −0.01em | 1.2 |
| Body | Book | 17 / 16px | 0 | 1.5 |
| Label: menu, chips, plates | Medium, upper | 12 to 15px | 0.10 to 0.14em | 1.2 |
| Figures: counts, ranks, numbering, countdown, stats, table numbers | Kode Mono 500 to 600 | 12 to 44px | 0 | 1.0 |

Kode Mono is monospaced, so count-ups, the countdown and sorted columns never jitter. "Mono" anywhere in this file means Kode Mono.

### Space and layout

- 4px base. Steps: 4, 8, 12, 16, 24, 32, 48, 64, 96, 120.
- Content width 1240px at most, centred. Side gutter 32px from 640px up, 18px below.
- Breakpoints: 640, 1024, 1440. Phone and computer are designed equally; no page is a squeezed desktop.
- Sections are separated by space (120px on desktop, 88px on phones) and by depth, never by a decorative divider. A section head carries one hairline under it.
- The page never scrolls sideways. Wide tables scroll inside their own frame with the first column pinned.

### Shape

- **The broadcast cut:** cards and panels lose their top-left and bottom-right corners to a 14px diagonal (10px on phones), made with `clip-path`.
- **Slants:** chips, plates, buttons and lower-thirds are parallelograms with a 12px slant, text upright.
- Nothing is rounded. Radius is 0 everywhere; no pills.
- Lists never show the browser's own markers. Numbering is designed (01, 02) or absent.
- No drop shadows on interface parts. The wordmark carries a soft shadow because it sits on art.

### Images and icons

- **Header art:** `assets/header/background.avif`, 1920×620. Covers the hero, anchored to the bottom; phones anchor 30% across, keeping the left hill and the cyan bot. Fades into `--water` over its bottom 20%.
- **Header wordmark:** `assets/header/header.png`, 3000×300, the Rocket Bot Royale logo plus WORLD TOUR, surfacing over the art. Cut into three pieces for phones: the logo (x 4 to 615), WORLD (x 612 to 1843, with the rocket's tip cleared from its left edge), TOUR (x 2049 to 2962).
- **Bar wordmark:** `assets/header/wordmark.png`, 3000×450, "RBRWT S2" in the same blocky outlined letters: RBRWT in the tour gradient, S2 running purple #9356F3 to coral #E58275.
- **Logos:** 500×500 transparent PNGs named by code. Shown at 24px in table rows, 48px in lists, about 74% of a team card's width, up to 320px in banners. Alt text: "TO Bushrangers logo".
- **Pfps:** square, `assets/pfps/<in-game name>.png`. 32px in tables, 72px on roster cards, with the broadcast cut scaled to 6px. A missing pfp shows a Rocket Bot tank silhouette (inline SVG) in the franchise primary on its secondary.
- **Award icons:** the dispatch's in-game icons redrawn crisp as SVG, same drawings: rocket (MVP), three circles (TF), beach ball (RotM), gears (MI), plus the white controller (games played) and gold controller (games won). 16px in tables, 28px on cards, the award's full name on hover and in a legend.
- **Other icons:** inline SVG, 1.5px stroke, square caps. No emoji, no icon font.
- **Discord card:** one 1200×630 image built from the art and the wordmark, used by every page.

### Motion

| Token | Value |
|---|---|
| `--fast` | 120ms |
| `--base` | 240ms |
| `--slow` | 480ms |
| `--ease-out` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--ease-in-out` | cubic-bezier(0.65, 0, 0.35, 1) |
| `--ease-slam` | cubic-bezier(0.34, 1.56, 0.64, 1) |

- **Page change:** a skewed `--water` panel sweeps off left to right in 440ms, a thin `--gold` stripe behind it, uncovering the page. Uses View Transitions; browsers without them simply change page.
- **The header on load:** the wordmark surfaces, rising 46px out of the water on `--ease-slam` over 900ms from 420ms. The season band's gold top line draws in from the left from 650ms, and its three readouts rise in at 900, 990 and 1080ms.
- **The season band at rest:** a short gold scan line runs along its top edge every 6 seconds; while the date is TBA, a gold block cursor blinks after it.
- **The header at rest:** the art breathes (scale 1 to 1.035 and back over 22s) and drifts at 0.3 times the scroll speed. The light rays drift sideways over 26s.
- **Section entrance:** once per load, blocks rise 22px and fade in over 420ms, 70ms apart.
- **Count-up:** big figures run from 0 to their value over 600ms on `--ease-out` when they come into view.
- **Team card hover:** the card rises 4px, the logo grows 5% and tilts 2°, and a light sweep crosses the field in 700ms.
- **Franchise banner intro,** once per page load, about 1.3 seconds:
  1. 0 to 350ms: the primary colour wipes across diagonally, its secondary stripe 60ms behind.
  2. 300 to 750ms: the logo slams in, scale 1.35 to 1 on `--ease-slam`, fading up from nothing.
  3. 600 to 1050ms: code and name slide in from the right on a slanted bar.
  4. 900 to 1300ms: the lower-third (home region, founding tour) slides in from the left.
- **Reduced motion** (`prefers-reduced-motion`): the wipe, the surfacing, the breathing, the drift, entrances, sweeps, the band's scan line and cursor, and the banner intro all stop. Pages appear in their final state and count-ups show the number.
- No sound anywhere.

---

## 3. Components

**Menu bar.** Fixed. 76px tall over the header, 64px once the page scrolls. Over the art it is clear, with a soft dark fade from the top; once scrolled it turns solid `--abyss` at 94% with a hairline. Left: the RBRWT S2 bar wordmark, 30px tall over the art with a soft shadow, 26px once scrolled, 22px on phones. Right: the menu in Label; the current page gets a 2px `--gold` bar. Phones and tablets get a slanted "Menu" button that opens a full-screen sheet on `--abyss`, items in Bold 40px.

**Season band.** A slim full-width strip laid across the seam between the header and the water: 60px tall (48px on phones), its top half over the header's bottom edge and its lower half on the water, so the join never shows. `--abyss` at 92%, a gold hairline along the top with the scan line running on it, a hairline below, and small gold corner brackets at the top left and bottom right of the content width. Three readouts sit on one line, each a Mono label after a small gold square followed by its value in Bold 20px: "World Tour SEASON 2" and "Next tour RBRWT XI" on the left, "Starts DATE TBA" pushed to the right edge, divided by slanted hairlines. Once XI has a date the last readout becomes "Starts in" and counts down in Mono: 12D 04H 33M 10S, unit letters small in `--text-3`. On phones the labels drop and the three values stay on one line at 15px.

**Section head.** The Mega title on its own, no kicker or number above it; on the right, where there is one, the count in `--gold` Mono with a Label under it ("05 / Season 2", "10 / Season 1 tours"). One hairline under the whole head.

**About.** The lead is the dispatch's Overview sentence in Medium 31px (22px on phones), with "the playable area is slowly flooding" in gold. Below it, the stats strip, built like the season band: the gold top line with its scan line, gold corner brackets, three readouts in a row divided by slanted hairlines, each a Mono label after a small gold square followed by its figure in white Mono 36px: Tours played 10, Matches played 209, Franchises to date 16. Below 1024px each label sits above its figure; on phones the readouts stack as rows, label left and figure right. Below, "Format" as five numbered steps on `--deep` with a 2px gold top edge (01 Conferences, 02 Qualifying, 03 Wild card, 04 Finals, 05 Seeding), each carrying the dispatch's sentence; five across, two on tablets, one on phones. Then "Joining the Tour" as one panel: the dispatch's opening sentence, then three steps in a row, each pointing at the next with a gold chevron on the divider: 01 Roster (3 starters + up to 3 subs), 02 Apply by DM (Garbelia, @garbelia_52399), 03 Logo + wordmark (Kirin, @auroruse). Each step is a Mono label over its value in Bold 24px, Discord handles in gold Mono. No descriptions under the contacts. Below 760px the steps stack and the chevrons point down.

**Team card** (Home's field). A 16:10 field in the primary with two diagonal stripes in the secondary and the 1px rim; the code in a chip at its top left (ink background, primary text); the logo at 60% of the card's width, bleeding off the right edge. Below, on `--deep`: the home region in Label (linked where it has a region), then the name in Team name type, then the roster as a depth chart, numbered in Mono with in-game names in Title: the three starters first, then the subs under a dashed rule, in Medium `--text-2` with a small outlined "Sub" tag. Every line is one line. Cards fill the row at 300px or wider: three across at full width, one on phones. With exactly four franchises the field is two by two instead, so no card is left alone on a row, and from 1180px each card turns sideways: the field on the left (44%, at least 260px tall, logo at 88% of it), region, name and roster on the right.

**Logo tile** (Franchises). Square, primary field with the diagonal stripes and rim, logo at 70% of the tile, code chip and name below. Five across on desktop, three on tablets, two on phones.

**Franchise banner.** Full width; 3:1 on desktop with the logo left of centre and code and name to its right, 4:3 on phones with the logo above the name. Plays the intro.

**Roster card.** Pfp at 72px, in-game name in Title, award icons with counts (×2), a "SUB" chip where it applies, and a 3px bar down the left edge in the franchise primary.

**Tables.** Head row in Label on `--surface-2`; rows 44px tall on `--surface`, hairlines between; figures right-aligned in Mono; rank 1 in `--gold`. Columns get fixed widths through `colgroup`, never auto layout. Sortable heads show an arrow and keep their width when sorted.

**Rafters** ("Champions"). A 3px rail with ten banners hanging from it on short cords, I to X, oldest on the left. Each banner: the champion's primary, a 3px trim in its secondary near the top and a chevron trim running parallel to the V cut, the logo, the tour numeral in Bold 32px, then the month and year in Mono under a short secondary rule. Nothing crosses the text. A banner swings 3° on hover. Below 1024px the rail scrolls sideways and snaps banner by banner.

**Tours table.** One row per S1 tour, oldest first, with the champion's primary as a 4px bar down its left edge. Columns: Tour, Date (Mono), Champion (28px logo and name), MVP, TF, RotM, MI by in-game name, and Replay, right-aligned. No venue column. Fixed widths of 80, 116, 180, 110, 140, 128, 144 and 112px, with any spare width shared out, sized so the longest entry in every column fits on one line. Every prize that wasn't awarded reads "Not awarded" in its own cell. A tour with one replay gets a slanted "Watch" chip; one with several gets "Watch" with a small caret, opening a menu of the parts (Koala, Kangaroo, Wild Card, Conferences, Finals) with their source, upward on the last three rows; none reads "No replay". No counts on the chips. X's TF carries "Conf. only". Between 760px and the table's 1010px it scrolls inside its frame; below 760px each row becomes a card.

**Records.** Four tiles on `--deep`, each a gold Mono figure, a Mono label and the holder in Bold: 7 Titles (TO Bushrangers), 4 MVP awards (Miravana), 39 Kills in one tour (Wizard, RBRWT V), 7 Kills in one game (Wizard in V, Kirin in VI). Labels use "in", never a comma. Under the tiles, a full-width slanted gold "All stats" button with an arrow leads to the Stats page; the tiles stretch so the button's bottom lines up with the bottom of the kill leaders table.

**Kill leaders.** The S1 top ten beside the records. Columns: rank (rank 1 in gold, ties share a rank), Team (their last S1 franchise as a coloured code chip, every chip the same 46px width, in its own column so all player names start on one line), Player, then kills, games and kills per game in Mono, right-aligned. Games drop on phones.

**Tour page head.** The tour numeral in Display with the tour gradient, then a lower-third: date, host venue, host franchise.

**Format bracket.** An SVG diagram: conferences to first-to-three, wild card or play-ins, the final four to first-to-five. Drawn in hairlines, with the qualifying path in `--gold`.

**Buttons and links.** Primary button: a slanted `--gold` plate with ink Label. Secondary: the same shape as a 1px `--line-strong` outline. Text links in running copy: `--cyan`, underlined on hover. Replay links are secondary buttons that open YouTube or Drive in a new tab.

**Tabs** (S2 and S1 on a franchise page). Labels on a hairline; the current tab gets the 2px `--gold` bar.

**Empty state.** Two or three words in Label, `--text-3`, centred in the space the content would fill.

**Footer.** On `--abyss` with a hairline above: the Rocket Bot Royale logo beside the three footer lines in 13px `--text-3`.

---

## 4. Accessibility

- Text contrast at least 4.5:1 on its real background (measured above).
- Focus: a 2px `--gold` ring with a 3px offset on everything interactive; tab order follows the page.
- Colour is never the only signal: a franchise always shows its code or logo, rank 1 shows the number, LIVE says LIVE.
- Logos and pfps carry alt text; the header art and decorative layers are hidden from screen readers.
- Reduced motion as above. Pages declare `lang="en"`.

## 5. Not this

No light theme. No cream, beige or off-white. No gradients beyond the tour gradient and the water; hard-edged patterns like the band's ticks and the cards' stripes are fine. No hard edge under the header art. No frosted-glass cards, no pills, no drop shadows on interface parts. No emoji. No bare text where a mark belongs. No filler: the S1 records ticker was cut because nobody reads it. No hero made of a headline and two buttons. No "Welcome to", no intro paragraphs, no lorem ipsum.

## 6. Build

Live at **auroruse.github.io/rbrwt**, from the public repository **github.com/auroruse/rbrwt**. Static Astro site, published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`, under `/rbrwt`. Fonts: Kode Mono from Google Fonts; Neue Montreal from `assets/fonts/` once the files are there.

Everything on the page comes from files, read at build time:
- `src/data/franchises.yaml`: every franchise's code, name, colours and home region. Whether one is in Season 2 is decided by its logo's folder, `assets/franchises/` or `assets/former franchises/`.
- `src/data/rosters.tsv`: S2 rosters as a depth chart, Role "Starter" or "Sub".
- `src/data/tours.yaml`: each tour's date, venue, host, champion, matches, awards, notes, replays and kill sheet.
- `src/data/season.yaml`: the season number and the next tour; a date starts the countdown.
- `src/data/aliases.yaml`: different spellings of one player across the sheets.
- `assets/sheets/*.tsv`: the kill sheets. Kill leaders and records are computed from them, never typed in.

Images: logos and the wordmarks are resized to WebP at build. `assets/header/background.avif` is served as it is, because the build's image tool cannot decode it. The phone wordmark pieces live in `src/assets/pieces/`; the link card and favicon in `public/`.
