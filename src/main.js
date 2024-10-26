const fs = require("fs");
const path = require("path");
const ProgressBar = require("progress");
const { CreateRarity } = require("./rarity");

const isLocal = typeof process.pkg === "undefined";
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath);
const { makeGif } = require(path.join(basePath, "/src/makegif.js"));
const sha1 = require(path.join(basePath, "/node_modules/sha1"));

function randomIndex(array) {
  return Math.floor(Math.random() * array.length);
}

const {
  format,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  shuffleLayerConfigurations,
  metadata,
  firstName,
  lastName
} = require(path.join(basePath, "/src/config.js"));

const { createCanvas, loadImage } = require(path.join(
  basePath,
  "/node_modules/canvas"
));
const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");

const buildDir = path.join(basePath, "/build");
const layersDir = path.join(basePath, "/layers");
var imageDir = "/images";

var metadataList = [];
var attributesList = [];
var dnaList = new Set();
const DNA_DELIMITER = "-";

var bar = new ProgressBar("╢:bar╟ :percent - :current/:total editions - :elapseds/:etas", {
  incomplete: "░",
  complete: "█",
  total: layerConfigurations[layerConfigurations.length - 1].growEditionSizeTo,
});

const getRarityWeight = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = Number(
    nameWithoutExtension.split(rarityDelimiter).pop()
  );
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 1;
  }
  return nameWithoutWeight;
};

const cleanDna = (_str) => {
  var dna = Number(_str.split(":").shift());
  return dna;
};

const cleanName = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift();
  return nameWithoutWeight;
};

const getElements = (path) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      return {
        id: index,
        name: cleanName(i),
        filename: i,
        path: `${path}${i}`,
        weight: getRarityWeight(i),
      };
    });
};

const layersSetup = (layersOrder) => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    name:
      layerObj.options?.["displayName"] != undefined
        ? layerObj.options?.["displayName"]
        : layerObj.name,
    blend:
      layerObj.options?.["blend"] != undefined
        ? layerObj.options?.["blend"]
        : "source-over",
    opacity:
      layerObj.options?.["opacity"] != undefined
        ? layerObj.options?.["opacity"]
        : 1,
  }));
  return layers;
};

const addMetadata = (_dna, _edition, type) => {
  let dateTime = Date.now();

  const randomFirstName = firstName[randomIndex(firstName)];
  const randomLastName = lastName[randomIndex(lastName)];

  const tempMetadata = {
    id: "",
    edition: _edition,
    meta: {
      name: `${metadata.namePrefix} #${_edition}`,
      //name: `${randomFirstName} ${randomLastName}`,
      attributes: attributesList,
    },
  };
  metadataList.push(tempMetadata);
  
  attributesList = [];
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
};

const saveImage = (_editionCount) => {
  let name = "";
  name = `${buildDir}${imageDir}/${metadata.namePrefix}${String(
    _editionCount
  ).padStart(5, "0")}.png`;

  fs.writeFileSync(name, canvas.toBuffer("image/png"));
};

const loadLayerImg = async (_layer) => {
  return new Promise(async (resolve) => {
    const image = await loadImage(`${_layer.selectedElement.path}`);
    resolve({ layer: _layer, loadedImage: image });
  });
};

const drawElement = (_renderObject, _index, _layersLen) => {
  ctx.globalAlpha = _renderObject.layer.opacity;
  ctx.globalCompositeOperation = _renderObject.layer.blend;
  ctx.drawImage(_renderObject.loadedImage, 0, 0, format.width, format.height);
  addAttributes(_renderObject);
};

const constructLayerToDna = (_dna = "", _layers = []) => {
  let mappedDnaToLayers = _layers.map((layer, index) => {
    let selectedElement = layer.elements.find(
      (e) => e.id == cleanDna(_dna.split(DNA_DELIMITER)[index])
    );
    return {
      name: layer.name,
      blend: layer.blend,
      opacity: layer.opacity,
      selectedElement: selectedElement,
    };
  });
  return mappedDnaToLayers;
};

