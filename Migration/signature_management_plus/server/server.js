var uniqid = require('uniqid');

exports = {

  events: [
    { event: "onAppInstall", callback: "onAppInstallHandler" }
  ],
  onAppInstallHandler: function() {
  	$db.set("signatureKeys", {"keys": []}).then(function(){
  		renderData();
  	}, function(err){
  		renderData({message: err.message});
  	});
  },
  storeNewSignature: function(options) {
  	// options containts name, signature, conditions, agent, time and iparams keys
  	if(options.name.length > 20){
  		options.name = options.name.slice(0,20);
  	}
  	var key = options.name + uniqid.time('_');
  	$db.set(key, {
  		"signature": options.signature,
  		"conditions": options.conditions,
  		"agent": options.agent,
  		"time": options.time,
  		"name": options.name
  	}).then(function(){
      console.info("key before being appended:",key);
  		$db.update("signatureKeys", "append", {"keys": [key]})
  		.then (function() {
  			var opt = {};
  			opt[key] = options.conditions;
        console.info("opt:", JSON.stringify(opt));
  			$db.update("signatureConditions", "set", opt).then(function(){
  				renderData(null, {key: key});
  			}, function(err){
          console.error("line 36:",err);
  				renderData(err);
  			});
  		},function(err) {
        console.error("line 40:",err);
  			renderData(err);
  		});
  	}, function(err){
      console.error("line 44:",err);
  		renderData(err);
  	});
  },
  storeEditSignature: function(options){
  	// options contains name, signature, conditions, agent,
  	// time, uniqid and iparams keys
  	if(options.name.length > 20){
  		options.name = options.name.slice(0,20);
  	}
  	var oldkey = options.uniqid;
  	var oldkeypos = options.oldkeypos;
  	var newkey = options.name + uniqid.time('_');
    console.info("oldkey:",oldkey);
    console.info("oldkeypos:",oldkeypos);
		console.info("newkey:",newkey);
  	$db.set(newkey, {
  		"signature": options.signature,
  		"conditions": options.conditions,
  		"agent": options.agent,
  		"time": options.time,
  		"name": options.name
  	}).then(function(){
  		$db.delete(oldkey).then(function(){
  			var temp = "keys["+oldkeypos+"]";
  			$db.update('signatureKeys', 'remove', [temp]).then(function(){
  				var opt = {};
  				opt[newkey] = options.conditions;
          		$db.update("signatureKeys", "append", {"keys": [newkey]}).then(function(){
            		$db.update("signatureConditions", "set", opt).then(function(){
              			$db.update("signatureConditions", "remove", [oldkey])
              			.then(function(){
                			renderData(null, {});
              			}, function(err){
							console.error('Error line 79:',err);
							renderData(err);
						});
					}, function(err){
						console.error('Error line 83:',err);
						renderData(err);
					});
				}, function(err){
					console.error('Error line 87:',err);
					renderData(err);
				});
  			},function(err){
				console.error('Error line 91:',err);
  				renderData(err);
  			});
  		}, function(err){
        	console.error('Error line 95:',err);
  			renderData(err);
  		});
  	}, function(err){
      	console.error('Error line 99:', err);
  		renderData(err);
  	});
  },
  deleteSignature: function(options){
	  console.info('got request to delete :', options.signatureKey);
	  $db.delete(options.signatureKey).then(function(){
		var tempkey = "keys["+options.keyPos+"]";
		$db.update("signatureKeys","remove", [tempkey]).then(function() {
			$db.update("signatureConditions", "remove", [options.signatureKey]).then(function(){
				renderData(null, {});
			}, function(err){
				console.error('Error Line 110:', err);
				renderData(err);
			});
		}, function(err){
			console.error('Error Line 114:', err);
			renderData(err);
		});
	  }, function(err){
		console.error('Error Line 118:', err);
		renderData(err);
	  });
	},
	
	deleteSignatureFromList: function(options) {
		var tempkey = "keys["+options.keyPos+"]";
		$db.update('signatureKeys', 'remove', [tempkey]).then(function() {
			$db.update('signatureConditions', 'remove', [options.signatureKey]).then(function() {
				renderData(null, {});
			}, function(err) {
				console.log('Error at deleteSignatureFromList inside $db.update(signatureConditions)');
				renderData(err);
			}, function(err) {
				console.log('Error at deleteSignatureFromList inside $db.update(signatureKeys)');
				renderData(err);
			})
		});
	}

};