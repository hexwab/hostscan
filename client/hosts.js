var hosts = {}, scans = {};

function wsstart() {
    ws = new WebSocket("ws://127.0.0.1:1337/");
    ws.onopen = connected;
    ws.onclose = reconnect;
    ws.onerror = ()=>console.log("ws error");
    ws.onmessage = onmsg;
}
function onmsg(e) {
    console.log(e.data);
    m=JSON.parse(e.data);
    if (m.remove) {
	for (var i in m.remove) {
	    delete hosts[i];
	    console.log("host disappeared: "+hosts[i]);
	}
    }
    if (m.add) {
	for (var i in m.add) {
	    hosts[i] = m.add[i];
	    if ('remove' in m) { // not inital host dump
		console.log("new host: "+hosts[i]);
	    }
	}	
    }
    if (m.scans) {
	for (var i in m.scans) {
	    scans[i] = m.scans[i];
	    console.log("scan for host "+i+": "+JSON.stringify(scans[i]));
	}
    }
}
function reconnect() {
    console.log("reconnecting");
    window.setTimeout(wsstart,300);
}
function connected() {
    console.log("connected");
    
}
wsstart();
