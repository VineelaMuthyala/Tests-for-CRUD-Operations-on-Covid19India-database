const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const snakeCaseToCamelCase = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API 1 Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const getStatesListQuery = `
    SELECT
    *
    FROM 
    state;`;
  const statesList = await db.all(getStatesListQuery);
  response.send(statesList.map((eachState) => snakeCaseToCamelCase(eachState)));
});

//API 2 Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateDetailsQuery = `
    SELECT * FROM
    state
    WHERE state_id = ${stateId};`;
  const stateDetails = await db.get(getStateDetailsQuery);
  response.send(snakeCaseToCamelCase(stateDetails));
});

// API 3 Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const insertDistrictQuery = `
    INSERT INTO 
        district( district_name , state_id , cases , cured , active , deaths)
    VALUES(
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    );`;
  await db.run(insertDistrictQuery);
  response.send("District Successfully Added");
});

//API 4 Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM 
    district
    WHERE district_id = ${districtId};`;
  const districtDetails = await db.get(getDistrictQuery);
  response.send(snakeCaseToCamelCase(districtDetails));
});

//API 5 Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM 
    district
    WHERE district_id = ${districtId};`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

//API 6 Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictDetailsQuery = `
    UPDATE 
        district
    SET 
        district_name = '${districtName}',
        state_id = '${stateId}',
        cases = '${cases}',
        cured = '${cured}',
        active = '${active}',
        deaths = '${deaths}'
    WHERE district_id = ${districtId}; `;
  const updatedDistrictDetails = await db.run(updateDistrictDetailsQuery);
  response.send("District Details Updated");
});

// API 7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statisticsQuery = `
    SELECT 
        SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths) 
    FROM district
    WHERE state_id = ${stateId};`;
  const stats = await db.get(statisticsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

// API 8 Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT 
        state.state_name
    FROM state
    INNER JOIN district
    ON state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
  const details = await db.get(getStateNameQuery);
  response.send(snakeCaseToCamelCase(details));
});

module.exports = app;