const isDnaUnique = (_DnaList = new Set(), _dna = "") => {
  return !_DnaList.has(_dna);
};

const createDna = (_layers) => {
  let randNum = [];
  _layers.forEach((layer) => {
    var totalWeight = 0;
    layer.elements.forEach((element) => {
      totalWeight += element.weight;
    });
    // number between 0 - totalWeight
    let random = Math.floor(Math.random() * totalWeight);
    for (var i = 0; i < layer.elements.length; i++) {
      // subtract the current weight from the random weight until we reach a sub zero value.
      random -= layer.elements[i].weight;
      if (random < 0) {
        return randNum.push(
          `${layer.elements[i].id}:${layer.elements[i].filename}`
        );
      }
    }
  });
  return randNum.join(DNA_DELIMITER);
};

const writeMetaData = (_data) => {
  if (shuffleLayerConfigurations)
    _data.sort((a, b) => a.edition - b.edition);
  fs.writeFileSync(`${buildDir}/inscriptions.json`, JSON.stringify(_data, null, 2));
};

const saveMetaDataSingleFile = (_editionCount) => {
  let metadataTmp
  let name;
    metadataTmp = metadataList.find((meta) => meta.edition == _editionCount);
    name = `${buildDir}/${metadata.namePrefix}${String(
      _editionCount
    ).padStart(5, "0")}.json`;
  
    fs.writeFileSync(name, JSON.stringify(metadataTmp, null, 2));

  attributesList = [];
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

const startCreating = async (makeGifs, frames, delay) => {
  if (makeGifs) console.log("CREATING SPRITE SHEETS:");
  else console.log("CREATING COLLECTION:");

  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);
  //fs.mkdirSync(path.join(buildDir, "/json"));

  if (makeGifs) imageDir = "/sheets";
  else imageDir = "/images";
  fs.mkdirSync(path.join(buildDir, imageDir));

  let layerConfigIndex = 0;
  let editionCount = 1;
  let failedCount = 0;
  let abstractedIndexes = [];

  for (
    let i = 1;
    i <= layerConfigurations[layerConfigurations.length - 1].growEditionSizeTo;
    i++
  ) {
    abstractedIndexes.push(i);
  }
  if (shuffleLayerConfigurations) {
    abstractedIndexes = shuffle(abstractedIndexes);
  }
  while (layerConfigIndex < layerConfigurations.length) {
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder
    );

    while (
      editionCount <= layerConfigurations[layerConfigIndex].growEditionSizeTo
    ) {
      let newDna = createDna(layers);
      if (isDnaUnique(dnaList, newDna)) {
        let results = constructLayerToDna(newDna, layers);
        let loadedElements = [];

        results.forEach((layer) => {
          loadedElements.push(loadLayerImg(layer));
        });

        await Promise.all(loadedElements).then((renderObjectArray) => {
          ctx.clearRect(0, 0, format.width, format.height);
          renderObjectArray.forEach((renderObject, index) => {
            drawElement(
              renderObject,
              index,
              layerConfigurations[layerConfigIndex].layersOrder.length
            );
          });
          saveImage(abstractedIndexes[0]);
          addMetadata(newDna, abstractedIndexes[0], makeGifs ? "gif" : "png");
          //saveMetaDataSingleFile(abstractedIndexes[0]);

          bar.tick();
        });

        dnaList.add(newDna);
        editionCount++;
        abstractedIndexes.shift();
      } else {
        failedCount++;
        if (failedCount >= uniqueDnaTorrance) {
          console.log(
            `You need more layers or elements to grow your edition to ${layerConfigurations[layerConfigIndex].growEditionSizeTo} artworks!`
          );
          process.exit();
        }
      }
    }
    layerConfigIndex++;
  }
  writeMetaData(metadataList);

  console.log("");
  console.log("...success");

  if (makeGifs) {
    console.log("");
    console.log("-----------------------------------------");
    makeGif(frames, delay, format.height);
  }

  CreateRarity();
};

const onlyGif = async (frames, delay) => {
  makeGif(frames, delay, format.height);
};

module.exports = { startCreating, getElements, onlyGif };
