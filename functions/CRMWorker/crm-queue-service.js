'use strict';

const AWS = require('aws-sdk');

const CRM_QUEUE_URL = process.env.CRM_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const sqs = new AWS.SQS({ region: AWS_REGION });

exports.deleteMessage = message => {
    const params = {
        QueueUrl: CRM_QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle
    };

    return sqs.deleteMessage(params).promise().then(() => Promise.resolve(message));
};