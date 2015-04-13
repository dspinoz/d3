#!/usr/bin/env node

var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);

var pcap = require('pcap'),
    pcap_session = pcap.createSession('enp0s3', "ip proto \\tcp");

app.configure(function() {
  app.use(express.logger('dev'));
});

app.get('/', function(req,res) {
  res.sendfile('index5.html');
});
app.get('/flare.json', function(req,res) {
  res.sendfile('flare.json');
});

  app.get('/jquery.js', function(req,res) {
    res.sendfile('bower_components/jquery/dist/jquery.js');
  });

  app.get('/bootstrap.js', function(req,res) {
    res.sendfile('bower_components/bootstrap/dist/js/bootstrap.js');
  });

  app.get('/bootstrap.css', function(req,res) {
    res.sendfile('bower_components/bootstrap/dist/css/bootstrap.css');
  });

  app.get('/bootstrap.css.map', function(req,res) {
    res.sendfile('bower_components/bootstrap/dist/css/bootstrap.css.map');
  });

  app.get('/fonts/glyphicons-halflings-regular.svg', function(req,res) {
    res.sendfile('bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.svg');
  });

  app.get('/fonts/glyphicons-halflings-regular.ttf', function(req,res) {
    res.sendfile('bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.ttf');
  });

  app.get('/fonts/glyphicons-halflings-regular.woff', function(req,res) {
    res.sendfile('bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.woff');
  });

app.get('/d3.js', function(req,res) {
  res.sendfile('bower_components/d3/d3.js');
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});
 
wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browser.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}

var clients = [];
var count = 0;
var packet_cache = [];

pcap_session.on('packet', function (raw_packet) {
  var packet = pcap.decode.packet(raw_packet);

if (packet.payload && packet.payload.payload && packet.payload.payload.version == 4) {

  packet_cache.push({src: packet.payload.payload.saddr, dst: packet.payload.payload.daddr});
  if (packet_cache.length > 50) {

console.log(++count * packet_cache.length);
  for(var i=0; i < clients.length; i++) {
    if (clients[i]) {
      clients[i].sendUTF(JSON.stringify(packet_cache));
    }
  }

    packet_cache = [];
  }
}
});
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection from ' +request.origin+ ' accepted.');

    //my client index
    var index = clients.push(connection) - 1;

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message from ' +index+': ' + message.utf8Data);

            var js = JSON.parse(message.utf8Data);

            if (js.txt) {
	      //broadcast to all clients
	      for(var i=0; i < clients.length; i++) {
                if (clients[i]) {
                  //clients[i].sendUTF(JSON.stringify({id:index, txt: js.txt}));
                }
              }
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
      clients[index] = undefined;
      for(var i=0; i < clients.length; i++) {
        if (i != index && clients[i]) {
          //clients[i].sendUTF(JSON.stringify({left: true, id:index}));
        }
      }
    });
});



