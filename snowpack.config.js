// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration
const path = require("path");
const fs = require("fs");

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
        renderData: ({ filePath }) => {
          const sketchesDirpath = path.join(path.dirname(filePath), "sketches");
          const sketches = fs
            .readdirSync(sketchesDirpath)
            .filter((subpath) =>
              fs.statSync(path.join(sketchesDirpath, subpath)).isDirectory()
            )
            .map((subPath) => ({
              name: subPath,
              path: path.join("sketches", subPath),
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
