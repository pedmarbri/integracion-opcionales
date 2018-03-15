'use strict';

const AWS = require('aws-sdk');
const async = require('async');

const JOB_QUEUE_URL = process.env.JOB_QUEUE_URL;
const SAP_ORDER_QUEUE_URL = process.env.SAP_ORDER_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const sqs = new AWS.SQS({ region: AWS_REGION });

function receiveMessages(callback) {
    const params = {
        QueueUrl: JOB_QUEUE_URL,
        MaxNumberOfMessages: 10
    };
    sqs.receiveMessage(params, function(err, data) {
        if (err) {
            console.error(err, err.stack);
            callback(err);
        } else {
            callback(null, data.Messages);
        }
    });
}

function sendToSapOrderQueue(order, callback) {

    const params = {
        QueueUrl: SAP_ORDER_QUEUE_URL,
        MessageBody: JSON.stringify(order)
    };

    sqs.sendMessage(params, function(err, data) {
        if (err) {
            console.error(err, err.stack);
            callback(err);
        } else {
            callback(null, data.MessageId);
        }
    });
}

function deleteMessage(receiptHandle, callback) {
    const params = {
        QueueUrl: JOB_QUEUE_URL,
        ReceiptHandle: receiptHandle
    };

    sqs.deleteMessage(params, function(err) {
        if (err) {
            console.error(err, err.stack);
            callback(err);
        } else {
            callback(null, "DONE");
        }
    });
}

function handleSQSMessages(context, callback) {
    receiveMessages(function(err, messages) {
        let invocations = [];

        function handleIndividualMessage(message) {
            const messageBody = JSON.parse(message.Body);

            // TODO Send to DynamoDB
            // TODO Delete processed messages
            if (messageBody.type === 'order') {
                invocations.push(function(callback) {
                    sendToSapOrderQueue(messageBody.payload, function(err) {
                        if (err) {
                            console.error(err, err.stack);
                            callback(err);
                            return;
                        }

                        deleteMessage(message.ReceiptHandle, callback);
                    });
                });
            }

        }

        if (messages && messages.length > 0) {

            messages.forEach(handleIndividualMessage);
            async.parallel(invocations, function(err) {
                if (err) {
                    console.error(err, err.stack);
                    callback(err);
                } else {
                    if (context.getRemainingTimeInMillis() > 20000) {
                        handleSQSMessages(context, callback);
                    } else {
                        callback(null, 'PAUSE');
                    }
                }
            });
        } else {
            callback(null, 'DONE');
        }
    });
}


exports.handler = function (event, context, callback) {
    handleSQSMessages(context, function(err) {
        callback(err);
    });
};
