const fs = require('fs');
const path = require('path');
var randomNumber = Math.floor(Math.random() * 5000);
const pdfName = `./exported_file_${randomNumber}.pdf`;
const SignPDF = require("./SignPDF");

async function main() {

    var signatureText = { 'place': 'Place : mumbai', 'date': 'Date : 22-12-2023', 'Pan': "ASDEC1234F",'faithfull':'s.Yesvanth Kumar' }; // Signature text
    const pdfBuffer = new SignPDF(
        path.resolve('./minions.pdf'),
        path.resolve('./cert.p12'),
        signatureText
    );

    const signedDocs = await pdfBuffer.signPDF();

    try {
        fs.writeFileSync(pdfName, signedDocs);
        
        console.log('Write files');
    } catch (err) {
        console.log('Error Come', err);
    }
    console.log(`New Signed PDF created called: ${pdfName}`);
}

main();

