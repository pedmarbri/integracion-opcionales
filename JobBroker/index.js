'use strict';

const JobQueueService = require('./job-queue-service');
const SapOrderQueueService = require('./sap-order-queue-service');
const OrderTableService = require('./order-table-service');
const CrmQueueService = require('./crm-queue-service');

exports.handler = function (event, context, callback) {

    let processSingleMessage = message => {
        return new Promise((resolve, reject) => {
            const acceptedTypes = ['order', 'creditmemo'];

            if (acceptedTypes.indexOf(message.json.type) < 0) {
                reject(new Error("Invalid message type"));
                return;
            }

            switch (message.json.type) {
                case 'order':
                    OrderTableService.saveMessage(message)
                        .then(CrmQueueService.sendMessage)
                        .then(JobQueueService.deleteMessage)
                        .then(SapOrderQueueService.sendMessage)
                        .then(resolve)
                        .catch(err => reject(err));
                    break;

                case 'creditmemo':
                    // TBD
                    resolve('creditmemo is not yet implemented');
                    break;

                default:
                    reject(new Error('Unexpected type case'));
            }

        });
    };

    let processMessages = messages => {

        if (messages && messages.length > 0) {
            return Promise.all(messages.map(message => processSingleMessage(message)));
        }

        return Promise.resolve("No messages");
    };

    JobQueueService.receiveMessages()
        .then(processMessages)
        .then(result => {
            callback(null, result);
        })
        .catch(error => {
           callback(error);
        });
};
