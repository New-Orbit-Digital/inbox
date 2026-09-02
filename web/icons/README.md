# web/icons/ — PWA icons (prep-owned)

Packet 007 references three files here and **no packet unit may create, edit or replace
an image**. They are generated in a prep session and uploaded by Justin, because the chat
connector cannot write binary files and the planner's git proxy refuses direct pushes to
this repo.

Expected, exactly:

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | `purpose: any` |
| `icon-512.png` | 512×512 | `purpose: any` |
| `icon-maskable-512.png` | 512×512 | `purpose: maskable`, glyph inset to ~78% for Android's safe zone |

All three are a white inbox-tray line mark on the app's `--ink` navy `#131826`.

**To upload:** open this folder on GitHub → *Add file* → *Upload files* → drag the three
PNGs → commit to a branch and merge (the `main` ruleset requires a PR). The web uploader
silently drops **dot**-paths, which is why the workflows had to be pasted; a plain folder
like this one is fine.

Packet 007's asset gate STOPs the packet if any of the three is missing from `main`, so
nothing ships half-iconed. This README is not referenced by the manifest and is harmless
if it stays.
