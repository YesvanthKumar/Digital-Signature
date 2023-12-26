const fs = require('fs');
const { PDFDocument, PDFName, PDFNumber, PDFHexString, PDFString, StandardFonts, rgb } = require('pdf-lib');
const { SignPdf } = require('node-signpdf-gen');
const PDFArrayCustom = require('./PDFArrayCustom');
const PAGE_1_WIDTH = 600;
const PAGE_1_HEIGHT = 750;

class SignPDF {
  constructor(pdfFile, certFile, signatureText) {
    this.pdfDoc = fs.readFileSync(pdfFile);
    this.certificate = fs.readFileSync(certFile);
    this.signatureText = signatureText;
  }
  /**
   * @return Promise<Buffer>
   */
  async signPDF() {
    var signer = new SignPdf();
    let newPDF = await this._addPlaceholder();
    newPDF = signer.sign(newPDF, this.certificate);

    return newPDF;
  }

  /**
   * @see https://github.com/Hopding/pdf-lib/issues/112#issuecomment-569085380
   * @returns {Promise<Buffer>}
   */
  async _addPlaceholder() {
    const loadedPdf = await PDFDocument.load(this.pdfDoc);
    console.log(loadedPdf.context);
    const ByteRange = PDFArrayCustom.withContext(loadedPdf.context);
    
    // const DEFAULT_BYTE_RANGE_PLACEHOLDER = '**********';
    const DEFAULT_BYTE_RANGE_PLACEHOLDER = '**********';
    const SIGNATURE_LENGTH = 3322;
    const pages = loadedPdf.getPages();

    ByteRange.push(PDFNumber.of(0));
    ByteRange.push(PDFName.of(DEFAULT_BYTE_RANGE_PLACEHOLDER));
    ByteRange.push(PDFName.of(DEFAULT_BYTE_RANGE_PLACEHOLDER));
    ByteRange.push(PDFName.of(DEFAULT_BYTE_RANGE_PLACEHOLDER));
    const signatureDict = loadedPdf.context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange,
      Contents: PDFHexString.of('A'.repeat(SIGNATURE_LENGTH)),
      Reason: PDFString.of('We need your signature for reasons...'),
      M: PDFString.fromDate(new Date()),
    });
    // console.log('content');
    // console.log(PDFHexString.of('A'.repeat(SIGNATURE_LENGTH)));

    const signatureDictRef = loadedPdf.context.register(signatureDict);
    const widgetDict = loadedPdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: [57.64, 534.945, 488, 270], // Signature rect size
      V: signatureDictRef,
      T: PDFString.of('test signature'),
      F: 4,
      P: pages[0].ref,
    });

      console.log('widgetDict');
       console.log(widgetDict.context);
    const widgetDictRef = loadedPdf.context.register(widgetDict);

    // Add signature widget to the first page
    pages[0].node.set(PDFName.of('Annots'), loadedPdf.context.obj([widgetDictRef]));

    // Place Details Content
    const signatureFont = await loadedPdf.embedFont(StandardFonts.Helvetica);
    pages[0].drawText(this.signatureText.place, {
      x: PAGE_1_WIDTH *0.1,
      y: PAGE_1_HEIGHT * 0.1-10,
      size: 12,
      font: signatureFont,
      color: rgb(0, 0, 0),
    });
    pages[0].drawText(this.signatureText.date, {
      x: PAGE_1_WIDTH * 0.1 ,
      y: PAGE_1_HEIGHT * 0.1-30,
      size: 12,
      font: signatureFont,
      color: rgb(0, 0, 0),
    });
    pages[0].drawText('Yours faithfully', {
      x: PAGE_1_WIDTH * 0.9-50,
      y: PAGE_1_HEIGHT* 0.1-10,
      size: 12,
      font: signatureFont,
      color: rgb(0, 0, 0),
    });
    pages[0].drawText(this.signatureText.faithfull, {
      x: PAGE_1_WIDTH * 0.8 ,
      y: PAGE_1_HEIGHT* 0.1-30,
      size: 12,
      font: signatureFont,
      color: rgb(0, 0, 0),
    });
    loadedPdf.catalog.set(
      PDFName.of('AcroForm'),
      loadedPdf.context.obj({
        SigFlags: 3,
        Fields: [widgetDictRef],
      })
    );

    // Allows signatures on newer PDFs
    // @see https://github.com/Hopding/pdf-lib/issues/541
    const pdfBytes = await loadedPdf.save({ useObjectStreams: false });

    return SignPDF.unit8ToBuffer(pdfBytes);
  }

  /**
   * @param {Uint8Array} unit8
   */
  static unit8ToBuffer(unit8) {
    let buf = Buffer.alloc(unit8.byteLength);
    const view = new Uint8Array(unit8);

    for (let i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
    }
    return buf;
  }
}

module.exports = SignPDF;
