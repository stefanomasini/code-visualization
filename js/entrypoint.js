import Rx from 'rx-dom';
import moment from 'moment';

import { readEventBlocks } from './events';
import { buildWorld, advanceWorldTick } from './model';
import { preloadTextures, Scene } from './view';


var socketReadySubject = new Rx.AsyncSubject();
var socketSubject = Rx.DOM.fromWebSocket('ws://127.0.0.1:4080', null, socketReadySubject);


function main({authors, projects}) {
    var allProjectsDict = {};
    projects.forEach(p => allProjectsDict[p.name] = p);

    preloadTextures(authors);

    var scene = new Scene(window.innerWidth, window.innerHeight, allProjectsDict, rendererDomElement => {
        var container = document.createElement( 'div' );
        document.body.appendChild( container );
        container.appendChild( rendererDomElement );
    });

    window.addEventListener('resize', event => {
        scene.resizeScreen(window.innerWidth, window.innerHeight)
    }, false);

    var worldTicks$ = readEventBlocks(socketSubject, socketReadySubject);

    var world$ = worldTicks$.scan((world, tick) => advanceWorldTick(world, tick), buildWorld()).share();

    var animation$ = Rx.Observable.generate(0, x => true, x => x + 1, x => x, Rx.Scheduler.requestAnimationFrame)
          .timestamp().share();

    Rx.Observable.combineLatest(
        animation$,
        world$,
        (animation, world) => ({ ts: animation.timestamp, world: world })
    ).distinct(s => s.ts).subscribe(scene.draw.bind(scene));

    world$.sample(100).subscribe(world => {
        document.getElementById('time').innerHTML = moment(world.realWorldTs).format('D MMM YYYY');
    });

    var fps$ = animation$.scan((acc, current) => (acc + 1), 0).sample(1000).pairwise().map(([prev, next]) => next-prev);
    fps$.subscribe(n => {
        document.getElementById('fps').innerHTML = n;
    });
}


Rx.DOM.ready().subscribe(() => {
    fetch('/info')
        .then(result => result.json())
        .then(info => {
            main(info);
        });
});

