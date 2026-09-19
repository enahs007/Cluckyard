# Cluckyard for Android

Sideload build of Cluckyard — the hen, the yard, hide-in-cover, hunters. Runs on the phone with **no website**. Not a Play Store listing (that still needs your Google Play account).

## Put this folder on your PC

Copy the whole folder to:

```
E:\Games\Cluckyard
```

You should have:

```
E:\Games\Cluckyard\Cluckyard.apk
E:\Games\Cluckyard\README.txt
```

## Install on a phone

1. Copy `Cluckyard.apk` to the Android phone (USB, Drive, email).
2. On the phone: Settings → security → allow install from this source.
3. Open `Cluckyard.apk` and install.
4. Launch **Cluckyard**. Stick to walk, Flap, Peck, Home at the coop. Stand still in a bush or tree to hide.

This APK is **debug-signed** so you can install it yourself. Play Store needs a later **release** build signed with *your* key after you open a Play Console account.

## Rebuild (optional)

From the Cluckyard project:

```
npm run android:apk
```

Package: `com.cluckyard.game`
