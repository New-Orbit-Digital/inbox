# Prep — packet 004 U-B: deterministic grocery split + aisle rule

**Ruled 2026-09-01 by Justin.** Supersedes the 2026-08-29 ruling that grocery keeps the model.
The grocery split and aisle assignment become deterministic rules in the client. **After packet 004
there is no model call in this app except Primer.**

**Placement ruled:** client-side (`web/`), folded into packet 004 U-B. Not a standalone packet —
004 is already the packet that rewrites grocery capture, and `web/inbox.html` is serialized behind
packet 003 by the concurrency matrix.

**Consequence for U-C:** `classify` loses its grocery path entirely, not just webhook mode. After
004 the function has no remaining job; whether it is deleted or left as an empty ping is a 004
decision.

---

## Why this is viable (verified 2026-09-01)

- **The vocabulary is small.** 95 distinct grocery items across all captured history.
- **The correction loop already exists and already works.** `savePref` in `web/inbox.html` (~line 517)
  upserts `{owner, item: normalize(body), category, updated_at}` into `grocery_prefs` whenever the
  aisle dropdown changes. `grocery_prefs` has grown 4 → 14 rows since Prep-1 without any packet work.
- **The client already has the aisle list.** `GROCERY_ORDER` in `web/config.js`, the same 22 values as
  `GROCERY_CATEGORIES` in the edge function.
- **The model is not currently consistent.** History contains `oat milk` filed as both Beverages and
  Dairy, and `muffins` under Cooking & Baking rather than Bakery. A table is at minimum consistent,
  and one correction makes any disagreement permanent.

## Resolution order (pinned)

1. **Exact `grocery_prefs` match** on the normalized item text — always wins.
2. **Longest keyword match** against the seed table below. Longest match wins, so `chicken stock`
   beats `chicken`, `coconut milk` beats `milk`, `peanut butter` beats `butter`, `cheese balls` beats
   `cheese`, `crushed tomatoes` beats `tomato`, `bell pepper` and `black pepper` both beat `pepper`.
3. **`"Other"`** on no match.

## Split rules (pinned)

- Split on commas, ` and `, ` & `, semicolons, and newlines.
- Trim each fragment; drop empties.
- Strip leading filler: `add`, `buy`, `get`, `grab`, `pick up`, `we need`, `i need`, `some`, `a`, `an`,
  and a trailing `to the list` / `to the grocery list`.
- Preserve the remaining wording as the item text — do not singularize or title-case.
- A capture that yields one fragment inserts one row. This is the normal case and must not regress.

## Seed keyword table

Derived from Justin's own 95-item history plus close variants. Keys are lowercase substrings matched
against the normalized item text. **Not exhaustive by design** — a miss lands in "Other" and one
correction teaches it permanently via `grocery_prefs`.

