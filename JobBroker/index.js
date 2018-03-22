'use strict';

const AWS = require('aws-sdk');
const JobQueueService = require('./job-queue-service');
const SapOrderQueueService = require('./sap-order-queue-service');

const JOB_QUEUE_URL = process.env.JOB_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;
const ORDER_TABLE = process.env.ORDER_TABLE;

const sqs = new AWS.SQS({ region: AWS_REGION });
const db = new AWS.DynamoDB();

exports.handler = function (event, context, callback) {

    let sendMessageToSapOrderQueue = message => {
        return SapOrderQueueService.sendMessage(message.json.payload).then(() => Promise.resolve(message));
    };

    const saveInDb = (message) => {
        return () => {
            const params = {
                Item: {
                    order_id: {
                        S: message.payload.order_id
                    },
                    payload: {
                        S: JSON.stringify(message.payload)
                    }
                },
                TableName: ORDER_TABLE,
                ConditionExpression: "attribute_not_exists(order_id)"
            };

            return db.putItem(params).promise();
        };
    };

    let processSingleMessage = message => {
        return new Promise((resolve, reject) => {
            const acceptedTypes = ['order', 'creditmemo'];

            if (acceptedTypes.indexOf(message.json.type) < 0) {
                reject(new Error("Invalid message type"));
                return;
            }

            switch (message.json.type) {
                case 'order':
                    sendMessageToSapOrderQueue(message)
                        .then(JobQueueService.deleteMessage)
                        .then(saveInDb(message.json))
                        .then(() => resolve("Done " + message.MessageId))
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
