const GIFEncoder = require("gif-encoder-2");
const { createCanvas, Image } = require("canvas");
const {
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  rmSync,
} = require("fs");
const path = require("path");
const ProgressBar = require("progress");

const folder = "./build/";
const imageFolder = "sheets/";
const output = "gifs/";

const makeGif = async (frames, delay, size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  console.log("");
  console.log("CREATING GIFS");
  try {
    if (existsSync(folder + output)) {
      rmSync(folder + output, { recursive: true });
    }
    mkdirSync(folder + output);
  } catch (err) {
    console.log(err);
  }

  const files = readdirSync(folder + imageFolder);
  let f = 0;
  var bar = new ProgressBar(
    "╢:bar╟ :current/:total files - :percent - :elapseds/:etas",
    {
      incomplete: "░",
      complete: "█",
      total: files.length,
    }
  );

  for (const file of files) {
    bar.tick();
    let img = new Image();
    img.onload = () => {};
    img.src = folder + imageFolder + file;

    const encoder = new GIFEncoder(size, size);
    encoder.setDelay(delay);
    encoder.start();

    for (let i = 0; i < frames; i++) {
      ctx.drawImage(img, size * i, 0, size, size, 0, 0, size, size);
      encoder.addFrame(ctx);
    }

    encoder.finish();

    const buffer = encoder.out.getData();
    writeFileSync(
      path.join("./build/", output, file.replace(".png", "") + ".gif"),
      encoder.out.getData(),
      (error) => {
        error && console.log(error);
      }
    );
    f++;
  }
};

module.exports = { makeGif };
