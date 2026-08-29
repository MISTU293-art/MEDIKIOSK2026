const Document = require('../models/Document');
const OcrService = require('../services/ocrService');
const ImageKitService = require('../services/imageKitService');
const logger = require('../utils/logger');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { patientId, sessionToken, docType = 'Prescription' } = req.body;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;

    // 1. Upload to ImageKit.io CDN with optimization
    const ikResult = await ImageKitService.uploadMedicalDocument(filePath, originalName, [docType, 'patient_document']);
    const fileUrl = ikResult.url;

    // 2. Perform OCR text extraction
    const ocrResult = await OcrService.extractDocumentText(filePath, mimeType, originalName);

    // 3. Save Document record
    const document = await Document.create({
      patientId: patientId || null,
      sessionToken: sessionToken || null,
      fileName: req.file.filename,
      originalName,
      mimeType,
      fileSize: req.file.size,
      fileUrl,
      docType,
      ocrStatus: ocrResult.ocrStatus,
      rawOcrText: ocrResult.rawText,
      verifiedData: ocrResult.extractedData,
      uploadedBy: req.user ? req.user.name : 'Patient/Kiosk'
    });

    logger.audit('DOCUMENT_UPLOADED_AND_OCR_PROCESSED', req.user ? req.user.email : 'kiosk', {
      documentId: document._id,
      docType,
      cdnProvider: ikResult.provider,
      ocrStatus: ocrResult.ocrStatus
    });

    return res.json({
      success: true,
      documentId: document._id,
      ocrStatus: document.ocrStatus,
      cdnProvider: ikResult.provider,
      fileUrl: document.fileUrl,
      extractedData: document.verifiedData
    });
  } catch (err) {
    logger.error('Document upload error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to upload and process document.' });
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { verifiedData, action, staffNotes } = req.body;

    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    if (action === 'reject') {
      await Document.findByIdAndUpdate(documentId, {
        ocrStatus: 'rejected',
        staffNotes: staffNotes || 'Rejected by staff verification'
      });
      logger.audit('DOCUMENT_OCR_REJECTED', req.user.email, { documentId });
      return res.json({ success: true, message: 'Document marked as rejected.' });
    }

    // Approve & Save Verified Structured Data
    await Document.findByIdAndUpdate(documentId, {
      ocrStatus: 'verified',
      verifiedData: {
        ...doc.verifiedData,
        ...verifiedData
      },
      verifiedBy: req.user.name,
      verifiedAt: new Date(),
      staffNotes: staffNotes || doc.staffNotes
    });

    logger.audit('DOCUMENT_OCR_VERIFIED', req.user.email, { documentId });
    return res.json({ success: true, message: 'Document verified and added to clinical timeline.' });
  } catch (err) {
    logger.error('Document verification error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to verify document.' });
  }
};
