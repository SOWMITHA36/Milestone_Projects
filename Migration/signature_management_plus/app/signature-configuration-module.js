$(document).ready(function(){
	clearProcessList();
	showOverlay();
	addProcess('Checking Freshdesk app initialized');
	app.initialized().then(function(client){
		configurationApp(client);
		initializeFroalaEditor('signatureEdit');
		initializeFroalaEditor('signatureAdd');
	}).catch(function(err){
		// unavoidable console error
		console.error(err);
	});
});

function configurationApp(client){
	if(!client){
		addProcess('Error occured starting the app', true);
		throw "Error: to initialize configurationApp provide \'client, iparams\' parameter";
	}else{
		addProcess('App loaded, configurationApp initialized');
		var that = this;
		addProcess('Getting list of products and groups');
		addProcess('Getting list of signatures');
		Promise.all([
				client.data.get('ticket'), client.iparams.get(),
				client.data.get('loggedInUser'),
				recursiveGetData(
					client,
					'https://<%= iparam.domain %>/api/v2/products',
					'apiKey'
				),
				recursiveGetData(
					client,
					'https://<%= iparam.domain %>/api/v2/groups',
					'apiKey'
				),
				client.db.get("signatureKeys")
		]).then(function(arr){
			console.log(arr);
			that.ticket = arr[0].ticket;
			that.iparams = arr[1];
			that.user = arr[2].loggedInUser;
			that.products = arr[3];
			that.groups = arr[4];
			that.signatures = arr[5].keys;
			that.groupsEnumerated = {};
			that.productsEnumerated = {};

			that.groups.forEach(function(group){
				that.groupsEnumerated[group.id] = group.name;
			});

			if(that.products != undefined) {
				that.products.forEach(function(product){
					that.productsEnumerated[product.id] = product.name;
				});
			}			

			return Promise.all([
				prepareSignatureList(that.signatures),
				prepareEditSignatureConditions(that.groups, that.products),
				prepareAddSignatureConditions(that.groups, that.products)
			]).then(function(){
				hideOverlay();
			}).catch(function(e){
				errorFunction(client, e);
				addProcess(e.message, true);
			});
		}).catch(function(err) {
			addProcess(err.message, true);
			errorFunction(client, err)
		});

		$('#signatureEditBtn').click(function(){
			$('#editSignatureName').val('').trigger('change');
			$('#editSignatureConditions').val(null).trigger('change');
			var searchKey = $('#signatureSearch').val();
			var populateEdit = function(signatureItem){
				$('#editSignatureConditions').val(signatureItem.conditions).trigger('change');
				$('#signatureEdit').froalaEditor('html.set', LZString.decompress(utf8to16(signatureItem.signature)));
				showLayer2();
			};
			if(searchKey){
				if(sessionStorage.getItem(searchKey)){
					var signatureItem = "";
					try{
						signatureItem = JSON.parse(sessionStorage.getItem(searchKey));
						$('#editSignatureName').val(searchKey.slice(0,-9));
						$('#editSignatureUniqid').val(searchKey);
						populateEdit(signatureItem);
					}catch(e){
						client.db.get(searchKey).then(function(signatureItem){
							sessionStorage.setItem(searchKey, JSON.stringify(signatureItem));
							$('#editSignatureName').val(searchKey.slice(0,-9));
							$('#editSignatureUniqid').val(searchKey);
							populateEdit(signatureItem);
						}).catch(function(err){
							errorFunction(client, err);
						});
					}
				}else{
					client.db.get(searchKey).then(function(signatureItem){
						sessionStorage.setItem(searchKey, JSON.stringify(signatureItem));
						$('#editSignatureName').val(searchKey.slice(0,-9));
						$('#editSignatureUniqid').val(searchKey);
						populateEdit(signatureItem);
					}).catch(function(err){
						errorFunction(client, err);
					});
				}
			}
		});

		$('#signaturePreviewBtn').click(function(){
			$('#signaturePreviewBox').hide();
			$('#signatureSelectError').text('').hide();
			var searchKey = $('#signatureSearch').val();
			var btn = this;
			var populatePreview = function(signatureItem){
				var cg = [];
				var cp = [];
				signatureItem.conditions.forEach(function(condition){
					if(condition[0] == 'g'){
						cg.push(that.groupsEnumerated[condition.slice(2)]);
					}else if(condition[0] == 'p'){
						cp.push(that.productsEnumerated[condition.slice(2)]);
					}
				});
				$('#deleteSignature').removeAttr('disabled');
				$('#deleteSignature').text('Delete');
				$('#spanGroups').text(cg.join(',')||'-');
				$('#spanProducts').text(cp.join(',')||'-');
				$('#lastEditBy').text(signatureItem.agent);
				$('#lastEditTime').text(signatureItem.time);
				$('#signature-preview').html(LZString.decompress(utf8to16(signatureItem.signature)));
				$('#signaturePreviewBox').show();
			};

			if(searchKey){
				$(btn).attr('disabled','disabled');
				$(btn).text('Wait');
				$('#signaturePreviewKey').val(searchKey);
				$('#deleteConfirmDiv').hide();
				$('#deleteSignature').text('Delete Signature.').show();
				$('#deleteSignatureConfirm').removeAttr('disabled');
				$('#deleteSignatureCancel').removeAttr('disabled');

				if(sessionStorage.getItem(searchKey)){
					var signatureItem = "";
					try{
						signatureItem = JSON.parse(sessionStorage.getItem(searchKey));
						$('#signaturePreviewBoxName').text(searchKey.slice(0,-9).toUpperCase());
						populatePreview(signatureItem);
					}catch(e){
						client.db.get(searchKey).then(function(signatureItem){
							sessionStorage.setItem(searchKey, JSON.stringify(signatureItem));
							$('#signaturePreviewBoxName').text(searchKey.slice(0,-9).toUpperCase());
							populatePreview(signatureItem);
							$(btn).text('Preview');
							$(btn).removeAttr('disabled');
						}).catch(function(err){
							errorFunction(client, err);
						});
					}
					$(btn).text('Preview');
					$(btn).removeAttr('disabled');
				}else{
					client.db.get(searchKey).then(function(signatureItem){
						sessionStorage.setItem(searchKey, JSON.stringify(signatureItem));
						$('#signaturePreviewBoxName').text(searchKey.slice(0,-9).toUpperCase());
						populatePreview(signatureItem);
						$(btn).text('Preview');
						$(btn).removeAttr('disabled');
					}).catch(function(err){
						$('#signatureSelectError').text('Signature not found. Deleting entry.').fadeIn(100).delay(2000).fadeOut(1000);						
						$(btn).text('Preview');
						$(btn).removeAttr('disabled');
						errorFunction(client, err);
						var options = {
							"signatureKey": searchKey,
							"keyPos": that.signatures.indexOf(searchKey)
						}
						client.request.invoke("deleteSignature", options).then(function(){
							sessionStorage.clear();
							window.localStorage.removeItem(searchKey);
						}).catch(function(err) {
							console.log(err);
						})
					});
				}
			}
		});


		$('#deleteSignature').click(function(){
			$('#deleteConfirmDiv').show();
			$('#deleteSignature').hide();
		});

		$('#deleteSignatureCancel').click(function(){
			$('#deleteConfirmDiv').hide();
			$('#deleteSignature').show();
		});

		$('#deleteSignatureConfirm').click(function(){
			var signatureKey = $('#signaturePreviewKey').val();
			var btn = this;
			$(btn).attr('disabled','disabled');
			$('#deleteSignatureCancel').attr('disabled', 'disabled');
			$(btn).text('Wait');
			if(signatureKey && signatureKey != ' '){
				var options = {
					"signatureKey": signatureKey,
					"keyPos": that.signatures.indexOf(signatureKey)
				}
				client.request.invoke("deleteSignature", options).then(function(){
					sessionStorage.clear();
					window.localStorage.removeItem(signatureKey);
					return client.db.get("signatureKeys").then(function(data){
						that.signatures = data.keys;
						return prepareSignatureList(that.signatures, 'deleted').then(function(){
							$('#signaturePreviewBox').hide();
							$(btn).removeAttr('disabled');
							$('#deleteSignatureCancel').removeAttr('disabled');
							$(btn).text('Yes.');
							$('#deleteConfirmDiv').hide()
						});
					});
				}, function(err){
					errorFunction(client, err);
					$(btn).removeAttr('disabled');
					$('#deleteSignatureCancel').removeAttr('disabled');
					$(btn).text('Yes.');
					$('#deleteConfirmDiv').hide()
				});
			}
		});


		$('#saveEditSignature').click(function(){
			var valid = true;
			var btn = this;
			if(!document.getElementById('editSignatureName').checkValidity()){
				valid = false;
				$('#editSignatureNameErr').fadeIn(1000).delay(7000).fadeOut(1000);
			}
			if($('#signatureEdit').froalaEditor('core.isEmpty')){
				valid = false;
				$('#signatureEditErr').fadeIn(1000).delay(7000).fadeOut(1000);
			}
			if($('#editSignatureConditions').val().length == 0){
				valid = false;
				$('#editSignatureConditionsErr').fadeIn(1000).delay(7000).fadeOut(1000);
			}
			if(valid){
				$('#editInputBox').hide();
				$('#editLoader').show();
				$(btn).attr('disabled','disabled');
				$('#saveEditSignatureCancel').attr('disabled','disabled');
				$(btn).text('Wait');
				var datetime = new Date();
				var minutes = datetime.getUTCMinutes() < 10 ? '0' + datetime.getUTCMinutes(): '' + datetime.getUTCMinutes();
				var strtime = datetime.getUTCDate()+'-'+(datetime.getUTCMonth()+1)+'-'+datetime.getUTCFullYear()+' '+datetime.getUTCHours()+':'+minutes+ ' UTC';
				var options = {
					"name": $('#editSignatureName').val(),
					"signature": utf16to8(LZString.compress($('#signatureEdit').froalaEditor('html.get'))),
					"conditions": $('#editSignatureConditions').val(),
					"agent": that.user.contact.name,
					"time": strtime,
					"uniqid": $('#editSignatureUniqid').val(),
					"oldkeypos": that.signatures.indexOf($('#editSignatureUniqid').val())
				};
				client.request.invoke("storeEditSignature", options).then(function(){
					sessionStorage.clear();
					return client.db.get("signatureKeys").then(function(data){
						$('.circle-loader').toggleClass('load-complete');
						$('.checkmark').toggle(800, function(){
							that.signatures = data.keys;
							return prepareSignatureList(that.signatures, 'edited').then(function(){
								showLayer1();
								$(btn).removeAttr('disabled');
								$('#saveEditSignatureCancel').removeAttr('disabled');
								$(btn).text('Save');
								$('#signatureSearch').val('null').trigger('change');
								$('#signaturePreviewBox').hide();
								$('#editInputBox').show();
								$('#editLoader').hide();
								$('.circle-loader').toggleClass('load-complete');
								$('.checkmark').toggle();
							});
						});
					});
				}, function(err){
					errorFunction(client, err);
					if(err.hasOwnProperty('message')){
						$('#saveEditSignatureErr').text(err.message);
					}else{
						$('#saveEditSignatureErr').text(err);
					}
					$('#saveEditSignatureErr').fadeIn(500).delay(7000).fadeOut(1000);
					$(btn).removeAttr('disabled');
					$('#saveEditSignatureCancel').removeAttr('disabled');
					$('#editInputBox').show();
					$('#editLoader').hide();
					$(btn).text('Save');
				});
			}
		});

		$('#saveNewSignature').click(function(){
			var valid = true;
			var btn = this;
			if(!document.getElementById('addSignatureName').checkValidity()){
				valid = false;
				$('#addSignatureNameErr').fadeIn(1000).delay(7000).fadeOut(1000);
			}
			if($('#signatureAdd').froalaEditor('core.isEmpty')){
				valid = false;
				$('#signatureAddErr').fadeIn(1000).delay(7000).fadeOut(1000);
			}
			if($('#addSignatureConditions').val().length == 0){
				valid = false;
				$('#addSignatureConditionsErr').fadeIn(1000).delay(7000).fadeOut(1000);
			}
			if(valid){
				$(btn).attr('disabled','disabled');
				$('#saveNewSignatureCancel').attr('disabled','disabled');
				$(btn).text('Wait');
				var datetime = new Date();
				var minutes = datetime.getUTCMinutes() < 10 ? '0' + datetime.getUTCMinutes(): '' + datetime.getUTCMinutes();
				var strtime = datetime.getUTCDate()+'-'+(datetime.getUTCMonth()+1)+'-'+datetime.getUTCFullYear()+' '+datetime.getUTCHours()+':'+minutes+ ' UTC';
				var options = {
					"name": $('#addSignatureName').val(),
					"signature": utf16to8(LZString.compress($('#signatureAdd').val())),
					"conditions": $('#addSignatureConditions').val(),
					"agent": that.user.contact.name,
					"time": strtime
				};
				client.request.invoke("storeNewSignature", options).then(function(data){
					console.log('Pushing key to localstorage', data.response.key);
					window.localStorage.setItem(data.response.key, JSON.stringify(options));
					return client.db.get("signatureKeys").then(function(data) {
						that.signatures = data.keys;
						window.localStorage.setItem('signatureKeys', JSON.stringify(that.signatures));
						return prepareSignatureList(that.signatures, 'added').then(function(){
							showLayer1();
							$(btn).removeAttr('disabled');
							$('#saveNewSignatureCancel').removeAttr('disabled');
							$(btn).text('Save');
						});
					});
				}, function(err){
					errorFunction(client, err);
					if(err.hasOwnProperty('message')){
						$('#saveNewSignatureErr').text(err.message);
					}else{
						$('#saveNewSignatureErr').text(err);
					}
					$('#saveNewSignatureErr').fadeIn(500).delay(7000).fadeOut(1000);
					$(btn).removeAttr('disabled');
					$('#saveNewSignatureCancel').removeAttr('disabled');
					$(btn).text('Save');
				});
			}
		});
	}
}

