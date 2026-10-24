# Dumi TV for Samsung (Tizen)

An Apple TV-style home screen for Samsung Tizen TVs, run as a **TizenBrew app module** (an app, not a
launcher replacement).

- Clock, greeting and date; 12 nature photos that crossfade; a dock of your favourite apps; every other
  app in a grid below.
- A boot animation (the clock glides into its corner) and a return animation when you come back.
- Console-style UI sounds, synthesised in the browser (no audio files).
- **Dumi Assistant** (RED button, or the "Dumi" pill): type a question; Gemini answers in bold under it,
  speaks the answer, and can open apps or change the volume.
- Settings (GREEN button): clock, photos, dock, assistant language and voice, sounds.

## Install with TizenBrew

1. Open TizenBrew on the TV → **Module Manager** → add a module.
2. Enter `gh/<your-github-username>/dumi-tv` and confirm.
3. Start **Dumi TV** from TizenBrew.
4. Press GREEN → **Asistent** → **Cheie Gemini** and type your Gemini API key
   (free from [aistudio.google.com](https://aistudio.google.com)). It is saved on the TV only, never in this repo.

## Remote

| Button | Does |
|---|---|
| Arrows / OK | Move / open |
| BACK | Up a level |
| RED | Dumi Assistant |
| GREEN | Settings |

## What Tizen doesn't allow

Web apps on Tizen can't read what other apps are playing, change channels or press keys in other apps,
so the Android version's Now Playing card and channel control aren't here. The Samsung remote's
microphone is reserved for Bixby, so questions are typed.

## Credits

- Design based on [tv-home](https://github.com/mihirgupta0900/tv-home) by Mihir Gupta (MIT).
- Photos: Wikimedia Commons, CC BY-SA, see `app/wallpapers/CREDITS.md`.
- Clock font: [Tektur](https://fonts.google.com/specimen/Tektur) (SIL Open Font License), loaded from Google Fonts.
