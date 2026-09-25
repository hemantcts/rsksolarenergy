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

### 3. First run

Actions tab, "Build and deploy", Run workflow. It uploads only changed files, then checks that the
live homepage, the calculator, the blog and the search index all return 200, and tells the
IndexNow search engines what changed.

## If a deploy fails

- **The checks failed.** The log names the rule. Fix it and push again; nothing reached the host.
- **SSH refused.** Check the port variable, and that the public key is on the host.
- **The live check failed.** The upload worked but the site did not answer. Check the host is up
  and that `DEPLOY_PATH` points at the web root, not its parent.

`.htaccess` is part of the build, so it uploads with everything else. Keep host-level files such as
`.well-known` out of the repo; the upload leaves them alone.

## What else runs on a schedule

Both of these run on GitHub's servers. Nothing at our end has to be switched on.

### Weekly search report

`.github/workflows/seo-report.yml` runs every Monday morning and files a GitHub issue: what moved,
which searches sit just off page one, which pages are shown but never clicked, and what is new.
That list decides what we write next.

Setup:

1. Google Cloud, new project, enable the **Google Search Console API**.
2. Create a service account, then a JSON key for it.
3. Search Console, Settings, Users and permissions: add the service account's `client_email`
   as a **Full** user.
4. GitHub secret `GSC_SA_JSON`: the whole key file.
5. Optional variables: `GSC_SITE` if the property is not `sc-domain:rsksolarenergy.com`, and
   `N8N_WEBHOOK` to have the report POSTed to n8n for WhatsApp or email.

Run it once by hand from the Actions tab to check the key works.