// functions that dont need client or other values are kept globally
$('#signatureSearch').select2({
	placeholder: 'Search for signature',
	allowClear: true,
	minimumInputLength: 0,
	width: '100%'
});

$('#editSignatureConditions').select2({
	placeholder: 'Groups or Products',
	allowClear: true,
	minimumInputLength: 0,
	width: '100%'
});


function showOverlay(){
	document.getElementById('overlay').style.display = "inline";
	document.getElementById('layer1').style.visibility = "hidden";
}

function hideOverlay(){
	setTimeout(function(){
		clearProcessList();
		document.getElementById('overlay').style.display = "none";
		document.getElementById('layer1').style.visibility = "visible";
	}, 1000);

}

function showLayer2(){
	$('#layer1').css('display', 'none');
	$('#layer3').hide();
	$('#layer2').show();
}

function showLayer1(){
	$('#layer1').show();
	$('#layer2').hide();
	$('#layer3').hide();
}

function showLayer3(){
	$('#layer1').hide();
	$('#layer2').hide();
	$('#layer3').show();
}

function addProcess(text, err=false){
	// adds a new message to overlay
	var str = String(text);
	var li = document.createElement('li');
	li.innerText = str;
	if(err){
		li.style.color = '#953c42';
		$('#processListNormal').hide();
		$('#processListError').show();
	}
	$('#processList').append(li);
}

