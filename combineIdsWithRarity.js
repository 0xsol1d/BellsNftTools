const fs = require('fs');

function combineFiles() {
  const inscriptionsData = JSON.parse(fs.readFileSync('build/inscriptions.json', 'utf8'));
  const rarityData = JSON.parse(fs.readFileSync('build/rarity.json', 'utf8'));

  const idMapping = {};
  inscriptionsData.forEach(entry => {
    const name = entry.meta.name;
    idMapping[name] = entry.id;
  });

  rarityData.nfts.forEach(nft => {
    const name = nft.name;
    if (idMapping[name]) {
      nft.id = idMapping[name];
    }
  });

  fs.writeFileSync('build/updated_rarity.json', JSON.stringify(rarityData, null, 2), 'utf8');
  console.log('Daten erfolgreich kombiniert und in updated_rarity.json gespeichert.');
}

combineFiles();
