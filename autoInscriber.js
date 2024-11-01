// translated and rewritten version of
// https://github.com/martinseeger2002/dogcoin_ordinal_auto_inscriber/tree/main

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const mainPath = process.cwd();
const bellsAddress = "B6CV1RTyCgivPVkDZBApW9EuXfb5efHuxX"; // Address to inscribe to
const directory = path.join(mainPath, "build/webp"); // Replace with directory to the collection
const filePrefix = "Bellooors"; // Replace with collection name. The file name without the serial number
const fileExtension = "webp"; // Replace with file extension
const start = 6; // Enter range of files to inscribe from
const end = 8888; // Enter range of files to inscribe to

let counter = start - 1;
let txidMatch = "";
let isPending = false;
let imgPath = "";
const commands = [];

function runNodeCommands(start, end, directory, filePrefix, fileExtension) {
  for (let i = start; i <= end; i++) {
    const fileNumber = String(i).padStart(5, "0");
    const imagePath = path.join(
      directory,
      `${filePrefix}${fileNumber}.${fileExtension}`
    );

    if (!fs.existsSync(imagePath)) {
      console.log(`File not found: ${imagePath}`);
      continue;
    }

    const baseFileName = path.basename(imagePath, `.${fileExtension}`);

    commands.push(() => mintFile(baseFileName, imagePath));
  }
  executeCommands(commands);
}

function executeCommands(commands) {
  if (commands.length === 0) return;

  const command = commands[0];

  command()
    .then(() => {
      setTimeout(() => {
        commands.shift(); // Only shift if successful
        syncWallet()
          .then(() => {
            executeCommands(commands);
          })
          .catch((err) => {
            console.error("Error syncing wallet:", err);
            executeCommands(commands);
          });
      }, 60000); // Wait 60 seconds before executing the next command
    })
    .catch((err) => {
      // On error, retry the same command after a delay
      setTimeout(() => {
        syncWallet()
          .then(() => {
            executeCommands(commands);
          })
          .catch((err) => {
            console.error("Error syncing wallet:", err);
            executeCommands(commands);
          });
      }, 60000); // Wait 60 seconds before retrying the command again
    });
}

function mintFile(baseFileName, imagePath) {
  return new Promise((resolve, reject) => {
    const mintCommand = `node bellinals.js mint ${bellsAddress} ${imagePath}`;
    console.log(`Inscribing ${imagePath}`);
    imgPath = imagePath;

    exec(mintCommand, (error, stdout, stderr) => {
      console.log(stdout);
      console.log(stderr);
      if (error) {
        if (
          stdout.match("Transaction already in block chain") ||
          stdout.match("bad-txns-inputs-missingorspent") ||
          stderr.match("Cannot read properties of undefined")
        ) {
          fs.unlinkSync("pending-txs.json");
          console.log("Retrying " + (counter + 1) + " after a few moments...");
          return reject(error);
        }
        console.error(`Error in mint command: ${error.message}`);
        if (!isPending) {
          txidMatch = stdout.match(/txid: (\w+)/);
          isPending = true;
        }

        return reject(error);
      }

      if (!isPending) {
        txidMatch = stdout.match(/txid: (\w+)/);
      }

      if (txidMatch) {
        const txid = txidMatch[1];
        console.log(
          "Successful mint, updating JSON file, continuing in 60 sec...."
        );
        isPending = false;
        if (!fs.existsSync("pending-txs.json")) {
          updateJsonFile(imgPath, txid).then(resolve).catch(reject);
        } else {
          fs.unlinkSync("pending-txs.json");
          console.log("Error with pending-txs.json");
          console.log("Retrying " + (counter + 1) + " after a few moments...");
          return reject(
            new Error("Error with pending-txs.json, retrying " + (counter + 1))
          );
        }
      } else if (stderr.match("Cannot read properties of undefined")) {
        fs.unlinkSync("pending-txs.json");
        console.log("Retrying " + (counter + 1) + " after a few moments...");
        isPending = false;
        return reject(error);
      } else {
        console.log("Unknown response, stopping the loop.");
        reject(new Error("Unknown response"));
      }
    });
  });
}

function syncWallet() {
  return new Promise((resolve, reject) => {
    const syncCommand = `node bellinals wallet sync`;

    exec(syncCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error in wallet sync command: ${error.message}`);
        console.error(`Command: ${syncCommand}`);
        console.error(`Stdout: ${stdout}`);
        console.error(`Stderr: ${stderr}`);
        return reject(error);
      }
      console.log(`${stdout}`);
      if (stdout.match("inscription complete continue to next file.")) {
        const txid = txidMatch[1];
        isPending = false;
        if (!fs.existsSync("pending-txs.json")) {
          updateJsonFile(imgPath, txid)
            .then(() => {
              commands.shift();
              resolve();
            })
            .catch((err) => {
              console.error(`Error updating JSON file: ${err.message}`);
              return reject(err); 
            });
        } else {
          return reject(
            new Error("Error with pending-txs.json, retrying " + (counter + 1))
          );
        }
      } else {
        resolve();
      }
    });
  });
}

function updateJsonFile(imagePath, txid) {
  return new Promise((resolve, reject) => {
    const jsonDir = "build";
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    const jsonFileName = path.join(jsonDir, "inscriptions.json");
    let data = [];
    if (fs.existsSync(jsonFileName)) {
      data = JSON.parse(fs.readFileSync(jsonFileName, "utf-8"));
    }

    data[counter].id = txid + "i0";
    counter++;
    console.log(
      "Updated metadata",
      counter,
      "for",
      imagePath,
      "with id",
      txid + "i0"
    );
    fs.writeFileSync(jsonFileName, JSON.stringify(data, null, 4));
    resolve();
  });
}

runNodeCommands(start, end, directory, filePrefix, fileExtension);
