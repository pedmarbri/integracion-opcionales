'use strict';

const soap = require('soap');

const LN_STACK = String(process.env.LN_STACK);
const WSDL_URI = './sap-service-' + LN_STACK.toLowerCase() + '.wsdl';

const callSapService = client => {
    return client.ZWS_GEN_PEDAsync();
};

exports.sendOrder = order => {
    return soap.createClientAsync(WSDL_URI)
        .then(callSapService);
};