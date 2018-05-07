'use strict';

const SapCMQueueService = require('./sap-cm-queue-service');
const SapCMWorker = require('./sap-cm-worker-service');
const TIMEOUT_THRESHOLD = 10000;

const processMessages = messages => {
    if (messages && messages.length > 0) {
        console.log('Processing ' + messages.length + ' messages');
        return Promise.all(messages.map(message => SapCMWorker.process(message)));
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
            return SapCMQueueService.receiveMessages()
                .then(processMessages)
                .then(work);
        }

        return Promise.resolve("Done");
    };

    work(true)
        .then(result => callback(null, result))
        .catch(callback);
};