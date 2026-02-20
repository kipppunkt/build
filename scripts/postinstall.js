#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const PLATFORM_MAP = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const ARCH_MAP = {
  arm64: "arm64",
  x64: "x64",
};

const SUPPORTED = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "windows-x64",
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderProgressBar(downloaded, total) {
  const width = 30;
  const fraction = downloaded / total;
  const filled = Math.round(width * fraction);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pct = (fraction * 100).toFixed(0).padStart(3);
  process.stdout.write(`\r  [${bar}] ${pct}% ${formatBytes(downloaded)} / ${formatBytes(total)}`);
}

function main() {
  const platform = PLATFORM_MAP[process.platform];
  const arch = ARCH_MAP[process.arch];

  if (!platform || !arch) {
    console.error(
      `Unsupported platform/architecture: ${process.platform}/${process.arch}\n` +
        `Supported combinations: ${SUPPORTED.join(", ")}`
    );
    process.exit(1);
  }

  const combo = `${platform}-${arch}`;
  if (!SUPPORTED.includes(combo)) {
    console.error(
      `Unsupported platform/architecture combination: ${combo}\n` +
        `Supported combinations: ${SUPPORTED.join(", ")}`
    );
    process.exit(1);
  }

  const pkg = require(path.join(__dirname, "..", "package.json"));
  const version = pkg.version;
  const isWindows = platform === "windows";
  const binaryName = `kipppunkt-build-${combo}${isWindows ? ".exe" : ""}`;
  const url = `https://github.com/kipppunkt/build/releases/download/v${version}/${binaryName}`;

  const binDir = path.join(__dirname, "..", "bin");
  const dest = path.join(binDir, `kipppunkt-build${isWindows ? ".exe" : ""}`);

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  console.log(`Downloading ${binaryName} from v${version}...`);

  download(url, dest)
    .then((size) => {
      fs.chmodSync(dest, 0o755);
      console.log(`\nDone!`);
    })
    .catch((err) => {
      console.error(`Failed to download binary: ${err.message}`);
      process.exit(1);
    });
}

function download(url, dest, redirects = 0) {
  if (redirects > 10) {
    return Promise.reject(new Error("Too many redirects"));
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "kipppunkt-build-npm" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(res.headers.location, dest, redirects + 1));
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(
            new Error(`Download failed with status ${res.statusCode} for ${url}`)
          );
        }

        const totalBytes = parseInt(res.headers["content-length"], 10) || 0;
        let downloaded = 0;

        if (totalBytes) {
          renderProgressBar(0, totalBytes);
        }

        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (totalBytes) {
            renderProgressBar(downloaded, totalBytes);
          }
        });

        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(downloaded)));
        file.on("error", (err) => {
          fs.unlinkSync(dest);
          reject(err);
        });
      })
      .on("error", reject);
  });
}

main();
