function errorFunction(client, err){
    var msg = 'Error. Please try refreshing the page or contact support.';
    if(client && client.interface && client.interface.trigger){
        client.interface.trigger("showNotify", {type: "danger", message: msg});
    }
    console.error(err);
}