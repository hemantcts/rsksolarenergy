# Deploying

The site deploys itself. Push to `main`, and GitHub Actions builds it, runs every check and
uploads it to the host over SSH. A failing check stops the deploy, so whatever is live has passed
the tests, the SEO guard, the writing check and the page weight budget.

Workflows:

- `.github/workflows/deploy.yml` — push to `main`, or run by hand from the Actions tab.
- `.github/workflows/checks.yml` — every pull request, including drafts from the content pipeline.

## One-time setup

### 1. A key for the deploy

On your machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/rsk_deploy
```

Add the **public** key (`~/.ssh/rsk_deploy.pub`) to the host:

**Hostinger (this site's host):** hPanel, Advanced, SSH Access. Turn SSH on, add the public key,
and note the host, username and port shown there (Hostinger uses port 65002).

Test it before trusting the workflow:

```bash
ssh -i ~/.ssh/rsk_deploy -p <port> <user>@<host> "ls"
```

### 2. GitHub secrets

Repository, Settings, Secrets and variables, Actions, **Secrets** tab:

| Secret | What it is |
|---|---|
| `SSH_HOST` | the host's SSH server |
| `SSH_USER` | the SSH user |
| `SSH_KEY` | the **private** key file, all of it, including the BEGIN and END lines |
| `DEPLOY_PATH` | the web root. On Hostinger: `/home/<user>/domains/rsksolarenergy.com/public_html` |

**Variables** tab (optional):

| Variable | What it does |
|---|---|
| `SSH_PORT` | defaults to 22. **Hostinger uses 65002**, so set this. |
| `DEPLOY_DELETE` | set to `true` to remove host files that are no longer in the build. Leave it unset until you have checked what else lives in the web root. |

### 3. Test the connection first

Actions tab, "Build and deploy", **Run workflow**, tick **Dry run**. It connects over SSH, prints
what is in the web root, and lists the files it *would* upload. Nothing is written.

### 4. First real run

Actions tab, "Build and deploy", Run workflow. It uploads only changed files, then checks that the
live homepage, the calculator, the blog and the search index all return 200, and tells the
IndexNow search engines what changed.

## If a deploy fails

- **The checks failed.** The log names the rule. Fix it and push again; nothing reached the host.
- **SSH refused.** Check the port variable, and that the public key is on the host.
- **The live check failed.** The upload worked but the site did not answer. Check the host is up
  and that `DEPLOY_PATH` points at the web root, not its parent.

`.htaccess` is part of the build, so it uploads with everything else.

## What the deploy never touches

The web root also holds the applications on subdomains. These are in the workflow's KEEP list and
are skipped on every upload, and are protected even if `DEPLOY_DELETE` is turned on:

```
rates/  newoffice/  .well-known/  cgi-bin/  .user.ini  error_log  php.ini
```

Add any new folder that is not part of this site to that list in `.github/workflows/deploy.yml`
before the next deploy. After each deploy the workflow also checks that
`rates.rsksolarenergy.com` and `newoffice.rsksolarenergy.com` still answer, and reports it
without failing the run.

## What else runs on a schedule

Both of these run on GitHub's servers. Nothing at our end has to be switched on.

### Weekly search report

`.github/workflows/seo-report.yml` runs every Monday morning and **emails the report** to
rajdeep.crest@gmail.com: the domain's authority score, what moved, which searches sit just off page
one, which pages are shown but never clicked, and what is new. That list decides what we write next.

Setup:

1. Google Cloud, new project, enable the **Google Search Console API**.
2. Create a service account, then a JSON key for it.
3. Search Console, Settings, Users and permissions: add the service account's `client_email`
   as a **Full** user.
4. GitHub secret `GSC_SA_JSON`: the whole key file.
5. GitHub secrets `SMTP_USER` and `SMTP_PASS`, so the report can be sent. Any SMTP provider works;
   see "Which mail server to send through" below. Without these two the report is filed as a GitHub
   issue instead, so no week is lost while they are being set up.
6. Optional: `GSC_SITE`, if the property is not `sc-domain:rsksolarenergy.com`.

Run it once by hand from the Actions tab to check the key works.

#### The authority score

Add **one** of these as a repository secret:

| Secret | Where | What appears in the report |
|---|---|---|
| `OPENPAGERANK_KEY` | the Dashboard at openpagerank.keywordseverywhere.com, free, 30,000 domains a month | a 0 to 10 score, how it has moved over the last year, how many domains link in, and the domain's global rank |
| `MOZ_TOKEN` | moz.com/api, free tier | Moz's Domain Authority out of 100, Page Authority, linking root domains, Spam Score |

Moz wins where both are set, because "DA" means Moz's number and nothing else. Neither key set means
the report still arrives, with a line saying which secret to add.

Open PageRank is computed from Common Crawl's open link graph, so the method is published rather than
proprietary, and domains that manufacture links through networks are scored down. It keeps monthly
history back to 2018, which is why the report can say the score is up 0.3 on a year ago rather than
just printing a number.

**A note on old keys.** Open PageRank used to live at domcop.com and took a key in an `API-OPR`
header. It has moved to keywordseverywhere.com and been rebuilt as a POST with a bearer token, and
keys now start `opr_`. A domcop key returns 401, and the report says so in as many words rather than
leaving the section blank.

Each reading is also kept in `files/authority.json`, which is what lets the Moz figure show movement,
since Moz returns only today's number.

DA moves slowly and a point either way is noise. It is worth watching over months, not weeks.

### Blog posts, twice a week

`.github/workflows/blog-draft.yml` runs Tuesday and Friday morning. It takes the top line of
`files/TOPICS.md`, or, with that list empty, the search with real demand that our posts do not answer
yet. It writes the post, puts it through four checks, and **publishes it to the live site with no
review**. The URL is then emailed, to be read on the site.

The four checks, any one of which stops publication:

1. **The figures and the claims** (`scripts/check-draft.mjs`, no model involved). Every figure in the
   prose has to be one of ours or arithmetic on one, and is checked against figures *of its own kind*,
   so a number that happens to be near a real price cannot pass itself off as units of electricity.
   It also refuses: the subsidy going anywhere but the owner's own bank account, loan terms, promised
   savings or payback, claimed authorisations or certifications, a committed timescale, "best" or
   "number one", inflated install numbers, "RSK" without "Solar Energy", and any sentence that
   suggests a warranty of ours. Then: links that do not resolve, fewer than three internal links, no
   chart, under 500 words.
2. **A second model** (`scripts/review-draft.mjs`) reads the post against the same figures and votes
   publish or hold. With both API keys set it is the provider that did *not* write the post, so an
   error has to get past two different models. An answer it cannot read counts as a hold.
3. **The build**, which runs the SEO guard: titles, descriptions, schema, headings, one H1,
   canonicals, internal links.
4. **The writing check** (`npm run tells`), which catches copy that reads as machine-written.

A check failing sends an email saying so, and nothing reaches the site. Nothing needs doing: the next
run takes a fresh topic.

Secrets: `ANTHROPIC_API_KEY` first, `OPENAI_API_KEY` as the fallback. Either one alone keeps it
running, but with only one key the second check is done by the same provider that wrote the post,
which is weaker. `SMTP_USER` and `SMTP_PASS` are what send the emails.

What the model is allowed to use is fixed in `scripts/lib/facts.mjs`, which reads the site's own
config, so a price or tariff change flows through to what a post may say. To write about something
specific: Actions, "Write and publish a blog post", Run workflow, and type the topic.

To pull a published post: delete its file from `src/content/blog/` and push. The next deploy drops it
from the blog list, the sitemap and every internal link. The old HTML file stays on the host until
`DEPLOY_DELETE` is set to `true` in the repository variables, because the upload adds and replaces but
does not remove. Set that variable if a post ever has to disappear the same day.

## Tweaks: what goes straight to live, and what waits for a yes

Small tweaks are made and pushed without asking (RSK Solar Energy's instruction, 26 September 2026).
A small tweak is one that is reversible in a single commit and changes nothing the business promises:

- a title or description rewritten because the weekly report shows it is shown and never clicked
- an internal link added, or one pointed somewhere more useful
- a heading, a paragraph or a FAQ answer made clearer
- a figure corrected so it matches `src/config/`
- image alt text, schema fields, sitemap entries, page weight

Everything else is emailed first: a new page, a page removed, any change to a price, a subsidy figure
or a tariff, the phone numbers or the address, anything that changes what a calculator works out, and
any change to how deploys or the content pipeline run.

### Approving a major tweak

The change goes on a branch with a proposal file, in the format in `files/proposals/README.md`. Then
Actions, **Propose a tweak**, Run workflow, with the branch name.

Two emails arrive: the proposal, saying what changes and why with a link to every line of the diff, and
GitHub's own review request. Both lead to the same place. Open the run, press **Review deployments**,
then Approve or Reject.

Approving merges the branch into `main`, deploys it and deletes the branch. Rejecting changes nothing
and leaves the branch where it is. A confirmation comes back either way.

The gate is a GitHub **environment** called `major-tweaks`, with RSK Solar Energy as its required
reviewer. The `apply` job will not start until an approval is recorded against it, and that approval is
tied to the approving account, so nothing in the workflow has to work out who said yes.

To change who can approve: Settings, Environments, `major-tweaks`, Required reviewers. Anyone listed
needs write access to the repository. Up to six people can be listed and any one of them is enough.

**Nothing else is needed for this: no n8n, no mailbox credentials, no inbound mail.** Approving by
replying to the email was considered and dropped. GitHub cannot receive email, so a reply would have
needed a service watching the mailbox and a code in the subject line to prove the reply was genuine.
That is two more things to keep running, and a silent failure when either stops, in exchange for typing
"yes" instead of pressing a button.

## Mail

Three emails go out: the weekly report, the URL of each published post, and a tweak waiting on a yes.
All of them share two secrets and three optional variables, so changing provider is a settings change
and nothing more.

| | Gmail | Amazon SES, which is what is set up |
|---|---|---|
| `SMTP_USER` | the Gmail address | the SES **SMTP user name**, which looks like an access key but is not one |
| `SMTP_PASS` | an **app password**, not the account password | the SES **SMTP password**, generated with that user name |
| `MAIL_HOST` | leave unset | `email-smtp.<region>.amazonaws.com` |
| `MAIL_PORT` | leave unset | `587`, which switches to STARTTLS on its own |
| `MAIL_FROM` | leave unset, the login is the address | a verified sender, since an SES login is not an email address |

The SES SMTP credentials are not the AWS access key: SES, Account dashboard, SMTP settings, Create SMTP
credentials. A new SES account is also in the sandbox and can only send to verified addresses.

**Nothing receives mail back**, so none of these can be replied to. Approvals are a button in GitHub,
and anything else goes through a Claude Code session.

### Checking it without waiting for a post

**Send a test email** in the Actions tab sends one plain message on demand and prints what it is about
to try. Use it after any change to the mail settings.

| Result | What it means |
|---|---|
| The step fails | The server refused it, and the log carries the SMTP reply: a wrong password, an unverified sender, or an unverified recipient on a sandboxed account |
| It passes and the mail arrives | Everything works |
| It passes and nothing arrives | The provider accepted it and something later dropped it. Look in Spam first, then in the `MAIL_FROM` mailbox for a bounce notice |

### Why it currently lands in spam

Verifying a sender in SES is not the same as the domain authorising SES to send for it. Gmail asks two
things of the sending server: does the From domain's SPF record list it, and is there a DKIM signature
matching that domain? For the sender in use the answer is no to both, from a domain whose own MX is
Google Workspace, so Gmail distrusts it. The mail arrives; it just arrives in Spam. Marking one message
"Not spam" trains Gmail for the rest.

RSK Solar Energy decided on 26 September 2026 that this is fine as it stands. To move the mail to the
inbox properly later: verify the **domain** in SES rather than the address, add the three DKIM CNAMEs it
gives you to that domain's DNS, and add `include:amazonses.com` to its SPF record. For
`rsksolarenergy.com`, whose DNS is at Hostinger, that means editing the single existing record from
`v=spf1 include:_spf.mail.hostinger.com ~all` to
`v=spf1 include:_spf.mail.hostinger.com include:amazonses.com ~all`. One SPF record per domain, never
two.

## Every secret and variable, in one place

| Name | Kind | Needed for |
|---|---|---|
| `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `DEPLOY_PATH` | secret | the deploy |
| `SSH_PORT` | variable | the deploy, if not 22. Hostinger uses 65002 |
| `DEPLOY_DELETE` | variable | removing files on the host that are no longer in the build |
| `GSC_SA_JSON` | secret | the weekly search report |
| `GSC_SITE` | variable | the weekly report, if the property is not `sc-domain:rsksolarenergy.com` |
| `SMTP_USER`, `SMTP_PASS` | secret | every email: the weekly report, a published post's URL, tweak proposals |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` | variable | sending through something other than Gmail, such as Amazon SES |
| `OPENPAGERANK_KEY` or `MOZ_TOKEN` | secret | the authority score in the weekly report |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | secret | writing and checking the posts. Either alone works; both is better |
