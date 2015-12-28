var Rx = require('rx');
var readline = require('readline');
var fs = require('fs');
var path = require('path');
var url = require('url');
var express = require('express');
var http = require('http');
var ws = require('ws');

var HTTP_PORT = 4080;

var server = http.createServer(),
    wss = new ws.Server({server: server}),
    app = express();

if (process.argv.length !== 3) {
    console.log("Missing work directory parameter.");
    process.exit(1);
}
var workDir = process.argv[2];
if (!fs.existsSync(workDir)) {
    console.log(`Path ${workDir} does not exist.`);
    process.exit(1);
}
if (!fs.lstatSync(workDir).isDirectory()) {
    console.log(`Path ${workDir} is not a directory.`);
    process.exit(1);
}


var config = JSON.parse(fs.readFileSync(path.join(workDir, 'config.json'), 'utf8'));

var usernames = [];
(new Set(Object.keys(config.userMap).map(gitName => config.userMap[gitName]))).forEach(username => usernames.push(username));

function buildInfoObject() {
    return {
        title: config.title,
        authors: usernames,
        projects: config.projects.map(project => ({
            name: project.name,
            color: project.color,
        })),
    }
}

Rx.Observable.fromEvent(wss, 'connection').subscribe(ws => {
    console.log('Client connected');

    var events$ = Rx.Observable.fromEvent(readline.createInterface({
          input: fs.createReadStream(path.join(workDir, 'events.stream'))
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

app.get('/info', (req, res) => res.send(buildInfoObject()));

app.use('/avatars', express.static(path.join(workDir, 'avatars')));

app.use(express.static('.'));

server.on('request', app);
server.listen(HTTP_PORT, () => console.log('Listening on ' + server.address().port));
