// translated and rewritten version of
// https://github.com/martinseeger2002/dogcoin_ordinal_auto_inscriber/tree/main

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const mainPath = process.cwd()
const bellsAddress = 'BK2uBdKhjKpQt78QuFeJi2iGNfFM4aF5NG' 	// Address to inscribe to
const directory = path.join(mainPath, 'build/images') 		// Replace with directory to the collection
const filePrefix = 'ChibiBells' 							// Replace with collection name. The file name without the serial number
const fileExtension = 'png' 								// Replace with file extension
const start = 2156											// Enter range of files to inscribe from
const end = 2222 											// Enter range of files to inscribe to

let counter = start - 1

function runNodeCommands(start, end, directory, filePrefix, fileExtension) {
	const commands = []

	for (let i = start; i <= end; i++) {
		const fileNumber = String(i).padStart(5, '0')
		const imagePath = path.join(directory, `${filePrefix}${fileNumber}.${fileExtension}`)

		console.log(`Checking file: ${imagePath}`)

		if (!fs.existsSync(imagePath)) {
			console.log(`File not found: ${imagePath}`)
			continue
		}

		const baseFileName = path.basename(imagePath, `.${fileExtension}`)
		console.log(`Base file name: ${baseFileName}`)

		commands.push(() => mintFile(baseFileName, imagePath))
	}

	executeCommands(commands)
}

function executeCommands(commands) {
    if (commands.length === 0) return;

    const command = commands[0]; // Peek at the first command, don't shift yet

    command().then(() => {
        setTimeout(() => {
            commands.shift(); // Only shift if successful
            executeCommands(commands);
        }, 60000); // Wait 60 seconds before executing the next command
    }).catch(err => {
        console.error('Error executing command:', err);
        // On error, retry the same command after a delay
        setTimeout(() => {
            executeCommands(commands);
        }, 120000); // Wait 120 seconds before retrying the command again
    });
}

function mintFile(baseFileName, imagePath) {
	return new Promise((resolve, reject) => {
		const mintCommand = `node bellinals.js mint ${bellsAddress} ${imagePath}`
		console.log(`Inscribing ${imagePath}`)

		exec(mintCommand, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error in mint command: ${error.message}`)
				console.error(`Command: ${mintCommand}`);
				console.error(`Stdout: ${stdout}`);
				console.error(`Stderr: ${stderr}`);
				return reject(error)
			}

			//console.log('Output from mint command:')
			//console.log(stdout)

			const txidMatch = stdout.match(/txid: (\w+)/)
			if (txidMatch) {
				const txid = txidMatch[1]
				console.log('Successful mint, updating JSON file, continuing in 30 sec....')
				updateJsonFile(baseFileName, imagePath, txid)
					.then(() => {
						setTimeout(() => {
							syncWallet().then(resolve).catch(reject)
						}, 30000) // Wait 30 seconds before syncing the wallet
					})
					.catch(reject)
			} else if (stdout.includes('too long mempool')) {
				handleMempoolError(stdout).then(resolve).catch(reject)
			} else if (stdout.includes('18: bad-txns-inputs-spent')) {
				handleInputsSpentError().then(resolve).catch(reject)
			} else {
				console.log('Unknown response, stopping the loop.')
				reject(new Error('Unknown response'))
			}
		})
	})
}

function handleMempoolError(stdout) {
	return new Promise((resolve, reject) => {
		const errorType = stdout.includes('64: too-long-mempool-chain')
			? '64: too-long-mempool-chain'
			: 'txn-mempool-conflict'
		console.log(
			`Detected '${errorType}', running wallet sync and waiting 1 min before retrying...`
		)

		setTimeout(() => {
			syncWallet().then(resolve).catch(reject)
		}, 60000) // Wait 1 minutes before retrying
	})
}

function handleInputsSpentError() {
	return new Promise((resolve, reject) => {
		console.log(
			"Detected 'bad-txns-inputs-spent', refreshing UTXOs and waiting 1 min before retrying..."
		)

		setTimeout(() => {
			syncWallet().then(resolve).catch(reject)
		}, 60000) // Wait 1 minutes before retrying
	})
}

function syncWallet() {
	return new Promise((resolve, reject) => {
		const syncCommand = `node bellinals wallet sync`
		//console.log(`Running command: ${syncCommand}`)

		exec(syncCommand, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error in wallet sync command: ${error.message}`)
				console.error(`Command: ${syncCommand}`);
				console.error(`Stdout: ${stdout}`);
				console.error(`Stderr: ${stderr}`);
				return reject(error)
			}

			//console.log('Output from wallet sync command:')
			console.log(stdout)
			console.log("\nwaiting a few moments till next inscription command")
			resolve()
		})
	})
}

function updateJsonFile(baseFileName, imagePath, txid) {
	return new Promise((resolve, reject) => {
		const jsonDir = 'build'
		if (!fs.existsSync(jsonDir)) {
			fs.mkdirSync(jsonDir, { recursive: true });
		}

		const jsonFileName = path.join(jsonDir, 'inscriptions.json');
		let data = [];
		if (fs.existsSync(jsonFileName)) {
			data = JSON.parse(fs.readFileSync(jsonFileName, 'utf-8'));
		}

		const baseName = path.basename(imagePath);
		let updated = false;

		data[counter].id = txid + "i0";
		counter++
		console.log("Updated metadata", counter, "for", imagePath, "with id", txid + "i0")
		console.log("\nwaiting for wallet sync")
		fs.writeFileSync(jsonFileName, JSON.stringify(data, null, 4));
		resolve();
	})
}

runNodeCommands(start, end, directory, filePrefix, fileExtension)
