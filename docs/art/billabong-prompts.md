# Billabong artwork: prompts for gpt-image-2.5

Grant Navigator's artwork for the Billabong look (posthog.com's style, with original art). There are 13 images: one character reference, a hero diorama in two lighting versions, four platypus poses, three props and three small "How it works" spots.

Everything here must be original. Do not reference PostHog, its hedgehogs, its logo or its artwork in any prompt, and do not upload PostHog images as references.

## How to use this file

1. **Make the character reference first (image 1).** Generate until the platypus looks right, then upload that image as a reference with every later platypus prompt (2, 3, 4, 5, 6, 7). This keeps it the same character every time.
2. **Paste the style block** (below) at the start of every prompt, then the image's own prompt.
3. **Settings:** the size and background given for each image. Where it says *transparent*, set the background option to transparent (not white), and PNG output.
4. **Save** with the file name given and drop the files in `art/originals/` at the repo root (not `public/`: the full-size originals should not be deployed), or send them to me. I'll resize, convert to AVIF/WebP and wire them in.
5. **Reject and regenerate** any image with text that isn't asked for, a logo, extra limbs, a hedgehog-like look, or a busy background on a transparent asset.

## Style block (paste before every prompt)

> Soft 3D clay-render illustration, like a handmade claymation diorama photographed in a studio. Matte, slightly toy-like materials with gentle surface texture, rounded edges and chunky simplified shapes. Soft global illumination with one warm key light from the upper left and soft contact shadows directly under objects. Calm, natural Australian bush palette: eucalyptus and sage greens, warm sand, ochre and terracotta earth, river-water teal and soft sky blue, with small amber-yellow accents (#F2A93B). Friendly, charming, slightly whimsical, but uncluttered and readable at small sizes. No text, no letters, no numbers, no logos, no watermarks, no signatures, unless the prompt asks for specific text.

## The platypus (keep identical across images)

> A friendly platypus mascot: rounded, chubby body with short legs; warm chocolate-brown fur with a lighter tan belly; a soft slate-grey duck bill; small dark shiny eyes with a hint of a smile; small webbed front feet that can hold things like little hands; a broad flat beaver-like tail. He wears round tortoiseshell reading glasses and a small amber-yellow neckerchief tied at the neck. Proportions are cute and chunky (head about a third of the body height), never realistic, never spiky, never hedgehog-like.

---

## 1. Character reference sheet (for consistency; not shipped)

- **File:** `platypus-reference.png`
- **Size:** 1536×1024 (landscape)
- **Background:** plain light warm grey

> [Style block] [Platypus description] Character reference sheet of this platypus on a plain light warm-grey background: three full-body views side by side, front view, three-quarter view and side view, standing upright in a neutral friendly pose, same scale and lighting in each. Evenly spaced, nothing else in the image.

## 2. Hero diorama, day (light theme)

- **File:** `hero-diorama-day.png`
- **Size:** 1536×1024 (landscape)
- **Background:** transparent
- **Where:** home page hero, right of the headline (below it on phones)

> [Style block] [Platypus description] A small floating clay diorama, an island-shaped slice of Australian bush shown at a three-quarter angle from slightly above, isolated on a transparent background with clean edges and a soft contact shadow under the base. On the island: a calm billabong (a small curved waterhole) with teal water, reeds and smooth river stones; a river red gum tree with pale patchy bark and a broad canopy leaning over the water; a few tufts of spinifex grass and small wattle bushes with yellow blossom. On the bank, the platypus sits at a small vintage wooden writing desk, reading glasses on, happily sorting a neat stack of paper forms into three little wooden trays. Beside the desk: a small olive-green metal filing cabinet with one drawer open showing folders, and a brass compass lying on the desk. Bright late-morning daylight, warm and optimistic. The composition leaves a little empty space around the island so it can sit beside text.

## 3. Hero diorama, dusk (dark theme)

- **File:** `hero-diorama-dusk.png`
- **Size:** 1536×1024 (landscape)
- **Background:** transparent
- **Where:** home page hero in dark mode
- **Tip:** upload image 2 as a reference so the scene matches exactly.

> [Style block] [Platypus description] The same floating clay diorama as the reference image, identical layout and objects, now at dusk: deep blue-violet twilight light, a warm amber glow from a small brass desk lamp on the platypus's desk lighting his face and papers, the water reflecting the lamp, a few fireflies over the reeds. The palette shifts to deep teal, indigo and warm amber, with enough light that every object is still clearly readable. Transparent background with clean edges.

## 4. Platypus waving (welcome)

- **File:** `platypus-wave.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** assessment start, persona cards, onboarding hints

> [Style block] [Platypus description] The platypus standing on a small round tuft of grass, waving hello with one front foot raised, the other foot holding a clipboard against his belly, a cheerful welcoming expression, tail curled slightly to the side. Full body, centred, isolated on a transparent background with a soft contact shadow under the grass tuft.

## 5. Platypus reading a long form (eligibility)

- **File:** `platypus-reading.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** program detail page, results "Not a fit" explanations, report builder

> [Style block] [Platypus description] The platypus sitting cross-legged, reading a very long paper form that unrolls from his front feet down onto the ground in loose folds, glasses pushed up, one eyebrow raised in focused, good-humoured concentration, a small pencil tucked behind his head. Only faint grey lines on the paper, no readable text. Full body, centred, isolated on a transparent background with a soft contact shadow.

## 6. Platypus celebrating (milestones)

- **File:** `platypus-celebrate.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** results finish line, application awarded, goal done toasts

> [Style block] [Platypus description] The platypus jumping for joy with both front feet raised, holding a big wooden rubber stamp in one foot, small clay confetti pieces in amber, sage green and sky blue frozen mid-air around him, a delighted open-bill smile, tail flicked up. Full body, centred, isolated on a transparent background with a soft contact shadow under where he will land.

## 7. Platypus searching (empty states and 404)

- **File:** `platypus-search.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** "no programs match" empty state, empty plan, 404 page

> [Style block] [Platypus description] The platypus peering through a large brass magnifying glass held in both front feet, leaning forward curiously, the glass making one eye look comically big, a folded paper map sticking out from under his arm. Full body, centred, isolated on a transparent background with a soft contact shadow.

## 8. Prop: filing cabinet

- **File:** `prop-filing-cabinet.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** My Plan empty state, pipeline header

> [Style block] A chunky vintage olive-green metal filing cabinet with three drawers and brass handles, the top drawer pulled open showing colourful paper folders in amber, sage and sky blue with blank tabs, one folder sticking up slightly. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 9. Prop: compass

- **File:** `prop-compass.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** results summary, "Choose persona" and navigation moments

> [Style block] A chunky brass pocket compass with its hinged lid open, a cream dial with simple tick marks only (no letters), a red-and-teal needle pointing up and slightly right, resting on a small flat river stone. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 10. Prop: "APPROVED" stamp

- **File:** `prop-stamp.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** report page, awarded applications

> [Style block] A chunky wooden-handled rubber stamp standing upright next to a small round amber-yellow ink pad, and in front of them a sheet of cream paper with one clean stamp impression in teal ink that reads exactly "APPROVED" in bold rounded capital letters inside a rounded rectangle. The word must be spelled correctly and be the only text in the image. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 11. How it works, step 1: answer six questions

- **File:** `step-answer.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page "How it works", step 1

> [Style block] A small clay clipboard with a cream sheet showing six short rows, each with a round checkbox; the first four boxes are ticked in eucalyptus green, a chunky amber pencil lies diagonally across the bottom of the board. No readable text, only simple grey lines for the rows. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 12. How it works, step 2: see what fits

- **File:** `step-sort.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page "How it works", step 2

> [Style block] Three small clay trays in a row, like an in-tray set: the left tray holds a neat stack of sage-green cards, the middle tray amber cards, the right tray a few pale grey cards, with one amber card mid-air dropping into the middle tray. No text. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

## 13. How it works, step 3: plan the applications

- **File:** `step-plan.png`
- **Size:** 1024×1024
- **Background:** transparent
- **Where:** home page "How it works", step 3

> [Style block] A small clay wall calendar page with a simple grid of squares (no numbers or letters), three squares circled in amber, one with a little green flag pin stuck in it, and a small brass alarm clock sitting in front of it. Three-quarter view from slightly above, isolated on a transparent background with a soft contact shadow.

---

## Checklist before sending

- [ ] Same platypus in images 2 to 7: same colours, glasses, amber neckerchief and chunky shape.
- [ ] Transparent images have clean edges, with no white halo and no leftover background.
- [ ] No stray text anywhere; image 10 reads exactly "APPROVED".
- [ ] Nothing resembles PostHog's hedgehogs, logo or products.
- [ ] Dusk diorama (3) matches the day diorama (2) in layout.
