# Proposals waiting on a yes

A **small** tweak goes straight to `main`: a title rewritten because the weekly report shows it is
shown and never clicked, a description tightened, an internal link added, a figure corrected to match
the config. Those are reversible in one commit and need nobody's morning.

A **major** tweak waits. A new page, a page removed, a price or subsidy figure changed, a change to
the phone numbers or the NAP, anything that alters what the business promises, anything that changes
how a calculator works out a size or a price, or a change to how deploys run. Those go on a branch and
are emailed to RSK Solar Energy, who approves or rejects them with one press. Nothing sits in GitHub
waiting for somebody to find it.

## How one is made

1. The change goes on a branch named `tweak/<slug>`, all of it, ready to merge.
2. A file `files/proposals/<slug>.md` goes on that same branch, in the format below.
3. Actions, **Propose a tweak**, Run workflow, with the branch name.

## The format

```markdown
---
subject: Change the 5 kW price range to match the new UTL list
---

## What changes

One paragraph, plain words, no jargon. What a visitor would see differently.

## Why

What prompted it. A figure from the weekly report, a supplier price list, a customer question.

## What happens if it is wrong

How it gets undone, and how long that takes.
```

## Saying yes or no

Two emails arrive: the proposal itself, and GitHub's own review request. Either one leads to the same
place. Open the run, press **Review deployments**, then Approve or Reject.

Approving merges the branch into `main`, which deploys it, and deletes the branch. Rejecting changes
nothing and leaves the branch where it is, so it can be picked up later. A short confirmation comes
back either way.

The approval is GitHub's, recorded against the approving account, which is why nothing here checks who
said yes. An earlier version of this worked by replying to the email, which needed a code in the
subject line to prove the reply was genuine, and a service reading the mailbox to pass it on. Pressing
a button removes both.
