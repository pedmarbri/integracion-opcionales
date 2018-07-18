'use strict';

const AWS = require('aws-sdk');

const AWS_REGION = process.env.AWS_REGION;
const BAU_QUEUE_URL = process.env.BAU_QUEUE_URL;

const sqs = new AWS.SQS({ region: AWS_REGION });

exports.sendMessage = message => {
  
  console.log('[sendMessage]', JSON.stringify(message));
  
  const params = {
    QueueUrl: BAU_QUEUE_URL,
    MessageBody: JSON.stringify(message.order)
  };

  return sqs.sendMessage(params).promise().then(() => Promise.resolve(message));
};