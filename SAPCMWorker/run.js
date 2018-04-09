'use strict';

process.env.LN_STACK = 'Test';
const lambda = require('./index');

lambda.handler(
    {
        Body: JSON.stringify({
            "creditmemo_id": "70800708",
            "order_id": "{{$randomInt}}00{{$randomInt}}",
            "timestamp": "2018-03-16T20:03:15Z",
            "totals": {
                "shipping": 35
            },
            "items": [
                {
                    "sku": "colecciones_978841612704700011-UN-UN",
                    "qty": 1,
                    "refund_amount": 199.9,
                    "row_total": 199.9
                }
            ]
        })
    },
    {},
    function (err, result) {
        console.error(err);
        console.log(result);
    }
);