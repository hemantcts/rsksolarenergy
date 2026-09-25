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

- **SiteGround:** Site Tools, Devs, SSH Keys Manager, Import, paste the public key.
- **Hostinger:** hPanel, Advanced, SSH Access, add the key.

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
| `DEPLOY_PATH` | the web root, e.g. `/home/customer/www/rsksolarenergy.com/public_html` |

**Variables** tab (optional):

| Variable | What it does |
|---|---|
| `SSH_PORT` | defaults to 22. SiteGround uses 18765, Hostinger 65002. |
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
