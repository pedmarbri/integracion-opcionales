'use strict';

const AWS = require('aws-sdk');

const JOB_QUEUE_URL = process.env.JOB_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const sqs = new AWS.SQS({ region: AWS_REGION });

exports.receiveMessages = () => {
    const params = {
        QueueUrl: JOB_QUEUE_URL,
        MaxNumberOfMessages: 10
    };

    return sqs.receiveMessage(params).promise()
        .then(result => {
            let messages = result.Messages;

            if (!messages || messages.length === 0) {
                return Promise.resolve([]);
            }

            return Promise.resolve(messages.map(message => {
                message.json = JSON.parse(message.Body);
                return message;
            }));
        });
};

exports.deleteMessage = message => {
    const params = {
        QueueUrl: JOB_QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle
    };

    return sqs.deleteMessage(params).promise().then(() => Promise.resolve(message));
};