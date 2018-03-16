'use strict';

const AWS = require('aws-sdk');

const JOB_QUEUE_URL = process.env.JOB_QUEUE_URL;
const SAP_ORDER_QUEUE_URL = process.env.SAP_ORDER_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const sqs = new AWS.SQS({ region: AWS_REGION });
const db = new AWS.DynamoDB();


exports.handler = function (event, context, callback) {
    console.log('sendMessageToSapOrderQueue');
    const params2 = {QueueUrl: JOB_QUEUE_URL, MaxNumberOfMessages: 10};
    let receiveMessagesPromise = sqs.receiveMessage(params2).promise();

    let sendMessageToSapOrderQueue = payload => {
        console.log('sendMessageToSapOrderQueue - ' + payload.order_id);
        const params = {
            QueueUrl: SAP_ORDER_QUEUE_URL,
            MessageBody: JSON.stringify(payload)
        };

        return sqs.sendMessage(params).promise();
    };

    let deleteFromJobQueue = message => {
        return () => {
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
                        S: '123'
                    },
                    payload: {
                        S: 'a very long json string'
                    }
                },
                TableName: 'Order',
                ConditionExpression: "attribute_not_exists(order_id)"
            };

            return db.putItem(params).promise();
        };
    };

    let processSingleMessage = message => {
        return new Promise((resolve, reject) => {
            const messageBody = JSON.parse(message.Body);
            const acceptedTypes = ['order', 'creditmemo'];

            if (acceptedTypes.indexOf(messageBody.type) < 0) {
                reject(new Error("Invalid message type"));
            } else {
                switch (messageBody.type) {
                    case 'order':
                        sendMessageToSapOrderQueue(messageBody.payload)
                            .then(deleteFromJobQueue(message))
                            .then(saveInDb(message))
                            .then(Promise.resolve("Done " + message.MessageId))
                            .catch(err => resolve(err));

                        break;

                    case 'creditmemo':
                        // TBD
                        resolve('creditmemo is not yet implemented');
                        break;

                    default:
                        reject(new Error('Unexpected type case'));
                }
            }

        });
    };

    let processMessages = sqsResult => {
        let messages = sqsResult.Messages;

        if (messages && messages.length > 0) {
            return Promise.all(messages.map(message => processSingleMessage(message)));
        }

        return Promise.resolve("No messages");
    };

    receiveMessagesPromise
        .then(processMessages)
        .then(result => {
            console.log(result);
            callback(null, result);
        })
        .catch(error => {
           console.log(error);
           callback(error);
        });

};