| Category | Keywords |
|---|---|
| Produce | apple, asparagus, avocado, banana, basil, thai basil, bell pepper, green bell pepper, berries, blueberr, broccoli, cabbage, green cabbage, carrot, celery, cherries, cherry tomato, roma tomato, cilantro, cucumber, garlic, grapes, greens, kale, lemon, lettuce, lime, mushroom, shiitake mushroom, nectarine, onion, orange, parsley, peach, pear, plum, potato, salad, scallion, spinach, strawberr, tomato, zucchini |
| Deli | deli, lunch meat, laughing cow, prosciutto, salami, ham, turkey slices |
| Bakery | bread, seedless bread, baguette, bagel, muffin, croissant, roll, bun, tortilla, pita, cake, donut |
| Seafood | salmon, shrimp, tuna, cod, tilapia, fish, scallop, crab |
| Meat | chicken, chicken breast, chicken wings, beef, pork, steak, bacon, sausage, ground turkey, ribs |
| Pickles | pickle, olives, kimchi, sauerkraut |
| Dairy | milk, oat milk, butter, cheese, cheddar, sharp cheddar, parmesan, feta, mozzarella, yogurt, kefir, egg, cream, half and half, sour cream, cottage cheese, string cheese, creamer, coffee creamer |
| Frozen Foods | frozen, ice cream, vegan ice cream, uncrustables, indian triangles, brazilian cheese balls, frozen pizza, waffles |
| Pet Supplies | dog food, cat food, wet cat food, dry cat food, cat litter, dog treats |
| Cooking & Baking | flour, tapioca flour, sugar, brown sugar, olive oil, oil, baking powder, baking soda, vanilla, cornstarch, yeast, chocolate chips |
| Spices | salt, black pepper, cumin, paprika, cinnamon, oregano, turmeric, chili powder, spice |
| Breakfast & Cereal | cereal, oatmeal, oats, granola, pancake mix, syrup |
| Grains, Pasta & Sides | pasta, rice, quinoa, couscous, noodles, spaghetti, macaroni |
| Soups & Canned Goods | soup, canned, canned pineapple, broth, stock, chicken stock, crushed tomatoes, coconut milk, butter beans, black beans, chickpeas, tomato paste |
| Condiments & Dressings | ketchup, mustard, mayonnaise, mayo, soy sauce, hoisin, sauce, hot sauce, sriracha, dressing, vinegar, rice vinegar, curry paste, thai green curry paste, thai red curry paste, salsa, jam, jelly, peanut butter, honey |
| Wine, Beer & Spirits | wine, beer, vodka, whiskey, tequila, gin, rum |
| Snacks | chips, crackers, cookies, pretzels, dots pretzels, popcorn, nuts, almonds, sunflower seeds, jerky, beef jerky, candy, dark chocolate, chocolate granola, granola bar, biscotti, cheese balls, trail mix |
| Beverages | juice, soda, coffee, tea, tea bags, coconut water, water, sparkling water, lemonade, kombucha |
| Baby | baby, diapers, baby wipes, formula, baby food |
| Health & Personal Care | shampoo, toothpaste, deodorant, vitamins, medicine, meds, ibuprofen, tylenol, band aid, lotion, razor |
| Household & Cleaning | paper towels, toilet paper, trash bags, soap, dish soap, detergent, dishwasher detergent, laundry detergent, sponge, foil, aluminium foil, aluminum foil, ziploc, plastic wrap, cleaner, bleach |

**Two judgment calls recorded rather than hidden**, both cheap to overturn with one correction:
`oat milk` → Dairy (history has it both ways), and `meds` → Health & Personal Care (the model had
filed it "Other"). `soap` → Household & Cleaning follows Justin's existing history.

## Acceptance for U-B

- `apples, bread and milk` → three rows: Produce, Bakery, Dairy.
- `grocery store - toilet paper, salad, tomatoes, cucumbers` → the leading fragment is not an item;
  decide in 004 whether a leading non-item fragment is dropped or kept. Flagged, not ruled.
- A single-item capture (`mustard`) still produces exactly one row, Condiments & Dressings.
- An unknown item (`dragon fruit`) produces one row in "Other", and changing its aisle writes a
  `grocery_prefs` row so the next capture is correct.
- No network call to `api.anthropic.com` anywhere in the grocery path; zero API credit consumption.

## Ruled 2026-09-02 — the three open questions are closed

Packet 004 is now written in full: [build_packet_004_capture.md](build_packet_004_capture.md).

- **The leading fragment:** ` - ` (spaces required) is a split separator like any other, and a
  resulting fragment that is exactly a generic shopping word is dropped — `grocery store`,
  `grocery`, `groceries`, `store`, `the store`, `list`, `grocery list`, `shopping list`. Generic
  terms only; **no store brand names**, so a brand can still be captured as an item.
  `grocery store - toilet paper, salad, tomatoes, cucumbers` → four rows, no fifth.
- **`classify` becomes a ping-only stub, not a deleted directory.** Removing
  `supabase/functions/classify/` from the repo undeploys nothing — `deploy-supabase` deploys what
  is in its checkout, so the live v12 would keep running and keep answering the webhook. An inert
  stub returning `410` is what actually kills the endpoint. Deleting the deployed function is a
  Justin surface afterwards.
- **The seed table lives in `web/config.js`,** as recommended, beside `GROCERY_ORDER`.

One thing this document did not anticipate, added by the packet: **every row packet 004 writes —
grocery and to-do alike — inserts with `confidence: 1`**, because the still-live
`classify-on-insert` trigger skips any row whose `confidence` is non-null. That keeps the model
away from these rows for the whole window between the merge and **Prep-3**, the separate prep
session that drops the trigger. On the to-do path it matters even more than on grocery: without it
the webhook's `defaultTodo` rewrites the tag to `personal` and stamps a retired `due_date`.
