// translated and modified version of
// https://github.com/martinseeger2002/dogcoin_ordinal_auto_inscriber/blob/main/Itimized-00001-99999_File_name_convert.py


const fs = require('fs');
const path = require('path');

const mainPath = process.cwd()
const folderPath = path.join(mainPath, "build/images");  // Path to Folder
const prefix = "ChibiBells"

function renameFiles(folderPath) {
    const files = fs.readdirSync(folderPath).filter(file => fs.lstatSync(path.join(folderPath, file)).isFile());

    let startIndex = 1;

    files.forEach(fileName => {
        const fileExtension = path.extname(fileName);
        const newName = `${prefix}${String(startIndex).padStart(5, '0')}${fileExtension}`;

        const oldPath = path.join(folderPath, fileName);
        const newPath = path.join(folderPath, newName);

        fs.renameSync(oldPath, newPath);

        startIndex++;
    });

    console.log("Files renamed successfully.");
}

renameFiles(folderPath);
