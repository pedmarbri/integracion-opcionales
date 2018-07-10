'use strict';

const JobQueueService = require('./job-queue-service');
const SapCMQueueService = require('./sap-cm-queue-service');
const OrderTableService = require('./order-table-service');
const CrmQueueService = require('./crm-queue-service');
const TIMEOUT_THRESHOLD = 10000;

const processSingleMessage = message => {
    return new Promise((resolve, reject) => {

        switch (message.json.type) {
            case 'order':
                OrderTableService.saveMessage(message)
                    .then(CrmQueueService.sendMessage)
                    .then(JobQueueService.deleteMessage)
                    .then(resolve)
                    .catch(reject);
                break;

            case 'creditmemo':
                JobQueueService.deleteMessage(message)
                    .then(SapCMQueueService.sendMessage)
                    .then(resolve)
                    .catch(reject);
                break;

            default:
                reject(new Error('Invalid message type'));
        }

    });
};

const processMessages = messages => {

    if (messages && messages.length > 0) {
        return Promise.all(messages.map(message => processSingleMessage(message)));
    }

    /**
     * Resolve to false to indicate that the batch was empty and trigger process end
     */
    return Promise.resolve(false);
};

exports.handler = function (event, context, callback) {

    const work = previousBatch => {

        if (previousBatch !== false && context.getRemainingTimeInMillis() > TIMEOUT_THRESHOLD) {
            return JobQueueService.receiveMessages()
                .then(processMessages)
                .then(work);
        }

        return Promise.resolve("Done");
    };

    work(true, context)
        .then(result => callback(null, result))
        .catch(callback);
};
