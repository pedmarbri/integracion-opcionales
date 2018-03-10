'use strict';

var AWS = require('aws-sdk');
var async = require('async');

var JOB_QUEUE_URL = process.env.JOB_QUEUE_URL;
var SAP_ORDER_QUEUE_URL = process.env.SAP_ORDER_QUEUE_URL;
var AWS_REGION = process.env.AWS_REGION;

var sqs = new AWS.SQS({region: AWS_REGION});

function receiveMessages(callback) {
    var params = {
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
    console.log(order);

    var params = {
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

function handleSQSMessages(context, callback) {
    receiveMessages(function(err, messages) {
        if (messages && messages.length > 0) {
            var invocations = [];
            messages.forEach(function(message) {

                var messageBody = JSON.parse(message.Body);

                if (messageBody.type === 'order') {
                    invocations.push(function(callback) {
                        sendToSapOrderQueue(message.payload, callback);
                    });
                }

            });
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

// TODO Delete processed messages

exports.handler = function (event, context, callback) {
    handleSQSMessages(context, function(err) {
        if (err) {
            callback(err);
        }
    });
};
