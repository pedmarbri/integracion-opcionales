'use strict';

const soap = require('soap');
const isoCountries = require('./iso-countries');

const LN_STACK = String(process.env.LN_STACK);
const WSDL_URI = './crm-service-' + LN_STACK.toLowerCase() + '.wsdl';

const ID_TYPE_DNI = 'DNI';
const ID_TYPE_PASSPORT = 'PAS';
const ID_TYPE_PASSPORT_LONG = 'PASAPORTE';

exports.fetchContact = order => {
    const queryContact = client => {
        const request = {
            numDoc: order.customer.id_number,
            pagina: 1,
            filasXPagina: 1,
            tipoDoc: order.customer.id_type
        };

        console.log('[fetchContact' + ' - ' + order.order_id + '] Request parameters', JSON.stringify(request));

        return client.Consulta_ContactoPorDocumentoAsync(request, { timeout: 3000 })
            .then(result => {
                let contact = null;

                console.log('[fetchContact' + ' - ' + order.order_id + '] XML Request', client.lastRequest);
                console.log('[fetchContact' + ' - ' + order.order_id + '] Result', JSON.stringify(result));
                console.log('[fetchContact' + ' - ' + order.order_id + '] XML Response', client.lastResponse);


                if (result.length > 0 && result[0].hasOwnProperty("Consulta_ContactoPorDocumentoResult") &&
                    result[0].Consulta_ContactoPorDocumentoResult.hasOwnProperty("Contactos") &&
                    result[0].Consulta_ContactoPorDocumentoResult.Contactos &&
                    result[0].Consulta_ContactoPorDocumentoResult.Contactos.hasOwnProperty("Contacto")
                ) {
                    contact = result[0].Consulta_ContactoPorDocumentoResult.Contactos.Contacto[0];
                }

                return Promise.resolve({
                    order: order,
                    contact: contact
                });
            })
            .catch(error => {
                console.log('[fetchContact' + ' - ' + order.order_id + '] XML Request', client.lastRequest);
                console.log('[fetchContact' + ' - ' + order.order_id + '] Catched error', JSON.stringify(error));
                console.log('[fetchContact' + ' - ' + order.order_id + '] XML Response', client.lastResponse);

                return Promise.resolve({
                    order: order,
                    contact: null,
                    error: error
                });
            });
    };

    console.log('[fetchContact' + ' - ' + order.order_id + '] Fetching contact from CRM');

    return soap.createClientAsync(WSDL_URI)
        .then(queryContact);
};

exports.insertContact = result => {
  const getGenderFromCustomer = function (customer) {
    return customer.gender ? customer.gender : null;
  };

  const createContact = client => {
        const formatIdType = (customer, address) => {
            if (customer.id_type.toUpperCase() === ID_TYPE_PASSPORT_LONG) {
                return ID_TYPE_PASSPORT;
            }

            if (customer.id_type.toUpperCase() === ID_TYPE_DNI && address.country.toUpperCase() !== 'AR') {
                return ID_TYPE_PASSPORT;
            }

            return customer.id_type;
        };

    const formatStreetNumber = function (number) {
      if (parseInt(number) > 0) {
        return number;
      }
      return 'N/A';
    };

    const request = {
            listaContactos: {
                ContactoMasivo: [
                    {
                        UP: true,
                        VinculoLN: 'PROSPECT',
                        CondicionIVA: 'No Responsable',
                        TipoDoc: formatIdType(result.order.customer, result.order.billing_address),
                        NumeroDoc: result.order.customer.id_number,
                        PrimerNombre: result.order.customer.first_name,
                        Apellido: result.order.customer.last_name,
                        Sexo: getGenderFromCustomer(result.order.customer),
                        Email: result.order.customer.email,
                        Pais: isoCountries.getCountryName(result.order.billing_address.country),
                        Provincia: result.order.billing_address.region,
                        Localidad: result.order.billing_address.city,
                        Barrio: 'No Informa',
                        CodigoPostal: result.order.billing_address.post_code,
                        Calle: result.order.billing_address.street,
                        Numero: formatStreetNumber(result.order.billing_address.number),
                        Piso: result.order.billing_address.floor,
                        Dpto: result.order.billing_address.apartment,
                        TipoPropiedad: 'No Informa',
                        NombrePropiedad: 'No Informa',
                        TelCasa: result.order.billing_address.telephone,
                    }
                ]
            }
        };

        if (result.order.shipping_address.telephone &&
            result.order.billing_address.telephone !== result.order.shipping_address.telephone) {
            request.listaContactos.ContactoMasivo[0].TelTrabajo = result.order.shipping_address.telephone;
        }

        console.log('[insertContact' + ' - ' + result.order.order_id + '] Request parameters', JSON.stringify(request));

        return client.Alta_Masiva_ContactoAsync(request, { timeout: 5000 })
            .then(insertResult => {
                let respuestaMasiva;

                console.log('[insertContact' + ' - ' + result.order.order_id + '] XML Request', client.lastRequest);
                console.log('[insertContact' + ' - ' + result.order.order_id + '] Result', JSON.stringify(insertResult));
                console.log('[insertContact' + ' - ' + result.order.order_id + '] XML Response', client.lastResponse);

                if (insertResult.length > 0 && insertResult[0].hasOwnProperty('Alta_Masiva_ContactoResult') &&
                    insertResult[0].Alta_Masiva_ContactoResult.hasOwnProperty('RespuestaMasiva')
                ) {

                    respuestaMasiva = insertResult[0].Alta_Masiva_ContactoResult.RespuestaMasiva[0];
                    console.log('[insertContact' + ' - ' + result.order.order_id + '] Respuesta Masiva', respuestaMasiva);

                    if (!respuestaMasiva.Resultado || respuestaMasiva.Resultado === 'false') {
                        return Promise.resolve(
                            {
                                order: result.order,
                                contact: null,
                                error: new Error('[' + respuestaMasiva.TipoError + '] ' + respuestaMasiva.MensajeError)
                            }
                        );
                    }

                    return Promise.resolve({
                       order: result.order,
                       contact: respuestaMasiva
                    });
                }

                return Promise.reject(new Error("An error ocurred"));

            })
            .catch(error => {
                console.log('[insertContact' + ' - ' + result.order.order_id + '] Catched error', JSON.stringify(error));

                return Promise.resolve({
                   order: result.order,
                   contact: null,
                   error: error
                });
            });

    };

    console.log('[insertContact' + ' - ' + result.order.order_id + '] Creating new contact in CRM');

    return soap.createClientAsync(WSDL_URI)
        .then(createContact);
};