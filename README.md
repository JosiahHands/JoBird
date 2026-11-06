# JoBird
[![Backers on Open Collective](https://opencollective.com/postbird/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/postbird/sponsors/badge.svg)](#sponsors)

JoBird is [JosiahHands](https://github.com/JosiahHands)' edition of [Postbird](https://github.com/Paxa/postbird), a cross-platform PostgreSQL GUI client, written in JavaScript, runs with Electron

<img src="https://user-images.githubusercontent.com/26019/41055418-dcc55700-69f3-11e8-8d3e-572cf5febedc.png" alt="Connection Screen" width=65%>
<img src="https://user-images.githubusercontent.com/26019/41055416-dc5a5464-69f3-11e8-87b8-994e763da816.png" alt="Table Content" width=65%>
<img src="https://user-images.githubusercontent.com/26019/41055417-dc8eb56a-69f3-11e8-8145-6f0d5eb147a6.png" alt="Table Structure" width=65%>

## Download

### JoBird v0.8.7

**macOS** (10.13+)

* Apple Silicon (M1 and newer): [JoBird-0.8.7-arm64.dmg](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/JoBird-0.8.7-arm64.dmg)
* Intel: [JoBird-0.8.7-x64.dmg](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/JoBird-0.8.7-x64.dmg)

**Windows** (64-bit)

* Installer: [JoBird-Setup-0.8.7.exe](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/JoBird-Setup-0.8.7.exe)
* Portable, no install needed: [JoBird-0.8.7-portable.exe](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/JoBird-0.8.7-portable.exe)
* Zip: [JoBird-0.8.7-win.zip](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/JoBird-0.8.7-win.zip)

**Linux** (64-bit)

* Debian / Ubuntu: [jobird_0.8.7_amd64.deb](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/jobird_0.8.7_amd64.deb)
* Fedora / RHEL / openSUSE: [jobird-0.8.7.x86_64.rpm](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/jobird-0.8.7.x86_64.rpm)
* Any distro: [jobird-0.8.7-x86_64.AppImage](https://github.com/JosiahHands/JoBird/releases/download/v0.8.7/jobird-0.8.7-x86_64.AppImage)

All releases: https://github.com/JosiahHands/JoBird/releases

**What's new in JoBird**

* 0.8.7: JoBird for **Windows** and **Linux**, plus Intel Macs.
* 0.8.7: **Save as SQL**: `CREATE TABLE` + `INSERT` statements that recreate the result in another database. A single-table query keeps the real table name (e.g. `people`), other queries use `result`. Columns keep their real names and exact types (e.g. `character varying(255)`). Export Settings (⚙) can turn off the `CREATE TABLE`.
* 0.8.6: fixed the Save as menu being partly hidden behind the result table's header row (CSV and JSON were covered).
* Query tab: **Save as ▾** button with a format menu: CSV (default), JSON, TypeScript, JavaScript, HTML, SQL. The last format you picked is remembered.
* TypeScript export includes an `interface Result` with each column's type; JavaScript/TypeScript exports use `export const result` (module) by default.
* The ⚙ at the bottom of the format menu opens Export Settings, to switch JS/TS exports between **Module** and **CommonJS** and choose whether SQL exports include `CREATE TABLE`. Remembered between launches.

**Installing**

JoBird is a separate app from the original Postbird (bundle ID `com.josiahhands.jobird`, Linux package `jobird`), so it installs next to it without replacing it. The app isn't code-signed, so the first launch may need one extra step:

* **macOS:** open the `.dmg` and drag **JoBird** into Applications. If macOS blocks it, right-click JoBird in Applications and choose **Open**, or run:

  ```sh
  xattr -dr com.apple.quarantine /Applications/JoBird.app
  ```

* **Windows:** if SmartScreen shows "Windows protected your PC", click **More info** → **Run anyway**.
* **Linux:** install the package (`sudo apt install ./jobird_0.8.7_amd64.deb` or `sudo dnf install ./jobird-0.8.7.x86_64.rpm`), or make the AppImage executable and run it:

  ```sh
  chmod +x jobird-0.8.7-x86_64.AppImage && ./jobird-0.8.7-x86_64.AppImage
  ```

**Build it yourself**

```sh
git clone https://github.com/JosiahHands/JoBird.git
cd JoBird
npm install
npm run build
ls ./dist   # installers for the system you build on
```

Releases are built by GitHub Actions ([build.yml](.github/workflows/build.yml)) on macOS, Windows and Linux: pushing a tag like `v0.8.7` builds all installers and publishes them as a GitHub release.

### Original Postbird

**Version 0.8.4**

MacOS: [Postbird-0.8.4.dmg](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird-0.8.4.dmg) - MacOS 10.9+

Linux packages:

* [Postbird_0.8.4_amd64.deb](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird_0.8.4_amd64.deb)
* [Postbird-0.8.4.x86_64.rpm](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird-0.8.4.x86_64.rpm)
* [Postbird_0.8.4_amd64.snap](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird_0.8.4_amd64.snap)
* [postbird-0.8.4.AppImage](https://github.com/Paxa/postbird/releases/download/0.8.4/postbird-0.8.4.AppImage)
* [Postbird-0.8.4.apk](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird-0.8.4.apk)
* [Postbird-0.8.4.pacman](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird-0.8.4.pacman)

Via snap:
```
sudo snap install postbird
```
Snap page: https://snapcraft.io/postbird

Windows installer: [Postbird.Setup.0.8.4.exe](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird-Setup-0.8.4.exe)<br>
Windows portable: [Postbird-0.8.4-win.zip](https://github.com/Paxa/postbird/releases/download/0.8.4/Postbird-0.8.4-win.zip)

Latest artifacts: https://nightly.link/Paxa/postbird/workflows/build/master

## Development

[ ![Codeship Status for Paxa/postbird](https://app.codeship.com/projects/c2450da0-9339-0135-ee6d-1663622ccf5e/status?branch=master)](https://app.codeship.com/projects/250798)
[![Build Status](https://travis-ci.org/Paxa/postbird.svg?branch=master)](https://travis-ci.org/Paxa/postbird)


Pull requests and suggestions are welcome

To run newest version, simply:

```sh
git clone git@github.com:Paxa/postbird.git
cd postbird
yarn
yarn start
```

Build package:
```sh
yarn dist
ls ./dist
```

See [CONTRIBUTING.md](/CONTRIBUTING.md) for more details

## Help Project

Your donations will help to publish to app stores, more frequent releases, faster feature requests implementation.
Postbird at opencollective: https://opencollective.com/postbird

### Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/Paxa/postbird/graphs/contributors"><img src="https://opencollective.com/postbird/contributors.svg?width=890&button=false" /></a>


### Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/postbird#backer)]

<a href="https://opencollective.com/postbird#backers" target="_blank"><img src="https://opencollective.com/postbird/backers.svg?width=890"></a>


### Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/postbird#sponsor)]

<a href="https://opencollective.com/postbird/sponsor/0/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/1/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/2/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/3/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/4/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/5/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/6/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/7/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/8/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/postbird/sponsor/9/website" target="_blank"><img src="https://opencollective.com/postbird/sponsor/9/avatar.svg"></a>


