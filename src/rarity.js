//IMPORTS
const fs = require("fs");

const CreateRarity = () => {
    //VARs
    const result = "./build/rarity.json"
    const metadata = fs.readFileSync("./build/inscriptions.json")
    const MetaData = JSON.parse(metadata)

    var content = {
        traitOccurence: [],
        traitScore: [],
        nfts: [],    //SORTED ASCENDING by POINTS RANK
        edition: []
    }

    //traits-related VARs
    var data = {}
    var types = []
    var values = []

    //HELPER FUNCTIONS
    function GetSortOrder(prop) {
        return function (a, b) {
            if (a[prop] < b[prop]) {
                return 1;
            } else if (a[prop] > b[prop]) {
                return -1;
            }
            return 0;
        }
    }

    //=======
    //=LOGIC=
    //=======

    //CATCHING ALL TYPES AND VALUES OF ATTRIBUTES
    MetaData.forEach((element) => {
        for (let i = 0; i < element.meta.attributes.length; i++) {
            if (!types.includes(element.meta.attributes[i].trait_type)) {
                types.push(element.meta.attributes[i].trait_type)
            }

            if (!values.includes(element.meta.attributes[i].value)) {
                values.push(element.meta.attributes[i].value)
            }
        }
    })

    //THEN FETCH TRAITS AND ADD 1 TO THE VALUE IN THE DATA STRUCTURE AT APPERANCE
    MetaData.forEach((element) => {
        for (let i = 0; i < element.meta.attributes.length; i++) {
            data[element.meta.attributes[i].trait_type] = { ...data[element.meta.attributes[i].trait_type], [element.meta.attributes[i].value]: 0 }
        }
    })

    //COUNT TRAITS...
    MetaData.forEach((element) => {
        for (let i = 0; i < element.meta.attributes.length; i++) {
            var count = data[element.meta.attributes[i].trait_type][element.meta.attributes[i].value] + 1
            data[element.meta.attributes[i].trait_type] = { ...data[element.meta.attributes[i].trait_type], [element.meta.attributes[i].value]: count }
        }
        count++
    })

    types.forEach((element) => {
        const sorted = Object.entries(data[element])
            .sort(([, v1], [, v2]) => v2 - v1)
            .reduce((obj, [k, v]) => ({
                ...obj,
                [k]: v
            }), {})
        data[element] = sorted
    })
    content.traitOccurence.push({ ...data })

    // ...AND SCORE PER OCCURENCE
    types.forEach((element) => {
        var keys = Object.keys(data[element]);
        var v = Object.values(data[element]);

        for (let i = 0; i < keys.length; i++) {
            var points = ((MetaData.length / v[i]) * 100).toFixed(0)
            data[element] = { ...data[element], [keys[i]]: points }
        }
    })
    content.traitScore.push(data)

    //SCAN METADATA, FETCH SINGLE NFTS, RATE THEM BY TRAIT SCORE...
    var count = 0;
    MetaData.forEach((element) => {
        var score = 0
        for (let i = 0; i < element.meta.attributes.length; i++) {
            score = score + Number(data[element.meta.attributes[i].trait_type][element.meta.attributes[i].value])
        }
        count = count + 1
        content.nfts.push({
            "Rank": "", "name": element.meta.name, "score": score, "id": element.id,
        })
    })

    //...SORT THEM BY SCORE
    content.nfts.sort(GetSortOrder("score"));    

    //...AND RANK THEM
    var rank = 1
    content.nfts.forEach((element) => {
        element.rank = rank
        rank++
    })

    //WRITE RESULTS TO JSON FILE
    fs.writeFile(result, JSON.stringify(content, null, 4), function (err) {
        if (err) throw err;
        console.log("...done")
    })
}

module.exports = { CreateRarity };