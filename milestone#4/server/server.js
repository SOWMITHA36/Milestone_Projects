const handleResponse = require('./handle-response');
function base64Encode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let encoded = '';
  let c1, c2, c3;
  let i = 0;

  while (i < str.length) {
    c1 = str.charCodeAt(i++);
    c2 = str.charCodeAt(i++);
    c3 = str.charCodeAt(i++);

    encoded += chars.charAt(c1 >> 2);
    encoded += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
    if (isNaN(c2)) {
      encoded += '==';
    } else {
      encoded += chars.charAt(((c2 & 15) << 2) | (c3 >> 6));
      encoded += isNaN(c3) ? '=' : chars.charAt(c3 & 63);
    }
  }

  return encoded;
}
exports = {
  events: [
    { event: "onTicketCreate", callback: "onTicketCreateHandler" }
  ],

  onTicketCreateHandler: function(args) {
    console.log("Incident Created:", args.data);

    console.log("Incident Data:", JSON.stringify(args.data, null, 2));
    
    let incidentData = args.data.ticket;
    let requesterData = args.data.requester;
    let ticketData = {
      description: incidentData.description_text ? String(incidentData.description_text) : 'Default description',
      subject: incidentData.subject ? String(incidentData.subject) : 'Default subject',
      email: requesterData.email ? String(requesterData.email) : '',
      priority: incidentData.priority ? parseInt(incidentData.priority, 10) : 1,
      status: 2  
    };
    console.log("Prepared Ticket Data:", ticketData);
    
    let freshdeskDomain = "effy-opinyin"; 
    let freshdeskApiKey = "iNcI4WtlCHjWU9sAfE"; 

    
    let options = {
      method: 'POST',
      headers: {
        "Authorization": "Basic " + base64Encode(freshdeskApiKey + ":X"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ticketData)
    };

    
    fetch(`https://${freshdeskDomain}.freshdesk.com/api/v2/tickets`, options)
      .then(response => response.json())
      .then(data => {
        console.log("Ticket created in Freshdesk:", data);
        handleResponse.handleFreshdeskResponse(data);
      })
      .catch(error => {
        console.error("Error creating ticket in Freshdesk:", error);
        handleResponse.handleError(error);
      });
  }
};
