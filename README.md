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

## Install as a TV app (TizenBrew Installer)

1. `python build-wgt.py` makes `DumiTV.wgt`; attach it to a GitHub release of this repo.
2. Put the TV in Developer Mode (Apps → `12345`, Host PC IP = your computer) and restart it fully.
3. In TizenBrew Installer, install from GitHub: `thedragonsdvl-maker/dumi-tv`.
4. Open **Dumi TV** from the TV's apps. Press GREEN → **Asistent** → **Cheie Gemini** and type your
   Gemini API key (free from [aistudio.google.com](https://aistudio.google.com)). It is saved on the TV only.

## Or as a TizenBrew module

In TizenBrew → Module Manager, add `gh/thedragonsdvl-maker/dumi-tv`.

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
