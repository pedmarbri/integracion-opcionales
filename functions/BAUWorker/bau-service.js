'use strict';

const sql = require('mssql');

const CONNUSER = process.env.CONNUSER;
const CONNPASS = process.env.CONNPASS;
const CONNSERVER = process.env.CONNSERVER;
const CONNDATABASE = process.env.CONNDATABASE;
const CONNPORT = process.env.CONNPORT;

const config = {
    user: CONNUSER,
    password: CONNPASS,
    server: CONNSERVER,
    database: CONNDATABASE,
    port: CONNPORT,
    options: {
        encrypt: false,
        abortTransactionOnError: true
    }
};


// https://www.npmjs.com/package/mssql#transaction

exports.saveOrder = order => {
    /** @var {ConnectionPool} connection */
    const connection = new sql.ConnectionPool(config);

    return connection.connect().then(() => {
        /** @var {Transaction} transaction */
        const transaction = connection.transaction();

        return transaction.begin();
    })
        .then((transaction) => {
            const request = transaction.request();

            request.input('order_id', sql.VarChar(64), order.sap_id);
            request.input('glamit_id', sql.VarChar(64), order.order_id);
            request.input('timestamp', sql.DateTime(), new Date(order.timestamp));
            request.input('crm_id', sql.VarChar(12), order.crm_contact_id);
            request.input('total', sql.Money(), order.totals.grand_total);

            return request.query('INSERT INTO [order] (order_id, glamit_id, timestamp, crmId, total) VALUES (@order_id, @glamit_id, @timestamp, @crm_id, @total)')
                .then(() => {
                    // Make a chain of promises that resolve sequentially so the connection is released for each request
                    return order.items.reduce((chain, item) => {
                        return chain.then(() => {
                            const request = transaction.request();

                            request.input('order_id', sql.VarChar(64), order.sap_id);
                            request.input('sku', sql.VarChar(512), item.sku);
                            request.input('row_total', sql.Money(), item.row_total);

                            return request.query('INSERT INTO [order_items] (order_id, sku, row_total) VALUES (@order_id, @sku, @row_total)');
                        });
                    }, Promise.resolve()); // Initial promise
                })
                .then(() => {
                    return transaction.commit();
                });
        })
        .then(() => connection.close())
        .then(() => Promise.resolve({order: order, error: null}))
        .catch(error => {
            connection.close();
            return Promise.reject({order: order, error: error});
        });
};
