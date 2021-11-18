// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const cheerio = require("cheerio");
const dateFns = require("date-fns");

const GITHUB_SRC_PATH =
  "https://github.com/lmorchard/sketches-v01/tree/main/src";
const GITHUB_PAGES_PATH = "https://lmorchard.github.io/sketches-v01";

const metaContent = ($, name, defaultValue) =>
  $(`head meta[property='${name}']`).attr("content") || defaultValue;

// Behold my primitive static site generator shoehorned into snowpack
function ejsRenderData({ filePath }) {
  const siteIndexPath = path.dirname(filePath);
  const sketchesPath = path.join(siteIndexPath, "sketches");
  const sketchIndexPaths = glob.sync(`${sketchesPath}/**/index.html`);

  const sketches = [];
  for (const sketchPath of sketchIndexPaths) {
    const indexStat = fs.statSync(sketchPath);
    const indexSrc = fs.readFileSync(sketchPath);
    const $ = cheerio.load(indexSrc);

    const href = path.dirname(
      sketchPath.replace(`${sketchesPath}/`, "sketches/")
    );
    const title = metaContent($, "og:title", $("head title").text());
    const date = new Date(
      metaContent($, "og:article:modified_time", indexStat.mtimeMs)
    );
    const metaImage = metaContent($, "og:image");
    const image = metaImage
      ? `${href}/${metaImage}`
      : "/images/presentation-svgrepo-com.svg";
    const description = metaContent($, "og:description");

    sketches.push({ href, title, image, date, description });
  }

  sketches.sort((a, b) => b.date.getTime() - a.date.getTime());

  return { GITHUB_SRC_PATH, dateFns, sketches };
}

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: { url: "/" },
  },
  exclude: [],
  plugins: [
    [
      "snowpack-plugin-ejs",
      {
        renderOptions: { async: true },
        renderData: ejsRenderData,
      },
    ],
    [
      "@emily-curry/snowpack-plugin-wasm-pack",
      { projectPath: "./src-wasm/noise-generator" },
    ],
    [
      "@emily-curry/snowpack-plugin-wasm-pack",
      {
        projectPath: "./src-wasm/noise-generator",
        outName: "index-no-modules",
        target: "no-modules",
      },
    ],
    ["snowpack-plugin-wasm-pack", { projectPath: "./src-wasm/wasm_play" }],
    ["snowpack-plugin-wasm-pack", { projectPath: "./src-wasm/perlin" }],

    // FIXME: this is breaking on an error like
    // (node:4105) UnhandledPromiseRejectionWarning: Error: Can't resolve 'sketches/2021/codesketchtober/day01/index.html' in '/home/lmorchard/devel/sketches-v01/build'
    //["snowpack-plugin-hash"],
  ],
  packageOptions: {
    polyfillNode: true,
  },
  devOptions: {
    open: "none",
  },
  buildOptions: {
    out: "build",
    metaUrlPath: "vendor",
  },
};
