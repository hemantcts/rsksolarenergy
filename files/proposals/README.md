# Proposals waiting on a yes

A **small** tweak goes straight to `main`: a title rewritten because the weekly report shows it is
shown and never clicked, a description tightened, an internal link added, a figure corrected to match
the config. Those are reversible in one commit and need nobody's morning.

A **major** tweak waits. A new page, a page removed, a price or subsidy figure changed, a change to
the phone numbers or the NAP, anything that alters what the business promises, anything that changes
how a calculator works out a size or a price, or a change to how deploys run. Those go on a branch and
are emailed to RSK Solar Energy, who replies yes or no in the email. Nothing waits in GitHub for
someone to find it.

## How one is made

1. The change goes on a branch named `tweak/<slug>`, all of it, ready to merge. Opening a pull request
   for it is optional but useful: the pull request runs the same checks as a deploy.
2. A file `files/proposals/<slug>.md` goes on that same branch, in the format below.
3. Actions, **Propose a tweak**, Run workflow, with the branch name. That sends the email.

## The format

```markdown
---
token: 7f3a91c4
subject: Change the 5 kW price range to match the new UTL list
---

## What changes

One paragraph, plain words, no jargon. What a visitor would see differently.

## Why

What prompted it. A figure from the weekly report, a supplier price list, a customer question.

## What happens if it is wrong

How it gets undone, and how long that takes.
```

`token` is eight hex characters, made fresh for each proposal, and it goes in the email subject. A
reply carries the subject back, which is what tells the apply workflow that the answer came from
somebody who was actually sent the email. Never reuse a token, and never put one in a commit message
or a public comment.

## Replying

Reply **yes**, **approve** or **go ahead** and the branch is merged into `main`, which deploys it.
Reply **no** and the branch is deleted. Either way a short confirmation comes back.

A reply that says something else is treated as a no, and the reason is quoted back, because a
half-understood instruction is not an approval.

## The bridge

n8n reads the mailbox, checks the sender and the token, and calls GitHub. Setting it up is in
`files/DEPLOY.md` under "Approving a major tweak from email".
