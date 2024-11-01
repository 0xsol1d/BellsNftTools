const fs = require("fs");
const axios = require("axios");
const ProgressBar = require("progress");

const inscriptionsFile = "build/inscriptions.json";
const validationsFile = "build/validations.json";
const holdingsFile = "build/holdings.json";
const providedOwner = "BK2uBdKhjKpQt78QuFeJi2iGNfFM4aF5NG";
const delayBetweenRequests = 1000;

const readInscriptions = () => {
  return JSON.parse(fs.readFileSync(inscriptionsFile, "utf-8"));
};

const writeValidations = (data) => {
  fs.writeFileSync(validationsFile, JSON.stringify(data, null, 2), "utf-8");
};

const writeHoldings = (data) => {
  fs.writeFileSync(holdingsFile, JSON.stringify(data, null, 2), "utf-8");
};

const fetchOwnerInfo = async (id) => {
  try {
    const response = await axios.get(         
      `https://api.nintondo.io/api/location/${id}`   //https://content.nintondo.io/api/pub/${id}/info
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { notFound: true };
    }
    throw new Error(`Error fetching data for ID ${id}`);
  }
};

const fetchOwnerInscriptions = async (account, page) => {
  const response = await axios.get(
    `https://content.nintondo.io/api/pub/search?page_size=60&page=${page}&account=${account}`
  );
  return response.data;
};

const processInscriptions = async () => {
  const inscriptions = readInscriptions();
  const validations = [];
  const holdings = [];

  const barValidations = new ProgressBar(
    "Validating inscriptions ╢:bar╟ :percent - :current/:total editions - :elapseds/:etas",
    {
      incomplete: "░",
      complete: "█",
      total: inscriptions.length,
      width: 40,
    }
  );

  for (const inscription of inscriptions) {
    const { id, edition } = inscription;
    if (!id) {
      validations.push({
        edition: edition,
        validation: "no inscription found",
      });
      barValidations.tick();
      continue;
    }

    try {
      const ownerInfo = await fetchOwnerInfo(id);
      if (ownerInfo.notFound) {
        validations.push({
          id: id,
          edition: edition,
          validation: "not found",
        });
      } else {
        const validation = {
          id: id,
          edition: edition,
          owner: ownerInfo.owner,
          validation: ownerInfo.owner === providedOwner ? "true" : "false",
        };
        validations.push(validation);
      }
    } catch (error) {
      console.error(`Error processing ID ${id}:`, error);
    }

    barValidations.tick();
  }

  writeValidations(validations);

  const trueCount = validations.filter((v) => v.validation === "true").length;
  const falseCount = validations.filter((v) => v.validation === "false").length;
  const noInscriptionCount = validations.filter(
    (v) => v.validation === "no inscription found"
  ).length;
  const notFoundCount = validations.filter(
    (v) => v.validation === "not found"
  ).length;

  console.log(`Validations summary:`);
  console.log(`True: ${trueCount}`);
  console.log(`False: ${falseCount}`);
  console.log(`No inscription found: ${noInscriptionCount}`);
  console.log(`Not found: ${notFoundCount}`);

  const barHoldings = new ProgressBar(
    "Checking holdings ╢:bar╟ :percent - :current/:total pages - :elapseds/:etas",
    {
      incomplete: "░",
      complete: "█",
      total: 0,
      width: 40,
    }
  );

  let page = 1;
  let totalPages = 1;

  do {
    const apiData = await fetchOwnerInscriptions(providedOwner, page);
    totalPages = apiData.pages;

    barHoldings.total = totalPages;
    barHoldings.tick();

    apiData.inscriptions.forEach((inscription) => {
      holdings.push({
        id: inscription.id,
        number: inscription.number,
        found: inscriptions.some((i) => i.id === inscription.id) ? "true" : "false",
      });
    });

    page++;
    await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
  } while (page <= totalPages);

  writeHoldings(holdings);

  const foundCount = holdings.filter((h) => h.found === "true").length;
  const notFoundCountHoldings = holdings.filter((h) => h.found === "false").length;

  console.log(`Holdings summary:`);
  console.log(`Found: ${foundCount}`);
  console.log(`Not Found: ${notFoundCountHoldings}`);
};

processInscriptions();
