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

    let sendMessageToSapOrderQueue = payload => {
        return SapOrderQueueService.sendMessage(payload);
    };

    let deleteFromJobQueue = message => {
        return (prev) => {
            console.log(prev);
            console.log('deleteFromJobQueue - ' + message.MessageId);

            const params = {
                QueueUrl: JOB_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle
            };

            return sqs.deleteMessage(params).promise();
        };
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
            const messageBody = message.json;
            const acceptedTypes = ['order', 'creditmemo'];

            if (acceptedTypes.indexOf(messageBody.type) < 0) {
                reject(new Error("Invalid message type"));
                return;
            }

            switch (messageBody.type) {
                case 'order':
                    sendMessageToSapOrderQueue(messageBody.payload)
                        .then(deleteFromJobQueue(message))
                        .then(saveInDb(messageBody))
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
