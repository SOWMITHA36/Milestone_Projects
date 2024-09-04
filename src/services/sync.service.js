const { getOrCreateCollection, getValueFromCollection } = require("../utils/db");
const { env, domain, apikey } = require('../config/env');
const axios = require("axios");
const cron = require("cron");

const createConfig = async function (config) {
    try {
        console.log("configs", config);
        const { type = null, data = {} } = config;
        const collection = await getOrCreateCollection("configs");
        console.log(`collection: ${collection}`);
        var id = config.freshserviceTicketId
        var email = config.email
        var subject = config.subject
        var description = config.description
        var status = 2
        var priority = 1


        var ticket = {
            "id": id,
            "email": email,
            "subject": subject,
            "description": description,
            "status": status,
            "priority": priority
        }
        const existingTicket = await collection.findOne({ id: ticket.id });
        if (!existingTicket) {
            const result = await collection.insertOne(ticket, (err, collection) => {
                if (err) {
                    throw err;
                }
                console.log("Record Inserted Succesfully")
            });
            console.log("Ticket Details Inserted");
        }
        else {
            console.log("Dublicate Ticket cannot be inserted");
        }
        return {
            message: "Configs saved successfully.",
            data: ticket
        }
    } catch (error) {
        console.log(`error: ${error}`);
        return {
            message: "Error storing configs, please try again.",
            error: error
        }
    }
}
const postConfig = async function (config) {
    try {
        const details = await getValueFromCollection("configs");
        for (const ticket of details) {
            const freshdeskDomain = domain; 
            const freshdeskApiKey = apikey;
      
            try {
              const freshdeskTicket = await createFreshdeskTicket(freshdeskDomain, freshdeskApiKey, ticket);
              console.log('Freshdesk ticket created:', freshdeskTicket);
      
              
              await Ticket.deleteOne({ _id: ticket._id });
            } catch (error) {
              console.error('Error creating Freshdesk ticket:', error);
              
            }
        }
    }catch (error) {
        console.log(`error: ${error}`);
        return {
            message: "Error posting configs, please try again.",
            error: error
        }
    }
}
const createFreshdeskTicket = async function (domain, apiKey, ticketDetails) {
    const url = `https://${domain}.freshdesk.com/api/v2/tickets`;
  
    const data = {
      email: ticketDetails.email,
      subject: ticketDetails.subject,
      description: ticketDetails.description,
      status: ticketDetails.status, 
      priority: ticketDetails.priority
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
      
      new cron.CronJob('*/1 * * * *', postConfig, null, true, 'America/New_York');
  
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }
  initialize();
module.exports = {
    createConfig,
    postConfig
}