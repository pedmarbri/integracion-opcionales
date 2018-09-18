'use strict';

const TASK_QUEUE_URL = process.env.CRM_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: AWS_REGION });

exports.receiveMessages = () => {
    const params = {
        QueueUrl: TASK_QUEUE_URL,
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