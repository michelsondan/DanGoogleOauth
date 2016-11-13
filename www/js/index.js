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
                    document.getElementById("txtToken").value = data.access_token;
                    gapi.auth.setToken({
                        access_token: data.access_token
                    });

                    gapi.client.load('drive', 'v2', onDriveClientLoaded);

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

    googleapi.authorize({
        client_id: '650577198335-t2e4l1fk8pg3pf7nbbitcr7keifnr5cf.apps.googleusercontent.com',
        client_secret: '1N67xbR-wbKIXTogmWfvMb26',
        redirect_uri: 'http://localhost',
        scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
    }).done(function (data) {

    }).fail(function (data) {

    });

});

function driveloaded() {

}

function onDriveClientLoaded(folderID) {
}

function loadFolder(folderID) {
    var request = gapi.client.drive.files.list({
        'q': '"' + folderID + '" in parents'
    });

    request.execute(function (resp) {
        var files = resp.items;
        if (files && files.length > 0) {
            var s = '<ul class="list-group">';
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.explicitlyTrashed) {
                    //alert(file.title + ' (' + file.id + ') - ' + file.embedLink);
                    s += ('<a href="#" class="list-group-item" onclick=setCurFile(this,"' + file.id + '");>' + file.title + '</a>');
                }
            }
            s += '</ul>';
            var mainPanel = document.getElementById('mainPanel');
            mainPanel.innerHTML = s;
        } else {
            var mainPanel = document.getElementById('mainPanel');
            mainPanel.innerHTML = '<ul class="list-group"><li class="list-group-item">אין קבצים</li>';
        }
    });
}

function Cap() {
    navigator.camera.getPicture(uploadPhoto,
                                          function (message) { alert('צילום תמונה נכשל'); },
                                          {
                                              quality: 20,
                                              destinationType: navigator.camera.DestinationType.FILE_URI
                                          });
}

function uploadPhoto(imageURI) {
    getFileContentAsBase64(imageURI, function (base64Image) {
        insertFile(base64Image);
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
            fileObject = file;
            var reader = new FileReader();
            reader.onloadend = function (e) {
                var content = e.target.result;
                content = content.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""); // !!!!!!!!!!!!!!!!!!!! !!! :-)
                content = content.replace(/^data:audio\/(mpeg|mpg);base64,/, ""); // !!!!!!!!!!!!!!!!!!!! !!! :-)
                callback(content);
            };
            // The most important point, use the readAsDatURL Method from the file plugin
            reader.readAsDataURL(file);
        });
    }
}

var fileObject;

function insertFile(base64Image, callback) {
    var boundary = '-------314159265358979323846';
    var delimiter = "\r\n--" + boundary + "\r\n";
    var close_delim = "\r\n--" + boundary + "--";

    var contentType = fileObject.type || 'application/octet-stream';

    var metadata = {
        'title': fileObject.name,
        'mimeType': contentType,
        'parents': [{ 'id': '0BxOZ7Vr1rW6NWlFibXNhM0dZRW8' }]
    };

    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Image +
        close_delim;

    alert(multipartRequestBody);

    var request = gapi.client.request({
        'path': '/upload/drive/v2/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });

    if (!callback) {
        callback = function (file) {
            alert('תמונה עלתה');
        };
    }

    request.execute(callback);
}

function Rec() {
    navigator.device.capture.captureAudio(captureSuccess, captureError);
}

// capture callback
var captureSuccess = function (mediaFiles) {
    var i, path, len;
    for (i = 0, len = mediaFiles.length; i < len; i += 1) {
        path = mediaFiles[i].fullPath;

        getFileContentAsBase64(path, function (base64Image) {
            insertFile(base64Image);
            // Then you'll be able to handle the myimage.png file as base64
        });

        //////////////path = mediaFiles[i].localURL;
        //////////////var my_media = new Media(path, function () {  },
        //////////////// error callback 
        //////////////function (err) { alert(err) });
        //////////////my_media.play();
    }
};

var curId;
var my_media;
var lastItem;

function setCurFile(item, id) {
    if (lastItem != null)
        lastItem.className = 'list-group-item';
    item.className = 'list-group-item active';
    curId = id;
    lastItem = item;
}

function playAudio() {
    if (curId != null) {
        my_media = new Media('https://drive.google.com/uc?export=download&id=' + curId, function () { },
                // error callback 
                function (err) { alert(err) });
        my_media.play();
    }
}

function stopAudio() {
    my_media.stop();
}

// capture error callback
var captureError = function (error) {
    navigator.notification.alert('Error code: ' + error.code, null, 'Capture Error');
};


$("#folder1").click(function () {
    loadFolder('0BxOZ7Vr1rW6NWlFibXNhM0dZRW8');
});

$("#folder2").click(function () {
    loadFolder('0BxOZ7Vr1rW6NMEk1YU5ab3pZa2M');
});

$("#folder3").click(function () {
    loadFolder('0BxOZ7Vr1rW6NdkY4T2Vfam1obkk');
});

$("#folder4").click(function () {
    loadFolder('0BxOZ7Vr1rW6NQWpCU19BdF9zVXc');
});

$("#folder5").click(function () {
    loadFolder('0BxOZ7Vr1rW6NLXBDaHNTV00ySG8');
});
