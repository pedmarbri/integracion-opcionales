'use strict';

const AWS = require('aws-sdk');

const WORKER_LAMBDA_NAME = process.env.CRM_WORKER;
const AWS_REGION = process.env.AWS_REGION;

const lambda = new AWS.Lambda({ region: AWS_REGION });

exports.process = message => {
    console.log(message);
    const params = {
        FunctionName: WORKER_LAMBDA_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify(message)
    };

    return lambda.invoke(params).promise();
};