function clearProcessList(){
	// clears processList
	$('#processList li').remove();
}

$('#toggle').click(function() {
  $('.circle-loader').toggleClass('load-complete');
  $('.checkmark').toggle();
});

function prepareSignatureList(signatures, added){
	return new Promise(function(resolve, reject){
		if(added == 'added'){
			$('#signatureCountBox').fadeIn(300).delay(200).removeClass('badge-info').addClass('badge-success');
			$('#added1').fadeIn(300).delay(1000).fadeOut(300, function(){
				$('#signatureCount').text(' '+ signatures.length +' ');
				$('#signatureCountBox').removeClass('badge-success').addClass('badge-info');
			});
		}else if(added == 'deleted'){
			$('#signatureCountBox').fadeIn(300).delay(200).removeClass('badge-info').addClass('badge-danger');
			$('#deleted1').fadeIn(300).delay(1000).fadeOut(300, function(){
				$('#signatureCount').text(' '+ signatures.length +' ');
				$('#signatureCountBox').removeClass('badge-danger').addClass('badge-info');
			});
		}else{
			$('#signatureCount').text(' '+ signatures.length +' ');
		}
		try{
			$('#signatureSearch').empty().trigger('change');
			if ($('#signatureSearch').hasClass("select2-hidden-accessible")) {
				$('#signatureSearch').select2('destroy');
			}
			$('#signatureSearch').append(document.createElement('option'));
			signatures.forEach(function(signature){
				var opt = document.createElement('option');
				opt.value = signature;
				opt.text = signature.slice(0,-9);
				$('#signatureSearch').append(opt);
			});

			$('#signatureSearch').select2({
				placeholder: 'Search for Signatures',
				allowClear: false,
				minimumInputLength: 0,
				width: '100%'
			});
			resolve(true);
		}catch(err){
			reject(err);
		}
	});
}

