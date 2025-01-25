
$(document).ready(function() {
  $('#prompt-form').on('submit', function(event) {
    event.preventDefault();

    // Disable the submit button to prevent multiple submissions
    $('button[type="submit"]').prop('disabled', true).text('Loading...');

    const promptData = {
      prompt: $('#prompt').val()
    };

    $.ajax({
      type: 'POST',
      url: '/api/prompt',
      data: JSON.stringify(promptData),
      contentType: 'application/json',
      success: function(response) {
        // Update the div
        $('#response-container').html(`
          <h2>Response:</h2>
          <div>${response}</div>
        `);
        // Re-enable the submit button
        $('button[type="submit"]').prop('disabled', false).text('Submit');
      },
      error: function(error) {
        // Handle error
        alert('An error occurred while processing your request.');
        // Re-enable the submit button
        $('button[type="submit"]').prop('disabled', false).text('Submit');
      }
    });

  
  });
});