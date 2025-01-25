
const getDataButton = document.querySelector('#download');
getDataButton.addEventListener('click', () => {
  getData();
});

/*
ConnectedArea:"DK1"
HourDK:"2024-09-23T01:00:00"
HourUTC:"2024-09-22T23:00:00"
PriceArea:"DK1"
ShareMWh:468.947889
SharePPM:147651
Updated:"2024-10-03T00:00:00"
ViaArea: "DK1"
*/
function getData() {
    $.ajax({
      type: 'POST',
      url: '/api/ConsumptionCoverageTransmission',
      success: OnSuccessTransmissionData, 
      error: function(error) {
        // Handle error
        alert('An error occurred while processing your request.');
        // Re-enable the submit button
        $('button[type="submit"]').prop('disabled', false).text('Submit');
      }
    });

}
function OnSuccessTransmissionData(response){
  const records = response.records;
  const hours = records.map(record => record.HourDK);
  const sharePPM = records.map(record => record.SharePPM);
  const shareMWh = records.map(record => record.ShareMWh);

    // Chart.js configuration
  const ctx = document.getElementById('myChart').getContext('2d');
  const myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'SharePPM',
          data: sharePPM,
          borderColor: 'blue',
          yAxisID: 'yLeft',
          fill: false
        },
        {
          label: 'ShareMWh',
          data: shareMWh,
          borderColor: 'red',
          yAxisID: 'yRight',
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Hour'
          }
        },
        yLeft: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'SharePPM'
          }
        },
        yRight: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'ShareMWh'
          },
          grid: {
            drawOnChartArea: false // Keeps grid lines from overlapping
          }
        }
      }
    }
  });
}


