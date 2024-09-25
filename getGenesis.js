// translated and modified version of
// https://github.com/martinseeger2002/BellscoinArcade/blob/main/simple_scripts/get_ord_genesis.py

const axios = require('axios');
const Decimal = require('decimal.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const rpcUser = process.env.NODE_RPC_USER;
const rpcPassword = process.env.NODE_RPC_PASS;
const rpcHost = process.env.NODE_RPC_URL || 'localhost';
const rpcPort = process.env.NODE_RPC_PORT || 19918;

// Initial transaction ID and output index to start processing
const txid = "44035dc9775e213b01caac570583d9e5b9455c371066c3de902a77ebcce344d8";
const outputIndex = 0;

let counter = 1; // Counter for the number of transactions processed

const outputDir = 'output'; // Directory where output files will be saved

// Function to save data to a JSON file
async function saveToJSON(data, filename) {
    // Determine the path to the output directory and the file
    const outputDir = 'output';
    const filePath = path.join(outputDir, filename);

    // Check if the output directory exists; if not, create it
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Output directory '${outputDir}' created.`);
    }

    // Write the data to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
}

// Function to make an RPC request to the Bitcoin node
async function rpcRequest(method, params = []) {
    const url = `http://${rpcHost}:${rpcPort}/`;
    const auth = {
        username: rpcUser,
        password: rpcPassword
    };

    try {
        // Make a POST request to the Bitcoin node's RPC endpoint
        const response = await axios.post(url, {
            jsonrpc: '1.0',
            id: 'curltest',
            method,
            params,
        }, {
            auth,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Check if there was an error in the RPC response
        if (response.data.error) {
            console.error(`RPC error: ${JSON.stringify(response.data.error)}`);
            throw new Error(response.data.error.message);
        }

        return response.data.result;
    } catch (e) {
        console.error(`RPC request failed: ${e.message}`);
        throw e;
    }
}

// Function to retrieve the 'scriptSig.asm' from a transaction input
async function getSigScriptAsm(txid, vout) {
    try {
        // Fetch the raw transaction data
        const prevTx = await rpcRequest('getrawtransaction', [txid, true]);
        if (!prevTx.vin[0].hasOwnProperty("coinbase")) {
            return prevTx.vin[0].scriptSig.asm; // Return the scriptSig.asm if not a coinbase transaction
        } else {
            return null; // Return null if it's a coinbase transaction
        }
    } catch (e) {
        if (e.message.includes("Index out of bounds")) {
            console.log("not an ord");
            return null; // Return null if the index is out of bounds
        }
        console.error(`An error occurred while fetching sigscript asm: ${e.message}`);
        return null;
    }
}

// Function to process a transaction and its inputs/outputs
async function processTransaction(txid, outputIndex) {
    try {
        // Fetch the raw transaction data
        const transaction = await rpcRequest('getrawtransaction', [txid, true]);
        const vins = transaction.vin; // Transaction inputs
        const vouts = transaction.vout; // Transaction outputs

        // If this is the first transaction being processed
        if (counter === 1) {
            for (const vin of vins) {
                const sigscriptAsm = await getSigScriptAsm(txid, 0); // Get the scriptSig.asm for the input
                if (sigscriptAsm && sigscriptAsm.split(' ')[0] === "6582895") { // Check if it matches the required marker
                    // Extract and process the inscription data
                    const type = Buffer.from(sigscriptAsm.split(' ')[2], 'hex').toString('utf8');
                    const inscriptionId = `${txid}i0`;

                    console.clear();
                    console.log(`Success...\n`);
                    console.log(`tx: ${txid}`);
                    console.log(`genesis: ${txid}`);
                    console.log(`inscription id: ${inscriptionId}`);
                    console.log(`Type: ${type}`);

                    let content = null;
                    if (type.includes("text/plain")) {
                        content = Buffer.from(sigscriptAsm.split(' ')[4], 'hex').toString('utf8');
                        console.log(`Content: ${content}`);
                    }

                    // Try to parse the content as JSON
                    let parsedContent = content;
                    try {
                        parsedContent = JSON.parse(content);
                    } catch (e) {
                        console.log("Content is not valid JSON");
                    }

                    // Save the inscription data to a JSON file
                    const data = {
                        tx: txid,
                        genesis: txid,
                        inscription_id: inscriptionId,
                        type: type,
                        content: parsedContent
                    };
                    saveToJSON(data, `${inscriptionId}.json`);

                    return [null, null]; // Stop processing if the inscription data is found
                }
            }
        }

        // Prepare to find the matching output based on input values
        const vinValues = [];
        const vinDetails = [];

        for (const vin of vins) {
            const prevTxOutput = await rpcRequest('getrawtransaction', [vin.txid, true]);
            if (prevTxOutput) {
                vinValues.push(prevTxOutput.vout[vin.vout].value);
                vinDetails.push([vin.txid, vin.vout]);
            } else {
                vinValues.push(new Decimal('0'));
                vinDetails.push([vin.txid, vin.vout]);
            }
        }

        // Determine which output corresponds to the given outputIndex
        const vinRemainingValues = [...vinValues];
        let chosenVoutInfo = null;

        for (let voutIndex = 0; voutIndex < vouts.length; voutIndex++) {
            let remainingValue = vouts[voutIndex].value;
            const correspondingVins = [];

            for (let vinIndex = 0; vinIndex < vinRemainingValues.length; vinIndex++) {
                if (remainingValue > 0 && vinRemainingValues[vinIndex] > 0) {
                    if (vinRemainingValues[vinIndex] >= remainingValue) {
                        vinRemainingValues[vinIndex] -= remainingValue;
                        correspondingVins.push(vinIndex);
                        remainingValue = 0;
                    } else {
                        remainingValue -= vinRemainingValues[vinIndex];
                        correspondingVins.push(vinIndex);
                        vinRemainingValues[vinIndex] = 0;
                    }
                }
            }
            if (voutIndex === outputIndex) {
                chosenVoutInfo = {
                    voutIndex,
                    value: vouts[voutIndex].value,
                    correspondingVins
                };
            }
        }

        // Process the chosen output if it matches the outputIndex
        if (chosenVoutInfo && chosenVoutInfo.correspondingVins.length > 0) {
            for (const vinIndex of chosenVoutInfo.correspondingVins) {
                const [vinTxid, voutIdx] = vinDetails[vinIndex];
                const sigscriptAsm = await getSigScriptAsm(vinTxid, voutIdx);
                if (sigscriptAsm === null) {
                    return [null, null];
                }
                if (sigscriptAsm.split(' ')[0] === "6582895") {
                    const ordGenesis = vinTxid;
                    const type = Buffer.from(sigscriptAsm.split(' ')[2], 'hex').toString('utf8');
                    const inscriptionId = `${ordGenesis}i0`;

                    //console.clear();
                    console.log(`Success after ${counter} txs...\n`);
                    console.log(`tx: ${txid}`);
                    console.log(`genesis: ${ordGenesis}`);
                    console.log(`inscription id: ${inscriptionId}`);
                    console.log(`Type: ${type}`);

                    let content = null;
                    if (type.includes("text/plain")) {
                        content = Buffer.from(sigscriptAsm.split(' ')[4], 'hex').toString('utf8');
                        console.log(`Content: ${content}`);
                    }

                    // Try to parse the content as JSON
                    let parsedContent = content;
                    try {
                        parsedContent = JSON.parse(content);
                    } catch (e) {
                        console.log("Content is not valid JSON");
                    }

                    // Save the inscription data to a JSON file
                    const data = {
                        tx: txid,
                        genesis: ordGenesis,
                        inscription_id: inscriptionId,
                        type: type,
                        content: parsedContent
                    };
                    saveToJSON(data, `${inscriptionId}.json`);
                    return [null, null];
                }
                return [vinTxid, voutIdx];
            }
        } else {
            return [null, null]; // If no matching output is found, return nulls
        }
    } catch (e) {
        console.error(`An error occurred while processing transaction: ${e.message}`);
        return [null, null];
    }
}

// Main function to start processing transactions
async function main() {
    let currentTxid = txid;
    let currentOutputIndex = outputIndex;

    while (currentTxid !== null && currentOutputIndex !== null) {
        [currentTxid, currentOutputIndex] = await processTransaction(currentTxid, currentOutputIndex);

        if (currentTxid !== null && currentOutputIndex !== null) {
            //console.clear();
            //console.log("Scanned " + counter + " tx, continue searching");
            console.log(currentTxid)
            counter++;
        }
    }
}

// Start the main function
main();