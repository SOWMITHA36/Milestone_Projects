"use strict" ;
function toTitleCase(str) {
    // stackoverflow questions/196972/convert-string-to-title-case-with-javascript
      return str.replace(
          /\w\S*/g,
          function(txt) {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          }
      );
  }

function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function add_signature_choice(name, content, signatureNumber) {
  var safe_name = name.replace(/[^a-zA-Z\d]/g,"_");
  safe_name = "s_id_" + safe_name + signatureNumber;
  var name = toTitleCase(name);
  var template = '<div class="signature row">'+
        '<div class="col-md-12">'+
          '<div class="row sig-name">'+
            '<div class="col-md-12">'+
              '<input type="radio" name="selected-signature">'+
              '<a href="#' + safe_name + '" id="sig-'+safe_name+'" data-toggle="collapse" role="button" onclick="rotateArrow(\''+safe_name+'\')"> ' + htmlEntities(name) + ' <img class="caret-down" src="arrow_down.png" id="arrow-'+safe_name+'"></a>'+
            '</div>'+
              '</div>'+
            '<div class="row sig-content collapse" id="' + safe_name + '">'+
              '<div class="card card-body">'+ LZString.decompress(utf8to16(content)) +
              '</div>'+
            '</div>'+
        '</div>'+
      '</div>';

  $("#signature-choices").append(template);
}

function rotateArrow(safe_name){
  if($('#'+safe_name).hasClass("show")){
    $("#arrow-"+safe_name)[0].style.transform = "scaleY(1)";
  }else{
    $("#arrow-"+safe_name)[0].style.transform = "scaleY(-1)";
  }
}

app.initialized().then(
  function(client) {
    function processPlaceholders(tempText){
      // regex objects to match the placeholders
      var agentName = new RegExp("{{ agent.name }}", "gm") ;
      var agentEmail = new RegExp("{{ agent.email }}", "gm") ;
      var productName = new RegExp("{{ product.name }}", "gm") ;
      var productDescription = new RegExp("{{ product.description }}", "gm") ;
      var agentFirstName = new RegExp("{{ ticket.agent.firstname }}", "gm") ;
      var agentTitle = new RegExp("{{ ticket.agent.title }}", "gm") ;
      var agentPhone = new RegExp("{{ agent.phone }}", "gm") ;
      var agentMobile = new RegExp("{{ agent.mobile }}", "gm") ;
      var ticketID = new RegExp("{{ ticket.id }}", "gm");

      return Promise.resolve(tempText)
        .then(function(text) {
          if (
            text.match(agentName) !== null ||
            text.match(agentEmail) !== null ||
            text.match(agentFirstName) !== null ||
            text.match(agentTitle) !== null ||
            text.match(agentMobile) !== null ||
            text.match(agentPhone) != null
          ){
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
        .then(function(text) {
          if (text.match(productName) !== null || text.match(productDescription) !== null || text.match(ticketID)){
            return client.data.get("ticket")
              .then (function(ticketData) {
                  var ticket_id = ticketData.ticket.id;
                  var temp = text;
                  temp = temp.replace(ticketID, ticket_id);

                  var productId = ticketData.ticket.product_id ;
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
                        errorFunction(client, err);
                      }
                    });
                  }else{
                    temp = temp.replace(productName, '') ;
                    temp = temp.replace(productDescription, '') ;
                    return temp;
                  }
              });
          }else{
            return text;
          }
        });
    }

    function activate_signature_button() {
      $("#add-signature").click(function() {
        var signature = $("input[name='selected-signature']:checked").closest('.signature').find('.sig-content .card').html();
        if (signature !== undefined) {

          processPlaceholders(signature)
            .then(function(sign){
              client.interface.trigger("setValue", {id: "editor", text: sign, replace: false, position: "end"});
              client.interface.trigger(
                "showNotify",
                {
                  type: "success",
                  message: "Signature Inserted",
                });
            }, function(error){
              errorFunction(client, error);
            }) ;
        } else {
            client.interface.trigger(
              "showNotify",
              {
                type: "danger",
                message: "Select a Signature",
              });
        }
      });
    }

    function onAppActivated() {
      var signatures = {};
      client.db.get("signatureKeys").then(function(keys) {
        var keys = keys.keys;
        if(keys.length != 0) {
          let allItemsAvailable = true;
          keys.forEach((key) => {
            if(allItemsAvailable == true && window.localStorage.getItem(key) == null) {
              allItemsAvailable = false;
            }
          });
          if(allItemsAvailable) {
            keys.map((key) => {
              signatures[key] = JSON.parse(window.localStorage.getItem(key));
            });
            var config = {};
            config.signatures = signatures;
            var signature_number = 0;
            for (var key in config.signatures) {
              var signature = config.signatures[key];
              add_signature_choice(signature.name, signature.signature, signature_number++);
            }
            activate_signature_button();
          }
          else {
            var dbPromises = keys.map(function(key) {
              return client.db.get(key).then(function(sign){
                signatures[key] = sign;
                window.localStorage.setItem(key, JSON.stringify(sign));
              },
              function(error) {
                // failure operation
                console.log(error)
              });
            });
            Promise.all(dbPromises).then(function(){
              var config = {};
              config.signatures = signatures;
              var signature_number = 0;
              for (var key in config.signatures) {
                var signature = config.signatures[key];
                add_signature_choice(signature.name, signature.signature, signature_number++);
              }
              activate_signature_button();
            }).catch(function(){
              console.warn('Could not get all signatures, falling back');
              dbPromises.forEach(function(call) {
                Promise.now(call)
                .catch(function(err) {
                  console.error('Error for ', err);
                  console.warn('Skipping..');
                });
              });
              var config = {};
              config.signatures =signatures;
              var signature_number = 0;
              for (var key in config.signatures) {
                var signature = config.signatures[key];
                add_signature_choice(signature.name, signature.signature, signature_number++);
              }
              activate_signature_button();
            });
          }
        }
      }).catch(function(err){
        errorFunction(client, "Could not get all signatures keys.");
        errorFunction(client, err);
      });
    }


    client.events.on("app.activated", onAppActivated);

  }).catch(function(err){
    // do not have access to client api
    console.error('Did not initialze app;', err);
  });

