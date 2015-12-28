var Rx = require('rx');
var server = require('http').createServer(),
    url = require('url'),
    WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({server: server}),
    express = require('express'),
    app = express(),
    port = 4080;
var readline = require('readline');
var fs = require('fs');
var info = JSON.parse(fs.readFileSync('info.json', 'utf8'));

Rx.Observable.fromEvent(wss, 'connection').subscribe(ws => {
    console.log('Client connected');

    var events$ = Rx.Observable.fromEvent(readline.createInterface({
          input: fs.createReadStream('events.stream')
    }), 'line').controlled();

    events$.subscribe(eventStr => {
        ws.send(eventStr, function(err) {
            if (err) {
                console.log('There was an error sending the message');
            }
        });
    })

    Rx.Observable.fromEvent(ws, 'message').subscribe(amount => {
        events$.request(parseInt(amount));
        console.log(`requested ${amount} more`);
    });
});

app.get('/info', (req, res) => res.send(info));

app.use(express.static('.'));

server.on('request', app);
server.listen(port, () => console.log('Listening on ' + server.address().port));
