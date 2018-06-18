'use strict';

const SapOrderQueueService = require('./sap-order-queue-service');
const SapOrderWorker = require('./sap-order-worker-service');
const TIMEOUT_THRESHOLD = 120000;

const processMessages = messages => {
    if (messages && messages.length > 0) {
        console.log('Processing ' + messages.length + ' messages');
        return Promise.all(messages.map(message => SapOrderWorker.process(message)));
    }

    /**
     * Resolve to false to indicate that the batch was empty and trigger process end
     */
    return Promise.resolve(false);
};

exports.handler = function (event, context, callback) {

    let batch = 1;

    const work = previousBatch => {
        console.log('Batch ' + batch++);

        if (previousBatch !== false && context.getRemainingTimeInMillis() > TIMEOUT_THRESHOLD) {
            return SapOrderQueueService.receiveMessages()
                .then(processMessages)
                .then(work);
        }

        return Promise.resolve("Done");
    };

    work(true, context)
        .then(result => callback(null, result))
        .catch(callback);
};