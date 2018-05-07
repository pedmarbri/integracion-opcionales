'use strict';

const CRMQueueService = require('./crm-queue-service');
const CRMWorker = require('./crm-worker-service');

const TIMEOUT_THRESHOLD = 10000;

const processMessages = messages => {

    if (messages && messages.length > 0) {
        console.log('Processing ' + messages.length + ' messages');
        return Promise.all(messages.map(message => CRMWorker.process(message)));
    }

    /**
     * Resolve to false to indicate that the batch was empty and trigger process end
     */
    return Promise.resolve(false);
};

exports.handler = (event, context, callback) => {
    let batch = 1;

    const work = previousBatch => {
        console.log('Batch ' + batch++);

        if (previousBatch !== false && context.getRemainingTimeInMillis() > TIMEOUT_THRESHOLD) {
            return CRMQueueService.receiveMessages()
                .then(processMessages)
                .then(work);
        }

        return Promise.resolve("Done");
    };

    work(true)
        .then(result => callback(null, result))
        .catch(callback);
};