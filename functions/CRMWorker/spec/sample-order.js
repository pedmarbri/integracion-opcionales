module.exports = {
    order_id: '12700000000065',
    timestamp: '2018-11-23T18:49:03Z',
    shipping_method: 'andreanisucursal_andreanisucursal',
    sales_channel: 'store',
    customer: {
        birth_date: '1987-12-12T00:00:00Z',
        email: 'example@domain.com',
        first_name: 'Juan',
        last_name: 'Perez',
        id_type: 'DNI',
        id_number: '12345678',
        gender: 'M'
    },
    totals: {
        subtotal: 1499.4,
        discount: 0,
        shipping: 0,
        finance_cost: 0,
        grand_total: 1499.4
    },
    billing_address: {
        country: 'AR',
        region: 'Capital Federal',
        city: 'Capital Federal',
        post_code: '1428',
        street: 'Cabildo',
        number: 2779,
        floor: '10',
        apartment: 'A',
        first_name: 'Juan',
        last_name: 'Perez',
        email: 'example@domain.com',
        telephone: '15-1234-5678',
    },
    shipping_address: {
        country: 'AR',
        region: 'Capital Federal',
        city: 'Capital Federal',
        post_code: '1428',
        street: 'Cabildo',
        number: 2779,
        floor: '10',
        apartment: 'A',
        first_name: 'Juan',
        last_name: 'Perez',
        email: 'example@domain.com',
        telephone: '15-1234-5678',
    },
    items: [
        {
            sku: 'OPC11086300001',
            name: 'Londres',
            qty: 6,
            weight: 1,
            row_weight: 6,
            list_price: 249.9,
            discount_percent: 0,
            discount_amount: 0,
            row_total: 1499.4,
            flags: [
                'exclusive'
            ]
        },
    ],
    payment: {
        method: 'mercadopago_standard',
        transaction_id: '1234'
    }
};