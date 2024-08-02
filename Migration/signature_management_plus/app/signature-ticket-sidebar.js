$(document).ready( function() {
    app.initialized().then(function(client){
        var bank = {"checkAdmin": false};
        $('#appSetupBtn').click(function(){
            if(bank.checkAdmin == true ){
                client.interface.trigger("showDialog", {
                  title: "Configure your signatures",
                  template: "signature-configuration-module.html"
                });
                setTimeout(function(){$('#appSetupBtn')[0].disabled = false;}, 4000)
            }
        });

        client.events.on("app.activated", function() {
            var url = "https://<%= iparam.domain %>/api/v2/roles/";
            Promise.all([
                recursiveGetData(client, url, 'apiKey'),
                client.data.get("loggedInUser")
            ]).then(function(data){
                var roles = data[0];
                var userRoles = data[1].loggedInUser.role_ids;
                for(index in roles){
                    if(roles[index].name == "Administrator" || roles[index].name == "Account Administrator"){
                        if(userRoles.indexOf(roles[index].id) > -1 ){
                            bank.checkAdmin = true;
                        }
                    }
                }
                if(bank.checkAdmin){
                    $("#appSetupBtn")[0].disabled = false;
                }else{
                    $("#appSetupBtn")[0].disabled = true;
                }
            }).catch(function(err){
                errorFunction(client, err);
            });
        });
    }).catch(function(err){
        // do not have access to client api; hence logging
        console.error(err);
    });
});
