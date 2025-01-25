
const getData = async() => {
    const data = await fetch('https://api.energidataservice.dk/dataset/ConsumptionCoverageTransmission')
        .then(response => response.json())
    
    return data;
}

module.exports = {
  getData,
};