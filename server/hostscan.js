const spawn = require('child_process');
const readline = require('readline');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 1337 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

    ws.send(JSON.stringify({add:hosts,scans:nmaps}));
});

// Broadcast to all.
wss.broadcast = function broadcast(data) {
    data = JSON.stringify(data);
    console.log("wss.broadcast:");
    console.log(data);
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

function do_arp_scan(cb) {
    console.log("doing arp scan");
    const child = spawn.spawn("/usr/bin/arp-scan", ["-q", "-N", "--localnet"]);
    const rl = readline.createInterface({
	input: child.stdout,
	output: null
    });
    var h = {};

    rl.on('line',(l)=>{
	var m;
	if (m = l.match(/(\d+\.\d+\.\d+\.\d+)\t(..:..:..:..:..:..)/))
	    h[m[2]]=m[1];
    });

    child.on('exit', function (code, signal) {
	if (code || signal) {
	    console.log('child process exited with ' +
			`code ${code} and signal ${signal}`);
	}
	cb(h);
    });
}

var hosts = {};
var nmaps = {};

function arp_done(h) {
    var to_remove=[], to_add={};
    for (i in h) {
	if (!hosts[i]) {
	    hosts[i] = h[i];
	    console.log("added "+i+" "+h[i]);
	    to_add[i] = h[i];
	    if (!nmaps[i])
		nmap_scan(h[i],
			  ((i)=>function nmap_done(h,d) {
			      wss.broadcast({scans:{[i]:d}});
			      console.log("nmap done:"+h);
			      nmaps[i]=d;
			      console.log(d);
			  })(i)
			 );
	    else
		console.log("skipping already-scanned host "+h[i]+" ("+i+")");
	}
    }
    for (i in hosts) {
	if (!h[i]) {
	    delete hosts[i];
	    //to_remove.push(i);
	    console.log("removed "+i+" "+hosts[i]);
	}
    }
    wss.broadcast({remove:to_remove,add:to_add});
}

setInterval(()=>do_arp_scan(arp_done), 20000);
    
function nmap_scan(h,cb) {
    console.log("scanning "+h);
    var nmap = require('node-nmap');
    var scan = new nmap.OsAndPortScan(h);
    scan.scanTimeout = 60000;
    scan.additionalArguments = "-Pn -n -T4 --max-os-tries 1";
    scan.on('complete',function(data){
	//console.log("done");
	cb(h,data);
    });
    scan.on('error', function(error){
	console.log("error: "+error);
    });
    
    scan.startScan();
}
