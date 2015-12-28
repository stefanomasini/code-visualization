import Rx from 'rx-dom';
import * as constants from './constants';


function now() {
    return new Date().getTime();
}


export function readEventBlocks(socketSubject, socketReadySubject) {
    var firstEventTimestamp = null
    function eventNormalizedTs(eventTs, start) {
        if (firstEventTimestamp === null) {
            firstEventTimestamp = eventTs;
        }
        return (eventTs - firstEventTimestamp) / constants.eventsSpeedupFactor + start;
    }
    var eventsBuffer = [];
    var eventsCompleted = false;
    var arriving = false;
    var requestedAmount = 0;
    var consumedAmount = 0;
    socketSubject.map(msg => JSON.parse(msg.data))
        .subscribe(
            event => {
                eventsBuffer.push(event);
                arriving = true;
            },
            null,
            () => { eventsCompleted = true; }
        );

    function requestOther(amount) {
        socketSubject.onNext(amount);
        requestedAmount += amount;
    }
    socketReadySubject.subscribe(() => requestOther(constants.eventsBufferAllowance + constants.eventsBufferChunkSize));

    return Rx.Observable.create(observer => {
        var start = now();
        var realWorldTs = null;
        var idx = 0;
        function sendBlock() {
            if (eventsCompleted && eventsBuffer.length === 0) {
                observer.onCompleted();
                return;
            }
            var currentTs = now();

            var block = [];
            while (eventsBuffer.length > 0 && eventNormalizedTs(eventsBuffer[0].ts, start) < currentTs) {
                event = eventsBuffer[0];
                eventsBuffer = eventsBuffer.slice(1);
                realWorldTs = event.ts;
                block.push(event)
                idx += 1;
                consumedAmount += 1;
            }

            if (realWorldTs) {
                observer.onNext({
                    events: block,
                    elapsed: currentTs-start,
                    realWorldTs
                });
            }

            if (!eventsCompleted && consumedAmount > requestedAmount-constants.eventsBufferAllowance && arriving == true) {
                requestOther(constants.eventsBufferChunkSize);
                arriving = false;
            }

            setTimeout(sendBlock, constants.tickInterval);
        };
        setTimeout(sendBlock, constants.tickInterval);
    });
}
