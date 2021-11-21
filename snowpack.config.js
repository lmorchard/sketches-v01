/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: { url: "/" },
  },
  exclude: [],
  plugins: [
    ["./plugins/sketches-index-snowpack-plugin.js"],
    [
      "@emily-curry/snowpack-plugin-wasm-pack",
      {
        projectPath: "./src-wasm/noise-generator",
        outName: "index-no-modules",
        target: "no-modules",
      },
    ],
    [
      "snowpack-plugin-wasm-pack",
      { projectPath: "./src-wasm/noise-generator" },
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
