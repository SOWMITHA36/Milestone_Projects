document.addEventListener("DOMContentLoaded", function () {
  app.initialized().then(function (client) {
    window.client = client;
    client.events.on('app.activated', function () {
      document.getElementById('submit').addEventListener('fwClick', renderGravatar);
      document.getElementById('ticket').addEventListener('fwClick', getTicketDetails);
    });
  }, function (err) {
    console.error(err);
  });
});
async function renderGravatar() {
  try {
    const contactData = await client.data.get('contact');
    const { contact: { email } } = contactData;

    const hashedEmail = CryptoJS.MD5(email.trim().toLowerCase()).toString();
    const gravatarUrl = `https://www.gravatar.com/avatar/${hashedEmail}`;
    displayModal(gravatarUrl);
    //document.getElementById('gravatar-image').src = gravatarUrl;
  } catch (error) {
    console.error("Error fetching contact data: ", error);
  }
}
function displayModal(payload) {
  client.interface.trigger("showModal", {
    title: "Gravatar Logo",
    template: "gravatar.html",
    data: payload
  }).then(function (data) {
    console.error(data)
  }).catch(function (error) {
    console.error(error)
  });
}
async function getTicketDetails() {
  try {
    const data = await client.data.get("ticket");
    client.interface.trigger("showModal", {
      title: "Ticket Details",
      template: "tickets.html",
      data: data
    }).then(function (data) {
      console.error(data)
    }).catch(function (error) {
      console.error(error)
    });
  } catch (error) {
    console.error("Error fetching ticket data: ", error);
  }
}