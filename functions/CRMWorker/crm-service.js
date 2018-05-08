'use strict';

const soap = require('soap');

const LN_STACK = String(process.env.LN_STACK);
const WSDL_URI = './crm-service-' + LN_STACK.toLowerCase() + '.wsdl';

exports.fetchContact = order => {
    const queryContact = client => {
        const request = {
            numDoc: order.customer.id_number,
            pagina: 1,
            filasXPagina: 1,
            tipoDoc: order.customer.id_type
        };

        console.log(JSON.stringify(request));

        return client.Consulta_ContactoPorDocumentoAsync(request, { timeout: 3000 })
            .then(result => {
                let contact = null;

                console.log(JSON.stringify(result));

                if (result.Consulta_ContactoPorDocumentoResult.Contactos) {
                    contact = result.Consulta_ContactoPorDocumentoResult.Contactos.Contacto[0];
                }

                return Promise.resolve({
                    order: order,
                    contact: contact
                });
            })
            .catch(error => {
                console.log(JSON.stringify(error));

                return Promise.resolve({
                    order: order,
                    contact: null,
                    error: error
                });
            });
    };

    console.log('Fetching contact from CRM');

    return soap.createClientAsync(WSDL_URI)
        .then(queryContact);
};

exports.insertContact = result => {
    const createContact = client => {
        const request = {
            listaContactos: {
                ContactoMasivo: [
                    {
                        UP: false,
                        VinculoLN: 'PROSPECT',
                        CondicionIVA: 'No Responsable',
                        TipoDoc: result.order.customer.id_type,
                        NumeroDoc: result.order.customer.id_number,
                        PrimerNombre: result.order.customer.first_name,
                        Apellido: result.order.customer.last_name,
                        Sexo: result.order.customer.gender,
                        Email: result.order.customer.email,
                        Pais: result.order.billing_address.country,
                        Provincia: result.order.billing_address.region,
                        Localidad: result.order.billing_address.city,
                        CodigoPostal: result.order.billing_address.post_code,
                        Calle: result.order.billing_address.street,
                        Numero: result.order.billing_address.number,
                        Piso: result.order.billing_address.floor,
                        Dpto: result.order.billing_address.apartment,
                        TelCasa: result.order.billing_address.telephone,
                    }
                ]
            }
        };

        if (result.order.shipping_address.telephone && result.order.billing_address.telephone !== result.order.shipping_address.telephone) {
            request.listaContactos.ContactoMasivo[0].TelTrabajo = result.order.shipping_address.telephone;
        }

        return client.Alta_Masiva_ContactoAsync(request, { timeout: 5000 })
            .then(insertResult => {
                return Promise.resolve({
                   order: result.order,
                   contact: insertResult.Alta_Masiva_ContactoResult.RespuestaMasiva[0]
                });
            })
            .catch(error => {
                return Promise.resolve({
                   order: result.order,
                   contact: null,
                   error: error
                });
            });

    };

    console.log('Creating new contact in CRM');

    return soap.createClientAsync(WSDL_URI)
        .then(createContact);
};