const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const numToWords = require('number-to-words'); // Using number-to-words library

async function generateInvoice(data) {
    // Load the EJS template file
    const templateFile = path.join(__dirname, 'templates', 'invoice_template.ejs');
    const templateContent = await fs.readFile(templateFile, 'utf8');

    // Compute derived parameters for each item
    const items = data.items.map(item => {
        const netAmount = item.UnitPrice * item.Quantity - (item.Discount || 0);
        let taxType, totalTax;
        if (data.placeOfSupply === data.placeOfDelivery) {
            const cgst = netAmount * 0.09; // Assuming CGST and SGST are 9% each
            const sgst = netAmount * 0.09;
            totalTax = cgst + sgst;
            taxType = 'CGST/SGST';
        } else {
            const igst = netAmount * 0.18; // Assuming IGST is 18%
            totalTax = igst;
            taxType = 'IGST';
        }
        const totalAmount = netAmount + totalTax;
        return {
            ...item,
            NetAmount: netAmount.toFixed(2),
            TaxType: taxType,
            TotalTax: totalTax.toFixed(2),
            TotalAmount: totalAmount.toFixed(2)
        };
    });

    // Calculate totals
    const totalNet = items.reduce((sum, item) => sum + parseFloat(item.NetAmount), 0);
    const totalTax = items.reduce((sum, item) => sum + parseFloat(item.TotalTax), 0);
    const totalAmount = totalNet + totalTax;
    const totalAmountInWords = numToWords.toWords(totalAmount).replace(/-/g, ' ');

    // Data to be rendered in the template
    const templateData = {
        ...data,
        items,
        totalNet: totalNet.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        totalAmountInWords
    };

    // Render the HTML with EJS
    const html = ejs.render(templateContent, templateData);

    // Launch Puppeteer to create a PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Save the PDF to a file
    await page.pdf({ path: 'invoice.pdf', format: 'A4' });

    await browser.close();
    console.log('Invoice generated successfully.');
}

// Example data
const data = {
    companyLogo: 'path/to/logo.png',
    seller: {
        Name: 'Varasiddhi Silk Exports',
        Address: '75, 3rd Cross, Lalbagh Road',
        City: 'BENGALURU',
        State: 'KARNATAKA',
        Pincode: '560027',
        PAN: 'AACFV3325K',
        GST: '29AACFV3325K1ZY'
    },
    placeOfSupply: 'KARNATAKA',
    billing: {
        Name: 'Madhu B',
        Address: 'Eurofins IT Solutions India Pvt Ltd., 1st Floor, Maruti Platinum, Lakshminarayana Pura, AECS Layout',
        City: 'BENGALURU',
        State: 'KARNATAKA',
        Pincode: '560037',
        StateCode: '29'
    },
    shipping: {
        Name: 'Madhu B',
        Address: 'Eurofins IT Solutions India Pvt Ltd., 1st Floor, Maruti Platinum, Lakshminarayana Pura, AECS Layout',
        City: 'BENGALURU',
        State: 'KARNATAKA',
        Pincode: '560037',
        StateCode: '29'
    },
    placeOfDelivery: 'KARNATAKA',
    order: {
        OrderNo: '403-3225714-7676307',
        OrderDate: '2019-10-28'
    },
    invoice: {
        InvoiceNo: 'IN-761',
        InvoiceDate: '2019-10-28',
        InvoiceDetails: 'KA-310565025-1920'
    },
    reverseCharge: 'No',
    items: [
        {
            Description: 'Varasiddhi Silks Men\'s Formal Shirt (SH-05-42, Navy Blue, 42) B07KGF3KW8 ( SH-05-42 ) Shipping Charges',
            UnitPrice: 338.10,
            Quantity: 1,
            Discount: 0,
            TaxRate: 18
        },
        {
            Description: 'Varasiddhi Silks Men\'s Formal Shirt (SH-05-40, Navy Blue, 40) B07KGCS2X7 ( SH-05-40 ) Shipping Charges',
            UnitPrice: 338.10,
            Quantity: 1,
            Discount: 0,
            TaxRate: 18
        }
    ],
    signatureImage: 'path/to/signature.png'
};

// Generate the invoice
generateInvoice(data);
