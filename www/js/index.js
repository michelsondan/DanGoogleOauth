var version = '1.9.1';

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
    document.getElementById('txtver').innerText = 'גיא לומדה ' + version;

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
    //gapi.auth.setToken({
    //    access_token: 'ya29.Ci-XA9iJPD7PY75EbHDc76uwJCBtwQ-8E-jVX82v-nhTwnRn2xIUmtCKgcJrdeFdsA'
    //});

    //gapi.client.load('drive', 'v2', onDriveClientLoaded);
}

function onDriveClientLoaded(folderID) {
}

var jsonfiles;

function loadFolder(folderID) {
    jsonfiles = { files: [], folders: [] };
    curjsonindex = null;
    mainFolderId = folderID;
    noneMode();

    var request = gapi.client.drive.files.list({
        'q': '"' + folderID + '" in parents'
    });

    request.execute(function (resp) {
        var files = resp.items;
        if (files && files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                if (!file.explicitlyTrashed) {
                    //alert(file.title + ' (' + file.id + ') - ' + file.embedLink);
                    if (file.fileExtension && (file.fileExtension == 'm4a' || file.fileExtension == 'mp3' || file.fileExtension == 'docx' || file.fileExtension == 'doc')) {
                        jsonfiles.files.push({ id: file.id, title: file.title, folderId: null, folderChecked: false, answers: [] });
                    }
                    else if (file.mimeType && file.mimeType.indexOf('folder') >= 0) {
                        jsonfiles.folders.push({ id: file.id, title: file.title });
                    }
                }
            }
            for (var i = 0; i < jsonfiles.files.length; i++) {
                for (var j = 0; j < jsonfiles.folders.length; j++) {
                    if (jsonfiles.files[i].title == jsonfiles.folders[j].title) {
                        jsonfiles.files[i].folderId = jsonfiles.folders[j].id;
                        loadAnswers(jsonfiles.folders[j].id, jsonfiles.files[i]);
                        break;
                    }
                }
            }
        } else {
            var mainPanel = document.getElementById('mainPanel');
            mainPanel.innerHTML = '<ul class="list-group"><li class="list-group-item">אין קבצים</li></ul>';
        }
    });
}

function loadAnswers(folderID, question) {
    var request = gapi.client.drive.files.list({
        'q': '"' + folderID + '" in parents'
    });

    request.execute(function (resp) {
        var files = resp.items;
        if (files && files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                if (!file.explicitlyTrashed) {
                    //alert(file.title + ' (' + file.id + ') - ' + file.embedLink);
                    if (file.fileExtension && (file.fileExtension == 'm4a' || file.fileExtension == 'mp3')) {
                        question.answers.push({ id: file.id, title: file.title });
                    }
                }
            }
            question.folderChecked = true;
            checkIfAllAnswersDone();
        }
        else {
            //no answes.
            question.folderChecked = true;
            checkIfAllAnswersDone();
        }
    });
}

function checkIfAllAnswersDone() {
    var done = true;
    for (var i = 0 ; i < jsonfiles.files.length; i++) {
        if (jsonfiles.files[i].folderId) {
            if (jsonfiles.files[i].folderChecked == false) {
                done = false;
                break;
            }
        }
    }

    if (done == true) {
        var s = '<ul class="list-group">';
        for (var i = 0; i < jsonfiles.files.length; i++) {
            var schilds = '';
            if (jsonfiles.files[i].answers && jsonfiles.files[i].answers.length > 0) {
                for (var j = 0; j < jsonfiles.files[i].answers.length; j++) {
                    schilds += ('<a href="#" class="list-group-item list-group-item-success" onclick=setCurFile(this,"' + jsonfiles.files[i].answers[j].id + '",' + i + ',' + j + ');>' + jsonfiles.files[i].answers[j].title + '</a>');
                }
            }
            if (schilds == '') {
                s += ('<a href="#" class="list-group-item" onclick=setCurFile(this,"' + jsonfiles.files[i].id + '",' + i + ',-1);>' + jsonfiles.files[i].title + '</a>');
            }
            else {
                s += ('<a href="#" class="list-group-item" onclick=setCurFile(this,"' + jsonfiles.files[i].id + '",' + i + ',-1);>' + jsonfiles.files[i].title + '<ul class="list-group">' + schilds + '</ul></a>');
            }
        }
        s += '</ul>';
        var mainPanel = document.getElementById('mainPanel');
        mainPanel.innerHTML = s;
    }
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
    //window.resolveLocalFileSystemURL('file://' + imageURI, gotFile, fail);
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
                content = content.replace(/^data:audio\/wav;base64,/, ""); // !!!!!!!!!!!!!!!!!!!! !!! :-)
                //alert(content);
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
        'parents': [{ 'id': jsonfiles.files[curjsonindex].folderId }]
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
            alert('הקלטה עלתה');
            loadFolder(mainFolderId);
        };
    }

    request.execute(callback);
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
var lastItemClass;
var curjsonindex;

