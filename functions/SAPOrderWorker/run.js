'use strict';

process.env.LN_STACK = 'Test';
process.env.ORDER_TABLE = 'OrderTableTest';
process.env.AWS_REGION = 'us-east-1';

const lambda = require('./index');


lambda.handler(
    {
        Body: JSON.stringify({
            "order_id": "12700100029",
            "timestamp": "2018-04-01T15:26:00Z",
            "shipping_method": "Oca",
            "sales_channel": "Glamit",
            "customer": {
                "birth_date": "1984-07-10T00:00:00Z",
                "email": "matias@semexpert.com.ar",
                "first_name": "Matías",
                "last_name": "Montes",
                "id_type": "DNI",
                "id_number": "31088937",
                "gender": "M"
            },
            "totals": {
                "subtotal": 1199.4,
                "discount": 0,
                "shipping": 0,
                "finance_cost": 0,
                "grand_total": 1199.4
            },
            "billing_address": {
                "country": "AR",
                "region": "CABA",
                "city": "CABA",
                "post_code": "1428",
                "street": "Blanco Encalada",
                "number": 2387,
                "floor": "2",
                "apartment": "B",
                "first_name": "Matías",
                "last_name": "Montes",
                "email": "administracion@semexpert.com.ar",
                "telephone": "47849298"
            },
            "shipping_address": {
                "country": "AR",
                "region": "CABA",
                "city": "CABA",
                "post_code": "1428",
                "street": "Cabildo",
                "number": 2779,
                "floor": "10",
                "apartment": "A",
                "first_name": "Matías",
                "last_name": "Montes",
                "email": "matias@semexpert.com.ar",
                "telephone": "50322879"
            },
            "items": [
                {
                    "sku": "OPC11083000010",
                    "name": "LIEBHERR-RL 64",
                    "qty": 1,
                    "weight": 1,
                    "row_weight": 1,
                    "list_price": 199.9,
                    "discount_percent": 0,
                    "discount_amount": 0,
                    "row_total": 199.9,
                    "flags": []
                },
                {
                    "sku": "OPC11065300060",
                    "name": "VOLVO-G940",
                    "qty": 5,
                    "weight": 1,
                    "row_weight": 1,
                    "list_price": 199.9,
                    "discount_percent": 0,
                    "discount_amount": 0,
                    "row_total": 999.5,
                    "flags": []
                }
            ],
            "payment": {
                "method": "Mercadopago",
                "transaction_id": "3593694338"
            }
        })
    },
    {},
    function (err, result) {
        console.error(err);
        console.log(result);
    }
);