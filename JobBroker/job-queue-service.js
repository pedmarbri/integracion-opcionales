'use strict';

const AWS = require('aws-sdk');

const JOB_QUEUE_URL = process.env.JOB_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const params = {
    QueueUrl: JOB_QUEUE_URL,
    MaxNumberOfMessages: 10
};

const sqs = new AWS.SQS({ region: AWS_REGION });

exports.receiveMessages = () => {
    return sqs.receiveMessage(params).promise();
};