'use strict';

const TASK_QUEUE_URL = process.env.SAP_CM_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: AWS_REGION });

exports.receiveMessages = () => {
    const params = {
        QueueUrl: TASK_QUEUE_URL,
        MaxNumberOfMessages: 10
    };

    return sqs.receiveMessage(params).promise();

};