# Sewer Pizza

A free, unofficial fan hub app: news, official videos, where to watch, daily trivia, game links and a wishlist. It is a web app, so people open a link and choose "Add to Home Screen" to install it. There is no app store, no accounts and no cost.

Sewer Pizza is not affiliated with or endorsed by Paramount, Nickelodeon or any rights holder. Keep it that way: no official logos, character art or hosted episodes. Link to and embed official sources only.

## Put it online for free (GitHub Pages)

1. Make a free account at github.com.
2. Create a new repository named `sewer-pizza` and set it to **Public**.
3. On the repository page, choose **Add file → Upload files** and drag in everything from this folder, including the `.github` folder. (If your computer hides that folder, turn on "show hidden files" first.) Click **Commit changes**.
4. Open **Settings → Pages**. Under "Build and deployment", pick **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. After a minute or two your app is live at `https://YOUR-USERNAME.github.io/sewer-pizza/`. That is the link you share.
6. Open the **Actions** tab and, if asked, enable workflows. Run **Update news and videos** once by hand (**Run workflow**). From then on it runs every hour and the app picks up new headlines on its own.

## Install it on a phone

- **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap the menu, then **Install app** or **Add to Home screen**.

## Change what's in the app

All the content lives in the `data` folder. Edit a file on GitHub (click it, then the pencil icon) and commit; the app updates within a few minutes.

| File | What it controls |
|---|---|
| `data/sources.json` | News feeds and YouTube channels the hourly update reads |
| `data/library.json` | Series, movies, games, shop categories and the release countdown |
| `data/trivia.json` | Trivia questions (10 are picked each day) |
| `data/news.json`, `data/videos.json` | Written by the hourly update. No need to edit. |

**Add a YouTube channel:** open the channel on YouTube, tap **More about this channel → Share channel → Copy channel ID**. Paste the ID (it starts with `UC`) into `youtubeChannels` in `data/sources.json`, like `["UCxxxxxxxxxxxxxxxxxxxxxx"]`.

**Add a news feed:** paste any RSS feed address into `feeds` in `data/sources.json`, with a name.

**Set a "where to watch" link:** in `data/library.json`, put the streaming page address in that title's `url`. Left empty, the app opens a JustWatch search instead, which always shows current streaming options.

**Play videos inside the app:** set `"embedVideos": true` in `data/library.json` once the app is hosted on your own link.

**Release countdown:** add entries under `releases` with a `title` and a `date` in `YYYY-MM-DD` form. The app shows the nearest upcoming one. Delete the sample entry.

**Episode counts:** check the `episodes` numbers for each series and fix any that are off, since they drive the watch tracker.

## What is saved where

Ratings, the watch tracker, trivia streaks, badges and the wishlist are saved on each person's own phone. Nothing is sent anywhere, and clearing the browser's data resets them.

## eBay listings inside the app (optional)

With this set up, tapping **Search** in the Shop shows real eBay listings, with photos, prices and condition, right in the app. It uses a tiny free helper on Cloudflare that keeps your eBay keys private. The helper never stores any eBay data.

**1. Get eBay keys (free)**
1. Go to developer.ebay.com and sign in with your eBay account. Accept the developer terms.
2. Open **Application Keys** and create a **Production** keyset (name it Sewer Pizza).
3. If eBay asks about **Marketplace Account Deletion** notifications, choose the exemption and pick **"I do not persist eBay data."** That is true for this app.
4. Copy the **App ID (Client ID)** and the **Cert ID (Client Secret)**. Keep them private.

**2. Create the helper (free)**
1. Sign up at dash.cloudflare.com.
2. Go to **Workers & Pages → Create → Create Worker**. Name it `sewer-pizza-search` and click **Deploy**.
3. Click **Edit code**, delete what's there, paste everything from `worker/ebay-search.js` in this repository, and click **Deploy**.
4. Open the worker's **Settings → Variables and Secrets**. Add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` as **Secret** values, then deploy.
5. Copy the worker's address. It looks like `https://sewer-pizza-search.YOUR-NAME.workers.dev`.

**3. Connect it**
In `data/library.json`, set `"ebaySearch"` (under `"settings"`) to the worker's address and commit. Never paste the eBay keys into this repository. They belong only in Cloudflare.
