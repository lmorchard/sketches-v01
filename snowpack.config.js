// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration
const path = require("path");
const fs = require("fs");
const glob = require("glob");

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
              // TODO: scrape name & description from the HTML file
              // TODO: use directories to come up with separate sections
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
    [
      "snowpack-plugin-wasm-pack",
      { projectPath: "./src-wasm/wasm_play" },
    ],
    /*
    [
      "snowpack-plugin-wasm-pack",
      { projectPath: "../src-wasm/perlin", outDir: "../../src/wasm/perlin" },
    ],
    */
    // TODO https://www.npmjs.com/package/snowpack-plugin-assets
    // ["snowpack-plugin-assets", { assets: { from: [], to: "" } }],
    // ["snowpack-plugin-hash"],
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
