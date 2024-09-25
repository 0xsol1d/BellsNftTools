const path = require("path")
const isLocal = typeof process.pkg === "undefined"
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath)
const { startCreating, onlyGif } = require(path.join(basePath, "/src/main.js"))
const { CreateRarity } = require(path.join(basePath, "/src/rarity.js"))

const command = process.argv.length > 2 ? process.argv[2].toLowerCase() : false
const frames = process.argv.length > 2 ? process.argv[3] : 8
const delay = process.argv.length > 2 ? process.argv[4] : 500

if (process.argv.length > 2) {
  if (command == "--gif")
    startCreating(command == "--gif" ? true : false, frames, delay)
  else if (command == "--onlygif")
    onlyGif(frames, delay)
  else if (command == "--onlyrarity")
    CreateRarity()
}
else {
  startCreating(command, frames, delay)
}