const handleResponse = require('./lib/handle-response');
const axios = require("axios");


exports = {
  onTicketCreateHandler: async function (payload) {
    console.log('Received event:', JSON.stringify(payload, null, 2));

    const incidentDetails = payload.data.ticket;
    ticketDetails = {
      freshserviceTicketId: incidentDetails.id,
      email: payload.data.requester.email,
      subject: incidentDetails.subject,
      description: incidentDetails.description
    }
    console.log(ticketDetails);
    try {
      const response = await axios({
        method: 'post',
        url: `http://localhost:3000/ticketdetails`,
        headers: {
          "Content-Type": "application/json"
        },
        data: ticketDetails
      });

      console.log("Response Data: ", response);

      const { data = {} } = response;
      //console.log(`API SUCCESS`, response.data);
      renderData(null, {
        status: true,
        response: data,
      });
      return response
    } catch (err) {
      const { response: { data = {}, status = 500 } = {} } = err;
      console.error("API error status: ", status);
      console.error("API error data: ", data);
      renderData(null, {
        status: false,
        response: data,
      });
      return err;
    }

  }
};