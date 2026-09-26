# Google Business Profile

The profile and this website have to say the same things. Google compares them, and where they
disagree the profile usually wins, because it is the thing people interact with. The NAP rule in
`CLAUDE.md` §6 exists for that reason.

This file holds the text to paste into the profile, so both stay in step. Change it here when the
site changes, then paste it across.

## There is no owner field

Google Business Profile has no public field for who owns a business. The account that manages the
listing is never shown. So naming Rajdeep Singh Kang on the profile means putting it in text that
*is* public, in these three places.

## 1. Business description

Google's own rules: no links, no prices, no offers, no keyword stuffing. 750 characters, and this is
727. Edit it in the profile under **Edit profile → About → Business description**.

```
RSK Solar Energy is a UTL Solar distributor and rooftop solar installer in Phase 8B, Mohali, owned by Rajdeep Singh Kang and trading since 2022. We supply UTL solar panels, inverters and PCUs, batteries, charge controllers and complete solar kits, and we design and install on-grid, hybrid and off-grid systems for homes, shops, factories and housing societies. We also install solar water pumps for farmers. Our own team works across Mohali, Kharar, Zirakpur, Derabassi, Landran, Banur, Lalru, New Chandigarh, Naya Gaon, Kurali, Morinda, Ropar and Fatehgarh Sahib, as well as Chandigarh and Panchkula, and we supply UTL products to dealers across Punjab. We file PM Surya Ghar subsidy applications for eligible rooftop systems.
```

Every fact in it is already on the website: the towns are `BUSINESS.serviceArea`, the founding year
is `BUSINESS.foundedYear`, the product list is the catalogue.

## 2. Questions and answers

Google allows a business to post a question on its own profile and answer it. It is not a trick; it
is how the Q&A section is meant to be seated with the questions people actually ask. Post these from
the profile, then answer them from the business account so the answer is badged as the owner's.

**Q: Who owns RSK Solar Energy?**

> RSK Solar Energy is owned by Rajdeep Singh Kang. It is a proprietorship, trading since 2022 from
> E 203, Phase 8B, Industrial Area, Sector 74, Mohali.

**Q: Is RSK Solar Energy an authorised UTL Solar dealer?**

> We are a UTL Solar distributor and we stock UTL products. We are an independent business, not a
> UTL-owned outlet.

**Q: Which areas does RSK Solar Energy install in?**

> Our own team installs across Mohali, Kharar, Zirakpur, Derabassi, Landran, Banur, Lalru, New
> Chandigarh, Naya Gaon, Kurali, Morinda, Ropar and Fatehgarh Sahib, and in Chandigarh and
> Panchkula. Elsewhere in Punjab we supply through UTL dealers.

**Q: Does RSK Solar Energy handle the PM Surya Ghar subsidy?**

> Yes, we file the application for eligible rooftop systems. The subsidy is paid into the
> applicant's own bank account after the DISCOM inspection. It never comes off the invoice and it
> never goes to an installer or a lender.

The last answer matters beyond the profile: it is the single thing customers most often have wrong,
and it is the same wording the site uses.

## 3. Posts

A post mentioning the owner by name occasionally is legitimate and reads naturally: a finished
install, a new product line, a seasonal note about cleaning in the smoke season. Posts expire from
prominence after about a week, so they are worth doing regularly rather than once.

## Keep these identical to the site

| | Source of truth |
|---|---|
| Name | `BUSINESS.name` — "RSK Solar Energy", never shortened |
| Address | `BUSINESS.address`, written exactly as the profile shows it |
| Phone | `BUSINESS.phones`, primary first |
| Hours | `BUSINESS.hours` |
| Website | `https://rsksolarenergy.com/?utm_source=gbp` — the tag lets the Monday report count taps that came from the profile, under "Google Business Profile". The page is the same homepage. |
| Description | the block above |

If the profile is edited directly, change it here too, or the next person to compare them will not
know which is right.
