var fs = require('fs');
const axios = require('axios');
var express = require("express");
var bodyParser = require("body-parser");
const cron = require('cron');
var fs = require('fs');
const handleResponse = require('./lib/handle-response');

const app = express()
const port = 3000;
const TICKETS_FILE = path.join('Macs-MacBook-Air effyservice', 'tickets.json');

// Ensure the tickets file exists
if (!fs.existsSync(TICKETS_FILE)) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify([]));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to read tickets from the file
const readTicketsFromFile = () => {
  const data = fs.readFileSync(TICKETS_FILE, 'utf8');
  return JSON.parse(data);
};

// Helper function to write tickets to the file
const writeTicketsToFile = (tickets) => {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
};

exports = {
  onTicketCreateHandler: async function (payload) {
    console.log('Received event:', JSON.stringify(payload, null, 2));


    const incidentDetails = payload.data.ticket;

    const ticketDetails = {
      freshserviceTicketId: incidentDetails.id,
      email: payload.data.requester.email,
      subject: incidentDetails.subject,
      description: incidentDetails.description
    };

    try {
      const tickets = readTicketsFromFile();
      const existingTicket = tickets.find(ticket => ticket.freshserviceTicketId === incidentDetails.id);

      if (!existingTicket) {
        // Store new ticket
        tickets.push(ticketDetails);
        writeTicketsToFile(tickets);
        console.log('Ticket stored in file:', ticketDetails);
      } else {
        console.log('Duplicate ticket ignored');
      }
    } catch (error) {
      console.error('Error processing ticket:', error);
    }
  }
};

async function pushTicketsToFreshdesk() {
  try {
    const tickets = readTicketsFromFile();
    for (const ticket of tickets) {
      try {
        const freshdeskDomain = payload.iparams.domainName;
        const freshdeskApiKey = payload.iparams.apiKey;
        const freshdeskTicket = await createFreshdeskTicket(freshdeskDomain, freshdeskApiKey, ticket);
        console.log('Freshdesk ticket created:', freshdeskTicket);
        const updatedTickets = tickets.filter(t => t.freshserviceTicketId !== ticket.freshserviceTicketId);
        writeTicketsToFile(updatedTickets);
      } catch (error) {
        console.error('Failed to create Freshdesk ticket:', error);
      }
    }
  } catch (error) {
    console.error('Error fetching tickets from MongoDB:', error);
  }
}

async function createFreshdeskTicket(domain, apiKey, ticketDetails) {
  const url = `https://${domain}.freshdesk.com/api/v2/tickets`;

  const data = {
    email: ticketDetails.requester.email,
    subject: ticketDetails.subject,
    description: ticketDetails.description,
    status: 2,
    priority: 1
  };

  const auth = Buffer.from(`${apiKey}:X`).toString('base64');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${auth}`
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating Freshdesk ticket:', error);
    throw new Error('Failed to create Freshdesk ticket');
  }
}
function initialize() {
  try {
    // Set up a cron job to run every 5 minutes
    new cron.CronJob('*/5 * * * *', pushTicketsToFreshdesk, null, true, 'America/New_York');

    // Start the Express server
    app.listen(port, () => {
      console.log(`Middleware server running on port ${port}`);
    });

  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Initialize the application
initialize();