function prepareEditSignatureConditions(groups, products){
	addProcess('Preparing Edit signature Conditions');
	return new Promise(function(resolve,reject){
		try{
			groups.forEach(function(group){
				// id, name, description
				var opt = document.createElement('option');
				opt.value = 'g_' + group.id;
				opt.text = group.name;
				opt.title = group.description;
				$('#editSignatureConditions optgroup[label="Groups"]').append(opt);
			});
			if(products != undefined) {
				products.forEach(function(product){
					// id, name, descriptiond
					var opt = document.createElement('option');
					opt.value = 'p_' + product.id;
					opt.text = product.name;
					opt.title = product.description;
					$('#editSignatureConditions optgroup[label="Products"]').append(opt);
				});
			}
			if ($('#editSignatureConditions').hasClass("select2-hidden-accessible")) {
				$('#editSignatureConditions').select2('destroy');
			}
			$('#editSignatureConditions').select2({
				placeholder: 'Groups or Products',
				allowClear: true,
				minimumInputLength: 0,
				width: '100%'
			});
		}catch(err){
			reject(err);
		}
		resolve(true);
	});
}

function prepareAddSignatureConditions(groups, products){
	addProcess('Preparing Add signature Conditions');
	return new Promise(function(resolve,reject){
		try{
			groups.forEach(function(group){
				// id, name, description
				var opt = document.createElement('option');
				opt.value = 'g_' + group.id;
				opt.text = group.name;
				opt.title = group.description;
				$('#addSignatureConditions optgroup[label="Groups"]').append(opt);
			});
			if(products != undefined) {
				products.forEach(function(product){
					// id, name, descriptiond
					var opt = document.createElement('option');
					opt.value = 'p_' + product.id;
					opt.text = product.name;
					opt.title = product.description;
					$('#addSignatureConditions optgroup[label="Products"]').append(opt);
				});
			}			
			if ($('#addSignatureConditions').hasClass("select2-hidden-accessible")) {
				$('#addSignatureConditions').select2('destroy');
			}
			$('#addSignatureConditions').select2({
				placeholder: 'Groups or Products',
				allowClear: true,
				minimumInputLength: 0,
				width: '100%'
			});
		}catch(err){
			reject(err);
		}
		// reject({});
		resolve(true);
	});
}

