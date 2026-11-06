/* eslint-disable no-template-curly-in-string */ // "${productName}" etc. are electron-builder macros, not JS templates
const builder = require("electron-builder");

var packageJson = require('./package.json');
var childProcess = require('child_process');
var isWin = process.platform === "win32";

var exec = (cmd) => {
  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        stdout.stderr = stderr;
        resolve(stdout);
      }
    });
  });
}

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error.message);
});

(async () => {

  const commitsCount = (await exec("git rev-list HEAD --count")).trim();
  const commitID = (await exec("git log --pretty=format:'%h' -n 1")).trim();

  const buildVersion = `${commitsCount} - ${commitID}`;
  console.log('build-version', buildVersion);

  await builder.build({
    //targets: Platform.MAC.createTarget(),
    config: {
      protocols: {
        name: "Postgres Database",
        schemes: ["postgres", "postgresql"],
        role: "Editor"
      },
      fileAssociations: [{
        ext: "sql",
        name: "SQL File",
      }],
      npmRebuild: false, // because we changed dependency paths postgres manually
      icon: isWin ? "build_files/icon.ico" : __dirname + "/build_files/icon.icns",
      appId: "com.josiahhands.jobird",
      productName: process.platform == 'linux' ? 'jobird' : 'JoBird',
      publish: null,

      mac: {
        category: "public.app-category.developer-tools",
        // separate dmg for Apple Silicon and Intel Macs
        target: [{target: "dmg", arch: ["arm64", "x64"]}],
        artifactName: "${productName}-${version}-${arch}.${ext}", // JoBird-0.8.7-arm64.dmg, JoBird-0.8.7-x64.dmg
        bundleVersion: buildVersion,
        bundleShortVersion: packageJson.version,
        minimumSystemVersion: "10.13.0", // lowest macOS supported by Electron 21
        extendInfo: {
          NSRequiresAquaSystemAppearance: false,
        },
        darkModeSupport: true,
        asar: true,
        extraFiles: ["vendor/darwin"],
        asarUnpack: ["node_modules/libpq"],
        files: ["!vendor"]
      },

      linux: {
        category: "Programming",
        target: ["deb", "rpm", "AppImage"],
        icon: __dirname + "/build_files/icon.png",
        mimeTypes: ["application/sql"],
        maintainer: "Josiah Hands (https://github.com/JosiahHands)",
        vendor: "Josiah Hands",
        description: "JoBird is a cross-platform PostgreSQL GUI client based on Postbird. Simple and efficient, with support of postgres specific features"
      },
      // packageName: own package name, so it doesn't replace an installed "postbird" package
      deb: {
        packageName: "jobird",
        artifactName: "${productName}_${version}_${arch}.${ext}", // jobird_0.8.7_amd64.deb
        depends: [
          // electron-builder defaults + psql/pg_dump for import/export
          "libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils",
          "libatspi2.0-0", "libuuid1", "libsecret-1-0", "postgresql-client"
        ],
        synopsis: "PostgreSQL desktop client"
      },
      rpm: {
        packageName: "jobird",
        artifactName: "${productName}-${version}.${arch}.${ext}", // jobird-0.8.7.x86_64.rpm
        depends: ["postgresql"],
        synopsis: "PostgreSQL desktop client"
      },
      appImage: {
        artifactName: "${productName}-${version}-${arch}.${ext}", // jobird-0.8.7-x86_64.AppImage
        synopsis: "PostgreSQL desktop client",
        category: "Development",
      },

      nsis: {
        installerIcon: "build_files/icon.ico",
        artifactName: "${productName}-Setup-${version}.${ext}" // JoBird-Setup-0.8.7.exe
      },
      portable: {
        artifactName: "${productName}-${version}-portable.${ext}" // JoBird-0.8.7-portable.exe
      },
      win: {
        target: ["nsis", "zip", "portable"],
        artifactName: "${productName}-${version}-win.${ext}", // JoBird-0.8.7-win.zip
        verifyUpdateCodeSignature: false,
        icon: "build_files/icon.ico",
        extraFiles: [
          "vendor/win32"
        ]
      }
    }
  })
})();
