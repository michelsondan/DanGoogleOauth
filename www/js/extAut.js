function aut() {
    var options = {
        client_id: '650577198335-qffnsu7cedj38d8sad0c1aikkebdh6t5.apps.googleusercontent.com',
        client_secret: 'UuEiZoR_1ziSmK0xi85jirjr',
        redirect_uri: 'http://www.toyou.co.il/dan/aut/token.asp',
        scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
    };

    url = window.location.href;

    if (url.indexOf('code') < 0) {
        var authUrl = 'https://accounts.google.com/o/oauth2/auth?' + $.param({
            client_id: options.client_id,
            redirect_uri: options.redirect_uri,
            response_type: 'code',
            scope: options.scopes.join(' ')
        });

        location.href = authUrl;
    }
    else {
        var code = /\?code=(.+)$/.exec(url);

        $.support.cors = true;
        $.post('https://accounts.google.com/o/oauth2/token', {
            code: code[1],
            client_id: options.client_id,
            client_secret: options.client_secret,
            redirect_uri: options.redirect_uri,
            grant_type: 'authorization_code'
        }).done(function (data) {
            document.getElementById("txtToken").value = data.access_token;
        }).fail(function (xhr, status, error) {
            alert(error);
        });
    }
}

function driveloaded() {
    aut();
}

