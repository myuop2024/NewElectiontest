const testProgram = {
  title: "Basic Observer Training",
  description: "Essential training for all electoral observers covering fundamental procedures and responsibilities",
  role: "Observer", // Mapped from targetRole as per prompt for the object
  passingScore: 80,
  isActive: true,
  modules: [
    {
      title: "Introduction to Electoral Observation",
      description: "Overview of the electoral process and observer role",
      content: "Electoral observation is a fundamental component of democratic governance...",
      duration: 30,
      isRequired: true,
      type: 'standard', // Added default based on previous subtask's findings
      status: 'draft'   // Added default
    },
    {
      title: "Polling Station Procedures",
      description: "Understanding polling station setup, voting process, and closing procedures",
      content: "Polling stations must be set up according to specific guidelines...",
      duration: 45,
      isRequired: true,
      type: 'standard',
      status: 'draft'
    },
    {
      title: "Incident Reporting",
      description: "How to identify, document, and report electoral irregularities",
      content: "Observers must be trained to identify various types of irregularities...",
      duration: 20,
      isRequired: true,
      type: 'standard',
      status: 'draft'
    },
    {
      title: "Code of Conduct",
      description: "Ethical guidelines and professional conduct for observers",
      content: "Electoral observers must maintain strict neutrality...",
      duration: 15,
      isRequired: true,
      type: 'standard',
      status: 'draft'
    }
  ]
};

async function runTest() {
  console.log("Attempting to create predefined program...");
  let response; // Define response here to access it in catch block if needed
  try {
    // Assuming the server is running on localhost:3000 (default for dev server)
    // IMPORTANT: This endpoint requires authentication.
    // This script does not include a real token.
    // A 401 Unauthorized error is expected if a valid token is not provided.
    response = await fetch('http://localhost:3000/api/training/programs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_VALID_TOKEN_HERE'
      },
      body: JSON.stringify(testProgram)
    });

    console.log(`Response Status: ${response.status}`);
    const responseBodyText = await response.text(); // Get body text for all responses

    if (response.status === 201) {
      try {
        const responseData = JSON.parse(responseBodyText);
        console.log("Program created successfully. Response data:");
        console.log(JSON.stringify(responseData, null, 2));
        if (responseData.id) {
          console.log(`Test Result: SUCCESS - Program created with ID: ${responseData.id}`);
        } else {
          console.log("Test Result: FAILED - Program created but no ID in response.");
        }
      } catch (e) {
        console.error("Test Result: FAILED - Could not parse JSON response from 201 status. Body:", responseBodyText);
      }
    } else {
      console.error(`Test Result: FAILED - Error creating program. Status: ${response.status}, Body: ${responseBodyText}`);
    }
  } catch (error) {
    console.error("Test Result: FAILED - Exception during fetch operation:", error);
    if (response) { // If response object exists, log status and text again
      console.error(`Response status at exception: ${response.status}`);
      try {
        const body = await response.text();
        console.error(`Response body at exception: ${body}`);
      } catch(e) {
        console.error(`Could not get response body at exception: ${e.message}`);
      }
    }
  }
}

runTest();
