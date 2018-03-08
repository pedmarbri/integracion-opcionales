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

function sendToSapOrderQueue(message, callback) {
    var params = {
        QueueUrl: SAP_ORDER_QUEUE_URL,
        MessageBody: JSON.stringify(message.payload)
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
                invocations.push(function(callback) {
                    sendToSapOrderQueue(message, callback);
                });
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

exports.handler = function (event, context, callback) {
    handleSQSMessages(context, callback);
};
