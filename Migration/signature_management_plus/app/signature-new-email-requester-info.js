"use strict" ;

function applySignature(client, signature){
  client.interface.trigger("setValue", {id: "editor", text: signature, replace: false, position: "end"}).then(function(){
    setTimeout(function(){
      client.interface.trigger("setValue", {id: "editor", text: "\u0020", replace: false, position: "start"});
    }, 500);
    client.interface.trigger("showNotify", {type: "success", message: "Selected Signature Inserted", });
  }).catch(function(error){
    errorFunction(client, error);
  });
}

/* Ticket background app to insert default signatures. */
app.initialized().then( function(client) {
  var signatures = {};
  var bank = {
    "product_id": "",
    "group_id": ""
  };
  var url = "https://<%= iparam.domain %>/api/v2/email_configs/";
  recursiveGetData(client, url, 'apiKey').then(function(emails) {    
    let primaryEmails = emails.filter(email => email.primary_role);
    let lowestCreatedAt = moment(primaryEmails[0].created_at);
    let lowestKey = 0;
    for(var key in primaryEmails) {
      if(moment(primaryEmails[key].created_at).isBefore(lowestCreatedAt)) {
        lowestCreatedAt = moment(primaryEmails[key].created_at);
        lowestKey = key;        
      }
    }
    bank.group_id = primaryEmails[lowestKey].group_id;
    bank.product_id = primaryEmails[lowestKey].product_id;
    getSetSignatures();
  }).catch(function(err){
    errorFunction(client, 'Problem fetching email configs.');
    errorFunction(client, err);
  });
  client.events.on("ticket.fromChanged", onFromChanged);
  client.events.on("ticket.groupChanged", onFromChanged);
  client.db.get("signatureKeys").then(function(_keys){
    var keys = _keys.keys;
    if(keys.length != 0){
      var dbPromises = keys.map(function(key){
        return client.db.get(key).then(function(sign){
          signatures[key] = sign;
        });
      });
      Promise.all(dbPromises).catch(function(){
        errorFunction(client, "Unable to fetch all signatures")
      });
    }
    $('#showSignatures').click(function(){
      client.interface.trigger("showModal", {  title: "Signatures", template: "dialog.html" , data: { matched_signatures: signatures }});
    });
  }).catch(function(error){
    errorFunction(client, error);
  });
  client.instance.receive( function(event){
    var data = event.helper.getData();
    var default_signature = data.message.text;
    processPlaceholders(default_signature)
    .then(function(signature){
      setTimeout(function(){
        applySignature(client, signature);
      }, 1000);
    }, function (error){
      errorFunction(client, error);
    }) ;
  });

  function onFromChanged(event) {
    if(event.type == "ticket.fromChanged"){
      var from_id = (event.helper.getData()).new;
      getMailboxConfig()
      .then((data) => {
        let configs = data.email_config;
        for( var key in configs){
          if(configs[key].replyEmail == from_id){
            bank.product_id = configs[key].productId;
            bank.group_id = configs[key].groupId;
            getSetSignatures();
            break;
          }
        }
      }).catch(function(err){
        errorFunction(client, 'Problem fetching email configs.');
        errorFunction(client, err);
      });      
    }
    if(event.type == "ticket.groupChanged"){
      bank.group_id = (event.helper.getData()).new;
      getSetSignatures();
    }
  }

  function getSetSignatures(){
    getMatchedSignatures().then(function(data){
      var matched_signatures = data;
      renderMatchedSignature(matched_signatures);
    }).catch(function(){
      errorFunction(client, 'Could not get matched signatures.');
    });
    // renderMatchedSignature(matched_signatures, config);
  }

  function getMailboxConfig() {
    return new Promise((resolve, reject) => {
      client.data.get("email_config").then (
        function(data) {
          resolve(data);
        },
        function(error) {
            errorFunction(client, error);
            reject(error);
          }
        );
      });
  }

  function placeSignatureFromModal(signature, matched_signatures){
    setTimeout(function(){
      client.interface.trigger("setValue", {id: "editor", text: signature, replace: false, position: "end"})
      .then(function(){
        setTimeout(function(){
          client.interface.trigger(
            "setValue",
            {id: "editor", text: "\u0020", replace: false, position: "start"}
          );
        }, 500);
        if(matched_signatures.length == 1){
          client.interface.trigger("showNotify", {type: "success", message: "Default Signature Inserted", });
        }else{
          client.interface.trigger("showNotify", {type: "success", message: "Selected Signature Inserted", });
        }
      }).catch(function(){
        client.interface.trigger("showNotify", {type: "danger", message: "Error Placing signature in editor.", });
      });
    }, 1000);
  }


  function processPlaceholders(tempText){

    // regex objects to match the placeholders
    var agentName = new RegExp("{{ agent.name }}", "gm") ;
    var agentFirstName = new RegExp("{{ ticket.agent.firstname }}", "gm") ;
    var agentTitle = new RegExp("{{ ticket.agent.title }}", "gm") ;
    var agentEmail = new RegExp("{{ agent.email }}", "gm") ;
    var productName = new RegExp("{{ product.name }}", "gm") ;
    var productDescription = new RegExp("{{ product.description }}", "gm") ;
    var agentPhone = new RegExp("{{ agent.phone }}", "gm") ;
    var agentMobile = new RegExp("{{ agent.mobile }}", "gm") ;
    var ticketID = new RegExp("{{ ticket.id }}", "gm");

    return Promise.resolve(tempText)
    .then(function(text) {
      if (text.match(agentName) !== null || text.match(agentEmail) !== null || text.match(agentFirstName) !== null || text.match(agentTitle) !== null || text.match(agentMobile) !== null || text.match(agentPhone) != null){
        return client.data.get("loggedInUser")
        .then (function(user) {
          var temp = text;
          var name = user.loggedInUser.contact.name || '' ;
          temp = temp.replace(agentName, name) ;
          var email = user.loggedInUser.contact.email || '';
          temp = temp.replace(agentEmail, email) ;
          var firstname = name.split(' ')[0] || name;
          temp = temp.replace(agentFirstName, firstname) ;
          var title = user.loggedInUser.contact.job_title || '';
          temp = temp.replace(agentTitle, title) ;
          var mobile = user.loggedInUser.contact.mobile || '';
          temp = temp.replace(agentMobile, mobile);
          var phone = user.loggedInUser.contact.phone || '';
          temp = temp.replace(agentPhone, phone);
          return temp;
        });
      } else {
        return text;
      }
    })
    .then(function(text2) {
      var temp = text2;
      if (temp.match(productName) !== null || temp.match(productDescription) !== null || temp.match(ticketID)){
        // return client.data.get("ticket")
        // .then (function(ticketData) {
        var ticket_id = "";
        temp = temp.replace(ticketID, ticket_id);
        var productId = bank.product_id ;
        // if product exists for the ticket
        if (productId){
          var url = "https://<%= iparam.domain %>/api/v2/products/" + productId;
          return recursiveGetData(client, url, 'apiKey')
          .then(function(data) {
            var res = data[0];
            var temp2 = temp;
            temp2 = temp2.replace(productName, res.name) ;
            temp2 = temp2.replace(productDescription, res.description) ;
            return temp2;
          }).catch(function(error){
            if(error.hasOwnProperty('handled') && !error.handled){
              errorFunction(client, error);
            }
          });
        }else{
          temp = temp.replace(productName, '') ;
          temp = temp.replace(productDescription, '') ;
          return temp;
        }
        // });
      }else{
        return temp;
      }
    });
  }

  function getMatchedSignatures() {
    var matched_signatures_keys = [];
    var matched_signatures = [];    
    return client.db.get("signatureConditions").then(function(signatureConditions){
      var group_id = 'g_' + bank.group_id;
      var product_id = 'p_' + bank.product_id;
      Object.keys(signatureConditions).forEach(function(_x){
        if( signatureConditions[_x].indexOf(group_id) > -1 || signatureConditions[_x].indexOf(product_id) > -1){
          matched_signatures_keys.push(_x);
        }
      });
      var dbPromises = matched_signatures_keys.map(function(key){
        return client.db.get(key).then(function(sign){
          matched_signatures.push(sign);
        });
      });
      return Promise.all(dbPromises).then(function(){
        return matched_signatures;
      }).catch(function(){
        client.interface.trigger("showNotify", {type: "danger", message: "Unable to fetch all signatures", });
      });
    }).catch(function(err){
      errorFunction(client, "Unable to fetch default signature.");
      errorFunction(client, err);
    });
  }

  function renderMatchedSignature(matched_signatures){
    if (matched_signatures.length > 1) {
      client.interface.trigger("showModal", {  title: " ", template: "dialog.html" , data: { matched_signatures: matched_signatures }});
    } else if(matched_signatures.length == 1){
      processPlaceholders(LZString.decompress(utf8to16(matched_signatures[0].signature)))
      .then(function(signature){
        placeSignatureFromModal(signature, matched_signatures);
      }, function (error){
        errorFunction(client, error);
      });
    }
  }
}).catch(function(err){
  errorFunction(client, err);
});
