'use strict';

process.env.LN_STACK = 'Test';
const lambda = require('./index');

//0500000025

lambda.handler(
    {
        Body: JSON.stringify({
            "creditmemo_id": "12700100402",
            "order_id": "12700100002",
            "sap_order_id": "0500000028",
            "timestamp": "2018-04-10T14:59:00Z",
            "totals": {
                "shipping": 0
            },
            "items": [
                {
                    "sku": "OPC11065300060",
                    "name": "VOLVO-G940",
                    "qty": 2,
                    "refund_amount": 199.9,
                    "row_total": 399.8,
                    "sap_row": 20,
                    "discount_amount": 19.99,
                    "discount_percent": 10
                }
            ]
        })
    },
    {},
    function (err, result) {
        console.error(JSON.stringify(err));
        console.log(JSON.stringify(result));
    }
);