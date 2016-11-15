<%
    
    Dim httpRequest,data
    
    data ="code=" & request.QueryString("code")
    data = data & "&client_id=650577198335-qffnsu7cedj38d8sad0c1aikkebdh6t5.apps.googleusercontent.com"
    data = data & "&client_secret=UuEiZoR_1ziSmK0xi85jirjr"
    data = data & "&redirect_uri=http://www.toyou.co.il/dan/aut/token.asp"
    data = data & "&grant_type=authorization_code"

        
    Set httpRequest = Server.CreateObject("MSXML2.ServerXMLHTTP")
    httpRequest.Open "POST", "https://accounts.google.com/o/oauth2/token", False
    httpRequest.SetRequestHeader "Content-Type", "application/x-www-form-urlencoded"
    httpRequest.Send data

    response.Write(httpRequest.ResponseText)
%>