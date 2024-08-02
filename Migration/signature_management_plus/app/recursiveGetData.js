function recursiveGetData(client, xurl, headers){
    // version 2
      // for freshdesk api calls
      // if used in iparams.html then pass the headers with api key
      // if used inside app then pass the "key" for apiKey in iparams
      // pass the entire url
      return Promise.resolve()
      .then(function(){
        var options;
        if(typeof headers == typeof {}){
          options = {
            'headers' : headers,
            'Content-Type': 'application/json'
          };
        }else if(typeof headers == typeof ""){
          options = {
            'headers' : {"Authorization": "Basic <%= encode(iparam." + headers + ") %>"},
            'Content-Type': 'application/json'
          };
        }
        return client.request.get(xurl, options)
        .then(function(data){
          var dataList = [];
          if(data.hasOwnProperty('status') && data.status != 200){
            throw data;
          }
          dataList = dataList.concat(JSON.parse(data.response));
          if(data.headers.hasOwnProperty('link')){
            var link = data.headers.link;
            var regex = /^<(.*)>\;/;
            link = link.match(regex)[1];
            return recursiveGetData(client, link, headers)
            .then(function(data){
              var returnList = dataList.concat(data);
              return returnList;
            });
          }
          return dataList;
        }).catch(function(err){
          err.handled = false;
          if(client.interface){
            if( err.hasOwnProperty('status')){
              var msg = '';
              var title = '';
              if(err.status == 429){
                if( err.headers.hasOwnProperty('retry-after') ){
                  msg = "You have reached request limit, please try after " + err.headers["retry-after"] + " secs.";
                  title = "Code:" + err.status;
                  client.interface.trigger("showNotify", {type: "danger", title: title, message: msg});
                  err.handled = true;
                }else{
                  msg = "You have reached request limit, please try after some time.";
                  title = "Code:" + err.status;
                  client.interface.trigger("showNotify", {type: "danger", title: title, message: msg});
                  err.handled = true;
                }
              }
              else if(err.status == 403) {
                err.handled = true;
                // API not available to the account, do nothing                
              }
              else{
                  msg = 'Some error occured while getting response from freshdesk.';
                  title = "Error";
                  client.interface.trigger("showNotify", {type: "danger", title: title, message: msg});
                  err.handled = true;
              }
            }else{
              client.interface.trigger("showNotify", { type: "danger", title: 'Error', message: 'Some error occured.' });
              err.handled =  true;
            }
          }
          if(err.status != 403) {
            console.error("Recursive get data error:",err);
            throw err;
          }          
        });
      });

    }