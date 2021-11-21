const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const glob = require("glob");
const cheerio = require("cheerio");
const dateFns = require("date-fns");

const GITHUB_SRC_PATH =
  "https://github.com/lmorchard/sketches-v01/tree/main/src";

const GITHUB_PAGES_PATH = "https://lmorchard.github.io/sketches-v01";

module.exports = function (snowpackConfig, pluginOptions = {}) {
  let root, sketchesRoot;
  const options = {
    sketchesRoot: "./src/sketches",
    ...pluginOptions,
  };

  // wrap ejs.renderFile as a Promise
  function renderFile(...args) {
    return new Promise((resolve, reject) => {
      ejs.renderFile(...args, (err, str) => (err ? reject(err) : resolve(str)));
    });
  }

  const metaContent = ($, name, defaultValue) =>
    $(`head meta[property='${name}']`).attr("content") || defaultValue;

  function renderData({ filePath }) {
    const sketchIndexPaths = glob.sync(`${sketchesRoot}/**/index.html`);
    const indexPath = path.relative(filePath, sketchesRoot);

    const commonData = {
      GITHUB_SRC_PATH,
      dateFns,
    };

    const sketches = [];
    for (const sketchPath of sketchIndexPaths) {
      const indexStat = fs.statSync(sketchPath);
      const indexSrc = fs.readFileSync(sketchPath);
      const $ = cheerio.load(indexSrc);

      const href = path.dirname(path.relative(path.dirname(filePath), sketchPath)) + "/";
      const title = metaContent($, "og:title", $("head title").text());
      const date = new Date(
        metaContent($, "og:article:modified_time", indexStat.mtimeMs)
      );
      const metaImage = metaContent($, "og:image");
      const image = metaImage
        ? `${href}${metaImage}`
        : "./images/presentation-svgrepo-com.svg";
      const description = metaContent($, "og:description");

      sketches.push({ href, title, image, date, description });
    }

    sketches.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { ...commonData, sketches };
  }

  return {
    name: "sketches-index-snowpack-plugin",

    config(snowpackConfig) {
      ({ root } = snowpackConfig);
      sketchesRoot = path.resolve(root, options.sketchesRoot);
    },

    // Build .ejs indexes from scraped data
    resolve: { input: [".ejs"], output: [".html"] },
    async load({ filePath }) {
      if (!filePath) return;
      if (path.basename(filePath).startsWith("_")) return;
      // TODO: track includes like snowpack-plugin-ejs does?
      return renderFile(filePath, renderData({ filePath }), { async: true });
    },

    // Tweak sketch indexes on build
    async transform({ id, srcPath, contents, isDev, fileExt }) {
      if (fileExt === ".html" && srcPath.startsWith(sketchesRoot)) {
        const $ = cheerio.load(contents);
        const siteRootPath = path.relative(srcPath, sketchesRoot);
        $("head").append(`
          <link rel="stylesheet" href="${siteRootPath}/sketch.css">
          <script src="${siteRootPath}/lib/sketch.js" defer type="module"></script>
          <link rel="top" href="${siteRootPath}/index.html" />
        `);
        return $.html();
      }
    },
  };
};
