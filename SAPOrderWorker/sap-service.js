'use strict';

const soap = require('soap');

const LN_STACK = String(process.env.LN_STACK);
const WSDL_URI = './sap-service-' + LN_STACK.toLowerCase() + '.wsdl';

// Service Credentials
const SAP_HTTP_USER = 'webservice';
const SAP_HTTP_PASS = '12345678';

exports.sendOrder = order => {

    const callSapService = client => {

        // const auth = 'Basic ' + new Buffer(SAP_HTTP_USER + ':' + SAP_HTTP_PASS).toString('base64');

        // client.addHttpHeader('Authorization', auth);

        return client.ZWS_GEN_PEDAsync();
    };

    return soap.createClientAsync(WSDL_URI)
        .then(callSapService);
};