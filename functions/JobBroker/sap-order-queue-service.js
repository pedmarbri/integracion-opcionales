'use strict';

const AWS = require('aws-sdk');

const AWS_REGION = process.env.AWS_REGION;
const SAP_ORDER_QUEUE_URL = process.env.SAP_ORDER_QUEUE_URL;

const sqs = new AWS.SQS({ region: AWS_REGION });

exports.sendMessage = message => {
    const params = {
        QueueUrl: SAP_ORDER_QUEUE_URL,
        MessageBody: JSON.stringify(message.json.payload)
    };

    return sqs.sendMessage(params).promise().then(() => Promise.resolve(message));
};

