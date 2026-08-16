<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 600px)" srcset="./assets/banner-dark-sm.svg">
  <source media="(max-width: 600px)" srcset="./assets/banner-light-sm.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/banner-light.svg">
  <img src="./assets/banner-light.svg" alt="Ikki Nishihara — product builder at Lilac" width="100%">
</picture>

<p>
  <a href="https://rairakku.vercel.app"><img alt="Portfolio site" src="./assets/buttons/meta-portfolio.svg" width="73" height="24"></a>
  <a href="https://zaridasu.com"><img alt="zaridasu.com, running in production" src="./assets/buttons/meta-live.svg" width="99" height="24"></a>
  <a href="mailto:lilac.webstudio00@gmail.com"><img alt="Email" src="./assets/buttons/meta-email.svg" width="52" height="24"></a>
</p>

Product builder in Japan, running a one-person studio called **Lilac**（ライラック）.
I take web products from the first sketch to the server they run on — planning, design,
implementation, security, and the unglamorous operations work that comes after.

Most of what I write is client work or unreleased product code, so it lives in private
repositories. What I can show is the software that is actually running.

## Live

### ザリダス / Zaridasu

Citizen-science app for mapping invasive species. Anyone can post a photo, AI assists with
identification, and the sightings become a map conservation groups can act on.

I built it alone — the review queue, and the EXIF stripping that keeps a photo from giving
away someone's home. I also ran a security review on my own authorization and location
handling.

`Next.js` `Supabase` `Gemini API` `R3F` `PWA` `i18n (4 locales)`

<a href="https://zaridasu.com"><img alt="Open zaridasu.com" src="./assets/buttons/open-zaridasu.svg" width="190" height="36"></a>

### シュフト / Shuft

Shift scheduling for small shops, where the usual tooling is paper and a group chat. No
sign-up: share one URL and your staff are in. Covers multiple stores, shift requests,
templates, and image/PDF export. Deployed and open to try, preloaded with sample data.

`Next.js` `Supabase` `jsPDF`

<a href="https://manager-app-woad.vercel.app"><img alt="Open the Shuft app" src="./assets/buttons/open-shuft.svg" width="150" height="36"></a>

## In progress

Not finished, not pretending otherwise.

- **find** — *MVP running.* Swipe through outfits instead of scrolling a catalogue, then hand
  off to the retailer. No inventory, no checkout — the retailer handles both.  
  `Next.js` `Rakuten API` `GA4`
- **CaloMirror** — *prediction engine working.* Estimates calories from a photo of a meal, then
  renders the body you are heading toward at 30 days and at one year as a 3D avatar.  
  `Three.js` `Claude API` `NIH model`
- **PriceScope** — *pricing logic done, no UI yet.* Shows a seller the price band that actually
  moves, a sell-through score, and what to fix before posting.  
  `TypeScript`

## Also shipping

- **Automation that runs unattended.** Daily scrapers, Sheets pipelines, and generated social
  assets on a schedule — plus the failure diagnostics that catch a pipeline dying quietly,
  which is how these things actually break.
- **Client work through Lilac.** Multilingual venue sites, a recruiting microsite and
  restaurant storefronts. I also moved a clinic booking system onto a modern stack without
  downtime. It is under NDA, which is why none of it is linked here.
- **[しゃかいもんだい図鑑](https://instagram.com/shakai_zukan)** — social issues explained
  through characters who embody them. I designed the whole AI production pipeline.

## Stack

`TypeScript` `Next.js` `React` `Three.js` `Python` `Supabase` `PostgreSQL` `Claude API`

## Working together

Websites, landing pages, product MVPs, and the automation behind them. One person the whole
way through, so nothing gets lost handing the work from whoever designed it to whoever ships
it. Tell me what you are trying to ship and I will reply with whether I am the right person
for it.

<!-- Change the line below when you are not taking work. -->
Currently open to new work.

<a href="mailto:lilac.webstudio00@gmail.com"><img alt="Email me" src="./assets/buttons/email.svg" width="115" height="36"></a>

<img alt="Section divider" src="./assets/rule.svg" width="100%">

<div align="center">

**Lilac**（ライラック）· web and product development in Japan

[rairakku.vercel.app](https://rairakku.vercel.app) · [lilac.webstudio00@gmail.com](mailto:lilac.webstudio00@gmail.com)

</div>
