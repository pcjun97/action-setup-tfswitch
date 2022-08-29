const os = require("os");
const fs = require("fs");
const path = require("path");

const core = require("@actions/core");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");

const owner = "warrensbox";
const repo = "terraform-switcher";

function getPlatform() {
  const platform = os.platform();

  const mappings = {
    win32: "windows",
  };

  return mappings[platform] || platform;
}

function getArch() {
  const arch = os.arch();

  if (arch === "arm") {
    return `armv${process.config.variables.arm_version}`;
  }

  const mappings = {
    x32: "386",
    x64: "amd64",
  };

  return mappings[arch] || arch;
}

async function getRelease(token, tag) {
  try {
    const octokit = new github.getOctokit(token);

    let release;
    if (tag && tag !== "latest") {
      core.info(`checking GitHub for tag '${tag}'`);
      release = await octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag,
      });
    } else {
      core.info(`checking GitHub for latest tag`);
      release = await octokit.rest.repos.getLatestRelease({
        owner,
        repo,
      });
    }

    return release;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(
        `unable to find '${tag}' - use 'latest' or see https://github.com/${owner}/${repo}/releases for details`
      );
    } else {
      throw err;
    }
  }
}

function getAsset(release, platform, arch, tag) {
  const suffix = platform === "windows" ? "zip" : "tar.gz";
  const version = release.data.tag_name;
  const name = `terraform-switcher_${version}_${platform}_${arch}.${suffix}`;

  const asset = release.data.assets.find((asset) => asset.name === name);
  if (!asset) {
    throw new Error(
      `platform ${platform}/${arch} is not supported for version ${version}. Please file a request at https://github.com/${owner}/${repo}/issues/new`
    );
  }

  return asset;
}

async function download(url) {
  const pathDownload = await tc.downloadTool(url);
  core.info(pathDownload);

  let pathExtract;
  if (os.platform().startsWith("win")) {
    pathExtract = await tc.extractZip(pathDownload);
  } else {
    pathExtract = await tc.extractTar(pathDownload);
  }
  core.info(pathExtract);

  if (!pathDownload || !pathExtract) {
    throw new Error(`unable to download tfswitch from ${url}`);
  }

  return pathExtract;
}

async function createToml(pathToCLI) {
  const homedir = os.homedir();
  const toml = `bin = "${pathToCLI}/terraform"\n`;
  fs.writeFileSync(path.join(homedir, ".tfswitch.toml"), toml);
}

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const tag = core.getInput("tag") || "latest";

    const platform = await getPlatform();
    const arch = await getArch();

    const release = await getRelease(token, tag);
    const version = release.data.tag_name;

    const asset = getAsset(release, platform, arch, tag);
    core.info(`found version: ${version} for ${tag}/${platform}/${arch}`);

    const pathToCLI = await download(asset.browser_download_url);
    core.addPath(pathToCLI);

    createToml(pathToCLI);
  } catch (error) {
    core.setFailed(error);
  }
}

run();
