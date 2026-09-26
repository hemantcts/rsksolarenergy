---
subject: Give each menu section its own page, so the site has a top level
---

## What changes

Each of the six menu sections gets its own page listed first when the menu opens, above the pages
inside it. Opening **Products** now starts with "All UTL products", opening **Areas we serve** starts
with "Everywhere we work in Punjab", and so on. Three of those links already existed at the bottom of
their menus and have moved to the top rather than being added twice.

Nothing is removed and no page changes. It is one extra line at the top of each menu, on desktop and
on mobile.

## Why

The menu headings are not links, they are buttons that open a panel. That is correct for how a menu
behaves, but it means a search engine reading the site sees about forty-five menu links of equal
standing and nothing telling it that the battery catalogue sits underneath the product catalogue, or
that a town page sits underneath the Punjab page. The site has no top level.

Google's own guidance for showing a block of links beneath a search result, the kind that appears for
established brands, asks for exactly this: a clear site structure with compact, non-repetitive link
text. This supplies it.

**It is worth being straight about how much this does on its own.** Those blocks are chosen
automatically and there is no markup that requests them. What decides it is mostly how many people
search for the business by name, what they click, and how many other sites link here. As of this week
rsksolarenergy.com is not in Open PageRank's link graph at all, because almost nothing links to it,
and that is the real constraint. This change removes a structural reason to be passed over. It does
not create demand.

The site is also easier to move around with it, which is worth the line on its own.

## What happens if it is wrong

Reverted in one commit, and the menu returns to exactly what it is now. Nothing about pricing,
figures, contact details or the calculators is touched, and no page is added or removed.
