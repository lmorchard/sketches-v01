import iro from "@jaames/iro";

const NUM_COLORS = 8;

async function main() {
  const initialColors = [];
  for (let idx = 0; idx < 360; idx += 360 / NUM_COLORS) {
    initialColors.push(`hsl(${idx}, 100%, 50%)`);
  }

  // Create a new color picker instance
  // https://iro.js.org/guide.html#getting-started
  const colorPicker = new iro.ColorPicker(".colorPicker", {
    // color picker options
    // Option guide: https://iro.js.org/guide.html#color-picker-options
    width: 260,
    colors: initialColors,

    handleRadius: 9,
    borderWidth: 1,
    borderColor: "#fff",
    layout: [
      {
        component: iro.ui.Wheel,
        options: {},
      },
      {
        component: iro.ui.Slider,
        options: {
          // can also be 'saturation', 'value', 'red', 'green', 'blue', 'alpha' or 'kelvin'
          sliderType: "saturation",
        },
      },
    ],
  });

  const colorList = document.getElementById("colorList");
  const activeColor = document.getElementById("activeColor");

  function setColor(colorIndex) {
    // setActiveColor expects the color index!
    colorPicker.setActiveColor(colorIndex);
  }
  window.setColor = setColor;

  // https://iro.js.org/guide.html#color-picker-events
  colorPicker.on(["mount", "color:change"], function () {
    colorList.innerHTML = "";
    colorPicker.colors.forEach((color) => {
      const { index, hsla, hexString } = color;
      colorList.innerHTML += `
      <li onClick="setColor(${index})">
        <div class="swatch" style="background: ${hexString}"></div>
        <span class="value">${index}: ${JSON.stringify(hsla)}</span>
      </li>
    `;
    });
  });

  colorPicker.on(["mount", "color:setActive", "color:change"], function () {
    // colorPicker.color is always the active color
    const { index, hsla, hexString } = colorPicker.color;
    activeColor.innerHTML = `
      <div class="swatch" style="background: ${hexString}"></div>
      <span class="value">${index}: ${JSON.stringify(hsla)}</span>
    `;
  });
}

main().catch(console.error);
