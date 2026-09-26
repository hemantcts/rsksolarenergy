---
subject: Remove files from the host that are no longer part of the site
---

## What changes

Nothing a visitor sees. At the moment the upload adds and replaces files on the server but never
removes any, so anything the site stops using sits there forever. After this change the server is
made to match what was built: a page deleted from the site actually disappears from the server, and
old files stop piling up.

## Why

A dry run against the live server today found five leftover files, all of them old copies of the
site's JavaScript that newer builds replaced. Harmless individually, but the pile only grows, and
more importantly it means removing a page today does not really remove it. A blog post taken down
would still answer on its old address until somebody deleted it by hand over SSH.

The applications on the subdomains are excluded and cannot be touched by this: `rates`, `newoffice`,
`.well-known`, `cgi-bin`, `.user.ini`, `error_log` and `php.ini` are skipped on every upload and are
not deletable by it either.

## What happens if it is wrong

The risk worth naming is a build that comes out broken or empty being uploaded with permission to
delete, which would take the live site with it. The change therefore counts the files first and
refuses to upload anything if there are fewer than 300, where a real build is around 1,200. The tests,
the SEO guard and the writing check all still have to pass before the upload runs at all.

To undo it, the deploy reverts in one commit and the next push restores the previous behaviour.
Anything wrongly deleted comes back on the following deploy, because it is rebuilt from the
repository every time.
