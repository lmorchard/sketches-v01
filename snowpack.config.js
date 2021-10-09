// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration
const path = require("path");
const fs = require("fs");
const glob = require("glob");

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  root: "src",
  mount: {},
  plugins: [
    [
      "snowpack-plugin-ejs",
      {
        renderOptions: {
          async: true,
        },
        // Behold my primitive static site generator shoehorned into snowpack
        renderData: ({ filePath }) => {
          const sketchesPath = path.join(path.dirname(filePath), "sketches");
          const sketches = glob
            .sync(`${sketchesPath}/**/index.html`)
            .map((sketchPath) => ({
              path: sketchPath.replace(`${path.dirname(filePath)}/`, ""),
              // TODO: Maybe scrape a name & description from the HTML file
              // TODO: Maybe use directories to come up with separate sections
              name: sketchPath
                .replace(`${sketchesPath}/`, "")
                .split("/")
                .slice(0, -1)
                .join(" / "),
            }));
          return { sketches };
        },
      },
    ],
    // TODO https://www.npmjs.com/package/snowpack-plugin-assets
    // ["snowpack-plugin-assets", { assets: { from: [], to: "" } }],
    ["snowpack-plugin-hash"],
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