// initializes textarea as froala editor
function initializeFroalaEditor(selector_id) {
	var selector = '#' + selector_id;
	var a = ["bold", "italic", "underline", "|", "fontFamily", "fontSize", "color", "align", "|", "formatOL", "formatUL",
	"|", "insertLink", "insertImage", "|", "spellChecker", "specialCharacters", "|", "clearFormatting", "|", "html"];
	var i = ["#61BD6D", "#1ABC9C", "#54ACD2", "#2C82C9", "#9365B8", "#475577",
	"#00A885", "#3D8EB9", "#2969B0", "#553982", "#28324E", "#000000",
	"#F7DA64", "#FBA026", "#EB6B56", "#E25041", "#A38F84", "#FFFFFF",
	"#FAC51C", "#F37934", "#B8312F", "#7C706B", "#D1D5D8", "REMOVE"];
	var o= {
		charCounterCount:!1, quickInsertButtons:!1, editorClass:"ticket-note-typography",
		key:"Qg1Ti1LXd2URVJh1DWXG==", toolbarBottom:!1, imageMove:!1,
	      // imageInsertButtons:["imageByURL"],
	      imageInsertButtons: ['imageBack', '|', 'imageByURL'],
	      linkInsertButtons:["linkBack"],
	      linkEditButtons:["linkOpen", "linkEdit", "linkRemove"],
	      toolbarButtons:a, imageDefaultAlign:"left", focusOnMarker:!0,
	      toolbarButtonsSM:a, imageDefaultAlign:"left", focusOnMarker:!0,
	      toolbarButtonsXS:a, imageDefaultAlign:"left", focusOnMarker:!0,
	      colorsBackground:i, colorsText:i, colorsStep:6,
	      imageUploadRemoteUrls: false,
	      // imageUpload: false,
	      imagePaste: true,
	      htmlUntouched: true,
	      useClasses: false,
	      pluginsEnabled: ["image", "link", "draggable", "codeView", "list", "colors", "align", "fontFamily", "fontSize", "lineBreaker", "specialCharacters", "table", "url", "spellChecker"]
	};
	// jQuery(selector).froalaEditor(o);
	return jQuery(selector).on('froalaEditor.initialized', function (e, editor) {
		editor.events.on('drop', function (dropEvent) {
			var dt = dropEvent.originalEvent.dataTransfer;

			if (dt && dt.files && dt.files.length) {
				var img = dt.files[0];

				if (img && img.type && img.type.indexOf('image') !== -1) {
					dropEvent.preventDefault();
					return false;
				}
			}
		}, true);
	}).on('froalaEditor.contentChanged', function (e, editor) {
		var content = editor.html.get();
		var regex = new RegExp('//i.froala.com/download');
		if(regex.test(content)){
			$('#signature-image-upload-'+selector_id).removeClass('hide');
		}else{
			$('#signature-image-upload-'+selector_id).addClass('hide');
		}
	}).froalaEditor(o);
}

$('.placeholders').click(function(event){
	$('#signatureEdit').froalaEditor('html.insert', event.target.value);
});

$('.placeholdersAdd').click(function(event){
	$('#signatureAdd').froalaEditor('html.insert', event.target.value);
});

function addSignatureClicked(){
	$('#addSignatureName').val('').trigger('change');
	$('#addSignatureConditions').val(null).trigger('change');
	$('#signatureAdd').froalaEditor('html.set', '');
	showLayer3();
}