function setCurFile(item, id, jsonindex, jsonansindex) {
    curId = id;
    curjsonindex = jsonindex;

    if (lastItem != null)
        lastItem.className = lastItemClass;

    lastItem = item;
    lastItemClass = item.className;

    item.className = 'list-group-item active';

    var nme;
    if (jsonansindex >= 0)
        nme = jsonfiles.files[curjsonindex].answers[jsonansindex].title;
    else
        nme = jsonfiles.files[curjsonindex].title;
    if (nme.indexOf('.doc') >= 0) {
        wordMode();
    }
    else {
        soundMode();
    }
}

function wordMode() {
    document.getElementById("btnPlay").style.visibility = 'hidden';
    document.getElementById("btnStop").style.visibility = 'hidden';
    document.getElementById("btnRecord").style.visibility = 'visible';
    document.getElementById("btnWord").style.visibility = 'visible';
}

function soundMode() {
    document.getElementById("btnPlay").style.visibility = 'visible';
    document.getElementById("btnStop").style.visibility = 'hidden';
    document.getElementById("btnRecord").style.visibility = 'visible';
    document.getElementById("btnWord").style.visibility = 'hidden';
}
function noneMode() {
    document.getElementById("btnPlay").style.visibility = 'hidden';
    document.getElementById("btnStop").style.visibility = 'hidden';
    document.getElementById("btnRecord").style.visibility = 'hidden';
    document.getElementById("btnWord").style.visibility = 'hidden';
}

function playAudio() {
    if (my_media != null) {
    }

    if (curId != null) {
        my_media = new Media('https://drive.google.com/uc?export=download&id=' + curId, function () { },
                // error callback 
                function (err) { playAudioAfterForceSharing() }, function (status) { playStatus(status) });
        my_media.play();
    }
}

function playAudioAfterForceSharing() {
    var req = gapi.client.drive.permissions.list({ 'fileId': curId });
    req.execute(function (res) {
        var rdr = false;
        for (var t = 0; t < res.result.items.length; t++) {
            if (res.result.items[t].role == 'reader') {
                rdr = true;
                break;
            }
        }
        if (!rdr) {
            var req2 = gapi.client.drive.permissions.insert({ 'fileId': curId, resource: { 'withLink': true, 'type': 'anyone', 'role': 'reader', 'value': 'default' } });
            req2.execute(function (res2) {
                my_media = new Media('https://drive.google.com/uc?export=download&id=' + curId, function () { },
                        // error callback 
                        function (err) { alert(err) }, function (status) { playStatus() });
                my_media.play();
            });
        }
    });
}

function playStatus(status) {
    switch (status) {
        case 2:
            document.getElementById('btnPlay').style.visibility = 'hidden';
            document.getElementById('btnRecord').style.visibility = 'hidden';
            document.getElementById('btnStop').style.visibility = 'visible';
            break;
        case 4:
            document.getElementById('btnPlay').style.visibility = 'visible';
            document.getElementById('btnRecord').style.visibility = 'visible';
            document.getElementById('btnStop').style.visibility = 'hidden';
            break;
    }
}

function stopAudio() {
    my_media.stop();
}

function recAudio() {
    if (curjsonindex != null) {
        if (curjsonindex >= 0) {
            if (jsonfiles.files[curjsonindex].folderId == null) {
                var data = new Object();
                data.title = jsonfiles.files[curjsonindex].title;
                data.parents = [{ "id": mainFolderId }];
                data.mimeType = "application/vnd.google-apps.folder";
                gapi.client.drive.files.insert({ 'resource': data }).execute(function (fileList) {
                    jsonfiles.files[curjsonindex].folderId = fileList.id;
                    navigator.device.capture.captureAudio(captureSuccess, captureError);
                });
            }
            else {
                navigator.device.capture.captureAudio(captureSuccess, captureError);
            }
        }
        else {
            alert('נא לבחור קובץ');
        }
    }
    else {
        alert('נא לבחור קובץ');
    }
}

function openWord() {
    var authWindow = window.open('https://drive.google.com/open?id=' + curId, '_blank', 'location=yes,toolbar=yes,enableViewportScale=yes');
}

// capture error callback
var captureError = function (error) {
    navigator.notification.alert('Error code: ' + error.code, null, 'Capture Error');
};

var lastlimenu;
function focusFolder(id) {
    var txtCurFolderCntrl = document.getElementById('txtCurFolder');
    var menu = document.getElementById(id);
    var limenu = document.getElementById('li' + id);
    txtCurFolderCntrl.innerText = menu.innerText;
    if (lastlimenu) {
        lastlimenu.className = "";
    }
    lastlimenu = limenu;

    limenu.className = "active";
}

var mainFolderId;

$("#folder1").click(function () {
    focusFolder('folder1');
    loadFolder('0BxOZ7Vr1rW6NWlFibXNhM0dZRW8');
});

$("#folder2").click(function () {
    focusFolder('folder2');
    loadFolder('0BxOZ7Vr1rW6NMEk1YU5ab3pZa2M');
});

$("#folder3").click(function () {
    focusFolder('folder3');
    loadFolder('0BxOZ7Vr1rW6NdkY4T2Vfam1obkk');
});

$("#folder4").click(function () {
    focusFolder('folder4');
    loadFolder('0BxOZ7Vr1rW6NQWpCU19BdF9zVXc');
});

$("#folder5").click(function () {
    focusFolder('folder5');
    loadFolder('0BxOZ7Vr1rW6NLXBDaHNTV00ySG8');
});
