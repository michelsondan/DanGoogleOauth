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

    $loginButton.on('click', function() {
        googleapi.authorize({
            client_id: '650577198335-t2e4l1fk8pg3pf7nbbitcr7keifnr5cf.apps.googleusercontent.com',
            client_secret: '1N67xbR-wbKIXTogmWfvMb26',
            redirect_uri: 'http://localhost',
            scopes: ['https://www.googleapis.com/auth/analytics.readonly','https://www.googleapis.com/auth/drive.metadata.readonly']
        }).done(function(data) {
            $loginStatus.html('Access Token: ' + data.access_token);
        }).fail(function(data) {
            $loginStatus.html(data.error);
        });
    });
});

function driveloaded() {
    alert('drive loaded');
}

function onDriveClientLoaded() {
    var request = gapi.client.drive.files.list({
        'pageSize': 10,
        'fields': "nextPageToken, files(id, name)"
    });

    request.execute(function (resp) {
        var files = resp.files;
        alert(files);
        if (files && files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                alert(file.name + ' (' + file.id + ')');
            }
        } else {
            alert('No files found.');
        }
    });
}