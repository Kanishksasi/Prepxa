# Prepxa Website

Static site — no build step, no dependencies to install. Four pages:

| File | Purpose | App Store Connect field |
|---|---|---|
| `index.html` | Marketing landing (3D hero) | **Marketing URL** |
| `privacy.html` | Privacy Policy | **Privacy Policy URL** (required) |
| `support.html` | Support / FAQ / safety reporting | **Support URL** (required) |
| `terms.html` | Terms of Service | Link in app metadata (optional) |

The 3D scene loads Three.js from a CDN and degrades gracefully
(reduced-motion users get a calmer scene; pages work with JS disabled).

## Host on GitHub Pages (free, ~2 minutes)

```bash
cd website
git init && git add -A && git commit -m "Prepxa site"
gh repo create prepxa-site --public --source=. --push
gh api repos/{owner}/prepxa-site/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

Site appears at `https://<your-username>.github.io/prepxa-site/`.
(Or: repo Settings → Pages → Deploy from branch → main / root.)

## Custom domain (recommended: prepxa.app)

1. Buy the domain, then in the repo: Settings → Pages → Custom domain → `prepxa.app`
2. At your DNS provider, point an A/ALIAS record at GitHub Pages and add the
   `www` CNAME. Enable "Enforce HTTPS".

Then your App Store Connect URLs are:
- Privacy Policy: `https://prepxa.app/privacy.html`
- Support: `https://prepxa.app/support.html`
- Marketing: `https://prepxa.app`

## After App Store approval

In `index.html`, find the `#download` section and swap the
"Get notified at launch" button for the official App Store badge
(commented-out snippet is already in place).
