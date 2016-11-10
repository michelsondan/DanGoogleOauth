var googleapi = {
    authorize: function (options) {
        var deferred = $.Deferred();

        //Build the OAuth consent page URL
        var authUrl = 'https://accounts.google.com/o/oauth2/auth?' + $.param({
            client_id: options.client_id,
            redirect_uri: options.redirect_uri,
            response_type: 'code',
            scope: options.scopes.join(' ')
        });        
        //Open the OAuth consent page in the InAppBrowser
        var authWindow = window.open(authUrl, '_blank', 'location=no,toolbar=no');
        //The recommendation is to use the redirect_uri "urn:ietf:wg:oauth:2.0:oob"
        //which sets the authorization code in the browser's title. However, we can't
        //access the title of the InAppBrowser.
        //
        //Instead, we pass a bogus redirect_uri of "http://localhost", which means the
        //authorization code will get set in the url. We can access the url in the
        //loadstart and loadstop events. So if we bind the loadstart event, we can
        //find the authorization code and close the InAppBrowser after the user
        //has granted us access to their data.
        $(authWindow).on('loadstart', function (e) {
            var url = e.originalEvent.url;
            var code = /\?code=(.+)$/.exec(url);
            var error = /\?error=(.+)$/.exec(url);
            if (code || error) {
                //Always close the browser when match is found
                authWindow.close();
            }

            if (code) {
                //Exchange the authorization code for an access token
                $.support.cors = true;
                $.post('https://accounts.google.com/o/oauth2/token', {
                    code: code[1],
                    client_id: options.client_id,
                    client_secret: options.client_secret,
                    redirect_uri: options.redirect_uri,
                    grant_type: 'authorization_code'
                }).done(function (data) {
                    gapi.auth.setToken({
                        access_token: data.access_token
                    });

                    gapi.client.load('drive', 'v2', onDriveClientLoaded);

                    document.getElementById('tok').value = data.access_token;

                    deferred.resolve(data);
                }).fail(function (xhr, status, error) {
                    deferred.reject(xhr);
                });
            } else if (error) {
                //The user denied access to the app
                deferred.reject({
                    error: error[1]
                });
            }
        });

        return deferred.promise();
    }
};

$(document).on('deviceready', function () {
    var $loginButton = $('#login a');
    var $loginStatus = $('#login p');

    $loginButton.on('click', function () {
        googleapi.authorize({
            client_id: '650577198335-t2e4l1fk8pg3pf7nbbitcr7keifnr5cf.apps.googleusercontent.com',
            client_secret: '1N67xbR-wbKIXTogmWfvMb26',
            redirect_uri: 'http://localhost',
            scopes: [ 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
        }).done(function (data) {
            $loginStatus.html('Access Token: ' + data.access_token);
        }).fail(function (data) {
            $loginStatus.html(data.error);
        });
    });
});

function driveloaded() {
    alert('drive loaded');
}

function onDriveClientLoaded() {
    var request = gapi.client.drive.files.list({
        'q': '"0BxOZ7Vr1rW6NWlFibXNhM0dZRW8" in parents'
    });

    request.execute(function (resp) {
        var files = resp.items;
        if (files && files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                alert(file.title + ' (' + file.id + ') - ' + file.embedLink);
                document.getElementById('waves').innerHTML += '<iframe src="' + file.embedLink + '"></iframe>';
                if (i == 0) {
                    var myMedia = new Media('https://drive.google.com/uc?export=download&id=0B5cPqh4mvftUdEJwemk5cjZDMG8');
                    myMedia.play({ numberOfLoops: 2 });
                }
            }
        } else {
            alert('No files found.');
        }
    });
}

function Cap() {
    alert('go');
    navigator.camera.getPicture(uploadPhoto,
                                          function (message) { alert('צילום תמונה נכשל'); },
                                          {
                                              quality: 20,
                                              destinationType: navigator.camera.DestinationType.FILE_URI
                                          });
}

function uploadPhoto(imageURI) {
    alert('ok');
    getFileContentAsBase64(imageURI, function (base64Image) {
        //window.open(base64Image);
        alert(base64Image);
        // Then you'll be able to handle the myimage.png file as base64
    });
}

function getFileContentAsBase64(imageURI, callback) {
    window.resolveLocalFileSystemURL(imageURI, gotFile, fail);

    function fail(e) {
        alert('Cannot found requested file');
    }

    function gotFile(fileEntry) {
        fileEntry.file(function (file) {
            alert('1');
            var reader = new FileReader();
            reader.onloadend = function (e) {
                alert('2');
                var content = this.result;
                callback(content);
            };
            // The most important point, use the readAsDatURL Method from the file plugin
            alert('4');
            alert(file);
            reader.readAsDataURL(file);
            alert('5');
        });
    }
}