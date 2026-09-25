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
5. GitHub secrets `SMTP_USER` and `SMTP_PASS`, so the report can be sent. Use the Gmail address
   itself and a **Google app password**, not the account password: Google Account, Security,
   two-step verification on, then App passwords. Without these two the report is filed as a GitHub
   issue instead, so no week is lost while they are being set up.
6. Optional: `GSC_SITE` if the property is not `sc-domain:rsksolarenergy.com`, and `N8N_WEBHOOK` to
   have the report POSTed to n8n as well.

Run it once by hand from the Actions tab to check the key works.

#### The authority score

Domain Authority is Moz's own number, so the real figure needs a Moz key. Add **one** of these as a
secret:

| Secret | Where | What appears in the report |
|---|---|---|
| `MOZ_TOKEN` | moz.com/api, free tier | Domain Authority out of 100, Page Authority, how many domains link in, Spam Score |
| `OPENPAGERANK_KEY` | domcop.com/openpagerank, free | a 0 to 10 score and the domain's global rank, labelled as Open PageRank rather than DA |

Moz wins where both are set. Each week's reading is kept in `files/authority.json`, so the report
says whether the score has moved rather than just what it is. Neither key set means the report still
arrives, with a line saying which secret to add.

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
