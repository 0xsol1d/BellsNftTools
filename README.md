# Welcome to the Bellscoin NFT Tools

This Bellscoin-specific toolset for creating and inscribing an NFT collection is a bundle of modified versions of the following scripts:

- [HashLipsEngine](https://github.com/HashLips/hashlips_art_engine)
- [Bellinals](https://github.com/martinseeger2002/Bellinals)
- [Additional](https://github.com/martinseeger2002/dogcoin_ordinal_auto_inscriber)

plus some orginal content as the gif creation, the rarity calculation and the validation script.

## Installation

```sh
npm install
```

## Art generation

Create your different layers as folders in the 'layers' directory, and add all the layer assets in these directories. You can name the assets anything as long as it has a rarity weight attached in the file name like so: `example element#70.png`. You can optionally change the delimiter `#` to anything you would like to use in the variable `rarityDelimiter` in the `src/config.js` file.

Once you have all your layers, go into `src/config.js` and update the `layerConfigurations` objects `layersOrder` array to be your layer folders name in order of the back layer to the front layer.

_Example:_ If you were creating a portrait design, you might have a background, then a head, a mouth, eyes, eyewear, and then headwear, so your `layersOrder` would look something like this:

```js
const layerConfigurations = [
  {
    growEditionSizeTo: 100,
    layersOrder: [
      { name: "Head" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Eyeswear" },
      { name: "Headwear" },
    ],
  },
];
```

The `name` of each layer object represents the name of the folder (in `/layers/`) that the images reside in.

Optionally you can now add multiple different `layerConfigurations` to your collection. Each configuration can be unique and have different layer orders, use the same layers or introduce new ones. This gives the artist flexibility when it comes to fine tuning their collections to their needs.

_Example:_ If you were creating a portrait design, you might have a background, then a head, a mouth, eyes, eyewear, and then headwear and you want to create a new race or just simple re-order the layers or even introduce new layers, then you're `layerConfigurations` and `layersOrder` would look something like this:

```js
const layerConfigurations = [
  {
    // Creates up to 50 artworks
    growEditionSizeTo: 50,
    layersOrder: [
      { name: "Background" },
      { name: "Head" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Eyeswear" },
      { name: "Headwear" },
    ],
  },
  {
    // Creates an additional 100 artworks
    growEditionSizeTo: 150,
    layersOrder: [
      { name: "Background" },
      { name: "Head" },
      { name: "Eyes" },
      { name: "Mouth" },
      { name: "Eyeswear" },
      { name: "Headwear" },
      { name: "AlienHeadwear" },
    ],
  },
];
```

Update your `format` size, ie the outputted image size, and the `growEditionSizeTo` on each `layerConfigurations` object, which is the amount of variation outputted.

You can mix up the `layerConfigurations` order on how the images are saved by setting the variable `shuffleLayerConfigurations` in the `config.js` file to true. It is false by default and will save all images in numerical order.

If you want to have logs to debug and see what is happening when you generate images you can set the variable `debugLogs` in the `config.js` file to true. It is false by default, so you will only see general logs.

To use a different metadata attribute name you can add the `displayName: "Awesome Eye Color"` to the `options` object. All options are optional and can be addes on the same layer if you want to.

```js
const layerConfigurations = [
  {
    growEditionSizeTo: 5,
    layersOrder: [
      { name: "Background" },
      { name: "Eyeball" },
      {
        name: "Eye color",
        options: {
          displayName: "Awesome Eye Color",
        },
      },
      { name: "Iris" },
      { name: "Shine" },
      { name: "Bottom lid" },
      { name: "Top lid" },
    ],
  },
];
```

When you are ready, run the following command and your outputted art will be in the `build/images` directory and the json in the `build/json` directory:

```sh
npm run build
```

or

```sh
node index.js
```

The program will output all the images in the `build/images` directory along with the metadata files in the `build/json` directory. Each collection will have a `_metadata.json` file that consists of all the metadata in the collection inside the `build/json` directory. The `build/json` folder also will contain all the single json files that represent each image file. The single json file of a image will look something like this:

```json
{
        "id": "",       //this will be added while inscribing
        "edition": 1,
        "meta": {
            "name": "Shingo Bellguchi",
            "attributes": [
                {"trait_type": "Background", "value": "Dark Purple"},
                {"trait_type": "Body", "value": "Type2 violet"},
                {"trait_type": "Head", "value": "Bell2 purple"},
                {"trait_type": "Mouth", "value": "Wtf"},
                {"trait_type": "Eyes", "value": "Rekt"},
                {"trait_type": "Headwear", "value": "None"}
            ]
        }
}
```

You can also create GIFs from spritesheets, simply put the layers of the individual spritesheets into the `layer` folder as described above.
To do this, the image width must be adjusted accordingly:

```
const format = {
  width: 5120,    <== the original width mulitplied with the frame rate
  height: 640,
}
```

After this just execute the following command:

```
node index.js --gif 8 400
```

The first number describes the number of frames and the last the playback speed of the individual frames.
To create only the GIFs if, for example, an error has occurred or you notice that the playback speed is too slow/fast or the frame rate is wrong, only the GIFs can be created again:

```
node index.js --onlygif 8 200
```

To convert your GIFs into smaller WEBP files use this [convert-gif-to-webp](https://github.com/0xsol1d/convert-gif-to-webp) script.

## Inscribing the collection


Create a `.env` file with your node information:

```
NODE_RPC_URL=http://<ip>:<port>
NODE_RPC_USER=<username>
NODE_RPC_PASS=<password>
TESTNET=false       <= you can set this to true if your using a testnet node
```

Generate a new `.wallet.json` file:

```
node bellinals wallet new
```

Then send BELLS to the address displayed. Once sent, sync your wallet:

```
node bellinals wallet sync
```

If you are minting a lot, you can split up your UTXOs:

```
node bellinals wallet split <count>
```

When you are done minting, send the funds back:

```
node bellinals wallet send <address> <optional amount>
```


Then you simply have to adjust the following variables in `autoInscribe.js`:

```
const bellsAddress = '<YOUR WALLET ADDRESS>' 	              // Address to inscribe to
const directory = path.join(mainPath, 'build/images') 		  // Replace with directory to the collection
const filePrefix = 'ChibiBells' 							              // Replace with collection name. The file name without the serial number
const fileExtension = 'png' 								                // Replace with file extension
const start = 1 											                      // Enter range of files to inscribe from
const end = 2222 											                      // Enter range of files to inscribe to
```

You can then start the process as follows:

´´´
node autoInscriber.js
´´´

Now the process will run by itself and automatically add the inscription IDs to the `inscriptions.json` file. It is possible that an error occurs during the process, this usually happens when the mempool of the node is filled with transactions that have not yet been triggered, the maximum is 25 transactions. This means that  a timeout occurs and a `pending-txs.json` file is created, after 2 minutes the command is attempted to be executed again and the remaining transactions are sent to the node before the next inscription is executed. This will be the rule for files over ~30-35kb, but can also occur from time to time depending on the network load.

## Rarity

You can also carry out an additional rarity calculation:

```
node index.js --rarity
```

You will now receive a `rarity.json` file in `build` order, which determines a trait score based on the trait occurrence in the collection and then evaluates each option individually and sorts it by rank.

## Additional tools

For various reasons, two additional tools could be helpful:

- `combineIdsWithRarity.js` copies all inscription IDs from the inscription.json to the correlating fields into the rarity.json file.

- `fileRenamer.js` helps to get a folder full of files into the correct naming format for the `autoInscriber`, e.g. if the collcetion was not created with the tool.

- `getGenesis.js` helps to find the id of a certain inscription if you only have the tx id of the utxo that holds the inscription e.g. after a transfer or so.

- `validateInscriptions.js` processes inscriptions to validate ownership and check holdings against a provided account, using API calls to fetch and store results in JSON files. You just need to provide the same address as in the `autoInscriber.js` script.
