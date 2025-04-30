import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Define Storage Paths for API Data
const DATA_DIR = path.join(process.cwd(), 'storedData');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const CUSTOM_FIELDS_FILE = path.join(DATA_DIR, 'customFields.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const TAX_CODES_FILE = path.join(DATA_DIR, 'taxCodes.json');
const TAX_RATES_FILE = path.join(DATA_DIR, 'taxRates.json');


if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Function to Make API Calls to QuickBooks
const qboRequest = async (endpoint, token, method = 'GET', body = null) => {
    try {
        const options = {
            method,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) options.body = JSON.stringify(body);

        console.log("🔍 Invoice Request URL:", endpoint);
        if (body) {
            console.log("🧾 QBO Payload:", JSON.stringify(body, null, 2));
          }

        const response = await fetch(endpoint, options);
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error(`Error calling QBO API [${method} ${endpoint}]:`, error);
        return null;
    }
};

// Fetch Customers from QuickBooks
export const fetchCustomersFromQBO = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Customer`;
    const response = await qboRequest(endpoint, token);
    const customers = response?.QueryResponse?.Customer || [];
    
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
    console.log(`Fetched ${customers.length} customers from QBO.`);
    return customers;
};

// Fetch Items from QuickBooks
export const fetchItemsFromQBO = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Item`;
    const response = await qboRequest(endpoint, token);
    const items = response?.QueryResponse?.Item || [];
    
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
    console.log(`Fetched ${items.length} items from QBO.`);
    return items;
};

// Fetch Payments from QuickBooks
export const fetchPaymentsFromQBO = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Payment`;
    const response = await qboRequest(endpoint, token);
    const payments = response?.QueryResponse?.Payment || [];
    
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
    console.log(`Fetched ${payments.length} payments from QBO.`);
    return payments;
};

// Fetch existing invoice to discover CustomField definitions
export const fetchCustomFieldDefinitions = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Invoice MAXRESULTS 1`;
    const response = await qboRequest(endpoint, token);
    const invoice = response?.QueryResponse?.Invoice?.[0];

    const fieldMap = {};
    if (invoice?.CustomField) {
        for (const field of invoice.CustomField) {
            if (field.Name) {
                fieldMap[field.Name] = field.DefinitionId;
            }
        }
    }

    fs.writeFileSync(CUSTOM_FIELDS_FILE, JSON.stringify({ [realmId]: fieldMap }, null, 2));
    return fieldMap;
};

// Fetch locations (departments)
export const fetchDepartments = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Department`;
    const response = await qboRequest(endpoint, token);
    const departments = response?.QueryResponse?.Department || [];

    fs.writeFileSync(DEPARTMENTS_FILE, JSON.stringify({ [realmId]: departments }, null, 2));
    return departments;
};

// Fetch tax codes
export const fetchTaxCodes = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM TaxCode`;
    const response = await qboRequest(endpoint, token);
    const taxCodes = response?.QueryResponse?.TaxCode || [];

    fs.writeFileSync(TAX_CODES_FILE, JSON.stringify({ [realmId]: taxCodes }, null, 2));
    return taxCodes;
};

// Fetch tax rates
export const fetchTaxRates = async (token, realmId) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM TaxRate`;
    const response = await qboRequest(endpoint, token);
    const taxRates = response?.QueryResponse?.TaxRate || [];

    fs.writeFileSync(TAX_RATES_FILE, JSON.stringify({ [realmId]: taxRates }, null, 2));
    return taxRates;
};

// Create a New Customer in QuickBooks
export const createCustomer = async (token, realmId, customerData) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/customer`;
    return await qboRequest(endpoint, token, 'POST', customerData);
};

// Create a New Invoice in QuickBooks
export const createInvoice = async (token, realmId, invoiceData) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice`;
    return await qboRequest(endpoint, token, 'POST', invoiceData);
};

// Create a New Payment in QuickBooks
export const createPayment = async (token, realmId, paymentData) => {
    const endpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/payment`;
    return await qboRequest(endpoint, token, 'POST', paymentData);
};
