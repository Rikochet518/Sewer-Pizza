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
