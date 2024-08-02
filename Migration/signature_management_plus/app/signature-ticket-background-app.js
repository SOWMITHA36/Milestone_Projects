"use strict" ;

/* Ticket background app to insert default signatures. */
app.initialized().then(
  function(client) {

    function placeSelectedSignature(signature){
      setTimeout(function(){
        client.interface.trigger("setValue", {id: "editor", text: signature, replace: false, position: "end"}).then(function(){
          setTimeout(function(){
            client.interface.trigger("setValue", {id: "editor", text: "\u0020", replace: false, position: "start"});
            // .then(function(){
            // });
          }, 500);
          client.interface.trigger("showNotify", {type: "success", message: "Selected Signature Inserted", });
        }).catch(function(err){
          client.interface.trigger("showNotify", {type: "danger", message: "Error while placing Signature.", });
          errorFunction(client, err);
        });
      }, 1000);
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

    client.instance.receive( function(event){
      var data = event.helper.getData();
      var default_signature = data.message.text;
      processPlaceholders(default_signature)
      .then(function(signature){
        placeSelectedSignature(signature);
      }, function (error){
        errorFunction(client, error);
      }) ;
    });

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
        var temp = text;
        if (temp.match(agentName) !== null || temp.match(agentEmail) !== null || temp.match(agentFirstName) !== null || temp.match(agentTitle) !== null || temp.match(agentMobile) !== null || temp.match(agentPhone) != null){
          return client.data.get("loggedInUser")
          .then (function(user) {
            var temp2 = temp;
            var name = user.loggedInUser.contact.name || '' ;
            temp2 = temp2.replace(agentName, name) ;
            var email = user.loggedInUser.contact.email || '';
            temp2 = temp2.replace(agentEmail, email) ;
            var firstname = name.split(' ')[0] || name;
            temp2 = temp2.replace(agentFirstName, firstname) ;
            var title = user.loggedInUser.contact.job_title || '';
            temp2 = temp2.replace(agentTitle, title) ;
            var mobile = user.loggedInUser.contact.mobile || '';
            temp2 = temp2.replace(agentMobile, mobile);
            var phone = user.loggedInUser.contact.phone || '';
            temp2 = temp2.replace(agentPhone, phone);
            return temp2;
          });
        } else {
          return temp;
        }
      })
      .then(function(text) {
        var temp = text;
        if (temp.match(productName) !== null || temp.match(productDescription) !== null || temp.match(ticketID)){
          return client.data.get("ticket")
          .then (function(ticketData) {
            var temp2 = temp;
            var ticket_id = ticketData.ticket.id;
            temp2 = temp2.replace(ticketID, ticket_id);
            var productId = ticketData.ticket.product_id ;
                  // if product exists for the ticket
                  if (productId){
                    var url = "https://<%= iparam.domain %>/api/v2/products/" + productId;
                    var headers = {"Authorization": "Basic <%= encode(iparam.apiKey) %>"};
                    var options = { headers: headers };
                    return client.request.get(url, options)
                    .then(
                      function(data) {
                        console.log(data.response);
                        var res = JSON.parse(data.response);
                        var temp3 = temp2;
                        temp3 = temp3.replace(productName, res.name) ;
                        temp3 = temp3.replace(productDescription, res.description) ;
                        return temp3;
                      },
                      function(error) {
                        console.log(error);
                        errorFunction(client, error);
                      }
                    );
                  }else{
                    temp2 = temp2.replace(productName, '') ;
                    temp2 = temp2.replace(productDescription, '') ;
                    return temp2;
                  }
                });
        }else{
          return temp;
        }
      });
    }

    function renderMatchedSignature(matched_signatures){
      matched_signatures.forEach((signature) => {
        window.localStorage.setItem(signature['key'], JSON.stringify(signature));
      });
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

    function onReplyClicked() {
      // We get the ticket details on every click instead of caching
      // since group and product information can get updated after
      // our background app has loaded.
      var matched_signatures_keys = [];
      client.data.get("ticket").then(function(data) {
        var group_id = 'g_' + data.ticket.group_id;
        var product_id = 'p_' + data.ticket.product_id;
        client.db.get("signatureConditions").then(function(signatureConditions) {
          Object.keys(signatureConditions).forEach(function(_x){
            if( signatureConditions[_x].indexOf(group_id) > -1 || signatureConditions[_x].indexOf(product_id) > -1){
              matched_signatures_keys.push(_x);
            }
          });
          let matchedSignatures = [];
          let allItemsAvailable = true;
          matched_signatures_keys.forEach((key) => {
            if(allItemsAvailable == true && window.localStorage.getItem(key) == null) {
              allItemsAvailable = false;
            }
          });
          if(allItemsAvailable) {
            matched_signatures_keys.forEach((key) => {
              matchedSignatures.push(JSON.parse(window.localStorage.getItem(key)));              
            });
            renderMatchedSignature(matchedSignatures);
          }
          else {        
            var dbPromises = matched_signatures_keys.map(function(key){
              return client.db.get(key)
            });
            Promise.all(dbPromises).then(function(matched_signatures){
              renderMatchedSignature(matched_signatures);
            }).catch(function(){
              client.interface.trigger("showNotify", {type: "danger", message: "Unable to fetch all signatures", });
            });
          }
        }).catch(function(err){
          errorFunction(client, "Signature App:Unable to fetch signature.");
          throw(err);
        });
      }).catch(function(err){
        errorFunction(client, err);
      });
    }

    function onAppActivated() {
      client.iparams.get().then (
          function(iparamsData) {
            let disableForNotes = iparamsData.disableInNotes;
            client.events.on("ticket.replyClick", onReplyClicked);
            client.events.on("ticket.forwardClick", onReplyClicked);      
            client.events.on("ticket.conversationForward", onReplyClicked);
            if(!disableForNotes) {
              client.events.on("ticket.notesClick", onReplyClicked);
            }            
          },
          function(error) {
            console.log(error);
            // failure operation
          }
      );       
    }

    client.events.on("app.activated", onAppActivated);
  },function(error){
    // logging error(app initialize error) as no access to client
    console.error(error);
  });
