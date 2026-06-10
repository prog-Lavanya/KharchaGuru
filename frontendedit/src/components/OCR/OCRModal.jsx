import { useState, useRef } from 'react';
import { extractTextWithLocalOcr, parseSmartEntryFromText } from '../../utils/localOcr';

function OCRFloatingButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40 group"
      title="Scan Receipt"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );
}

export default function OCRModal({ isOpen, onClose }) {
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [suggestedEntry, setSuggestedEntry] = useState(null);
  const [documentType, setDocumentType] = useState('unknown');
  const [activeTab, setActiveTab] = useState('raw');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [status, setStatus] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setSuggestedEntry(null);
      setDocumentType('unknown');
      setSaveError('');
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const processOCR = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setStatus('Initializing AI engine...');
    setSaveError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // step progress simulation
      const steps = [
        { p: 25, s: 'Uploading image to neural server...' },
        { p: 50, s: 'Deep scanning OCR text...' },
        { p: 80, s: 'Refining and parsing amounts...' },
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          setProgress(steps[currentStep].p);
          setStatus(steps[currentStep].s);
          currentStep++;
        } else {
          clearInterval(interval);
        }
      }, 800);

      const res = await fetch('https://kharchaguru-0cgi.onrender.com/ocr/process', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      if (!res.ok) throw new Error("Failed to process image");

      const result = await res.json();
      setProgress(100);
      setStatus('Processing Complete!');

      setTimeout(() => {
        setRawText(result.raw_text || '');
        setParsedItems(result.parsed_items || []);
        setSuggestedEntry(result.suggested_entry || null);
        setDocumentType(result.document_type || 'unknown');
        setIsProcessing(false);
        // send notification
        if (window.addNotification) {
          window.addNotification(
            result.suggested_entry?.entry_type === 'income'
              ? 'Salary slip parsed. Review and save to update income.'
              : `Document scanned successfully! Found ${result.parsed_items?.length || 0} items.`,
            'success'
          );
        }
      }, 500);

    } catch (error) {
      console.error('OCR Error:', error);
      setStatus('Backend OCR failed. Trying local OCR...');

      try {
        const fallbackText = await extractTextWithLocalOcr(file, (ocrProgress) => {
          setProgress(10 + Math.round(ocrProgress * 80));
          setStatus('Running local OCR fallback...');
        });
        const fallbackEntry = await parseSmartEntryFromText(fallbackText);

        setRawText(fallbackText);
        setParsedItems(
          fallbackEntry?.amount
            ? [{ name: fallbackEntry.description || 'Scanned Item', amount: Number(fallbackEntry.amount) }]
            : []
        );
        setSuggestedEntry(fallbackEntry);
        setDocumentType(fallbackEntry?.entry_type === 'income' ? 'income_slip' : 'expense_receipt');
        setProgress(100);
        setStatus('Processing Complete! (local OCR)');
      } catch (fallbackError) {
        console.error('Local OCR Error:', fallbackError);
        setStatus('Error processing receipt.');

        if (window.addNotification) {
          window.addNotification('Failed to scan receipt. Please try again.', 'error');
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setRawText('');
    setParsedItems([]);
    setSuggestedEntry(null);
    setDocumentType('unknown');
    setProgress(0);
    setStatus('');
    setSaveError('');
    setIsSaving(false);
    setActiveTab('raw');
    setShowCamera(false);
    stopCamera();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Could not access camera. Please use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreview(dataUrl);

      // Convert dataURL to File object for the backend
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const capturedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });

      setFile(capturedFile);
      setSuggestedEntry(null);
      setDocumentType('unknown');
      stopCamera();
    }
  };

  const modalOpen = isOpen || showModal;

  return (
    <>
      <OCRFloatingButton onClick={() => setShowModal(true)} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Smart Document Scanner</h2>
                  <p className="text-sm text-slate-500">Scan receipts or salary slips into smart entries</p>
                </div>
              </div>
              <button onClick={() => { onClose?.(); setShowModal(false); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {showCamera ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={capturePhoto}
                      className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : !preview ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Click to upload receipt
                  </p>
                  <p className="text-sm text-slate-500 mb-4">PNG, JPG up to 10MB</p>

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload File
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera();
                      }}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Scan with Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={preview} alt="Receipt" className="w-full rounded-lg shadow-md max-h-64 object-contain" />

                  {!isProcessing && !rawText && (
                    <button
                      onClick={processOCR}
                      className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Scan Document
                    </button>
                  )}

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span className="font-medium animate-pulse">{status}</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(13,148,136,0.4)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {rawText && (
                    <div className="space-y-4">
                      {saveError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {saveError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveTab('raw')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'raw'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          Raw Text
                        </button>
                        <button
                          onClick={() => setActiveTab('parsed')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'parsed'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          Parsed Items ({parsedItems.length})
                        </button>
                      </div>

                      {activeTab === 'raw' && (
                        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 max-h-64 overflow-y-auto whitespace-pre-wrap">
                          {rawText}
                        </pre>
                      )}

                      {activeTab === 'parsed' && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {parsedItems.length > 0 ? (
                            parsedItems.map((item, i) => (
                              <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <span className="text-slate-700" style={{ fontFamily: "'Playfair Display', serif" }}>{item.name}</span>
                                <span className="text-green-600 font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>₹{item.amount.toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-slate-500 py-8">No items detected</p>
                          )}
                        </div>
                      )}

                      {suggestedEntry && (
                        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                          <p className="text-xs uppercase tracking-wider text-teal-700 mb-2">Detected Entry</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500">Type</p>
                              <p className="font-semibold text-slate-900">{suggestedEntry.entry_type.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Amount</p>
                              <p className="font-semibold text-slate-900">₹{Number(suggestedEntry.amount).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Category</p>
                              <p className="text-slate-900">{suggestedEntry.category || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Document</p>
                              <p className="text-slate-900">{documentType.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-slate-500 text-xs">Description</p>
                            <p className="text-slate-900 text-sm">{suggestedEntry.description}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={reset}
                          className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          Scan Another
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem('token');
                            if (!token) {
                              setSaveError('Please sign in before saving scanned entries.');
                              return;
                            }
                            if (!suggestedEntry || Number(suggestedEntry.amount) <= 0) {
                              setSaveError('Could not detect a valid amount from this document.');
                              return;
                            }

                            setIsSaving(true);
                            setSaveError('');

                            try {
                              const res = await fetch('https://kharchaguru-0cgi.onrender.com/smart-entries/apply', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  entry_type: suggestedEntry.entry_type,
                                  amount: Number(suggestedEntry.amount),
                                  description: suggestedEntry.description || 'OCR Scan',
                                  category: suggestedEntry.category || null,
                                  source: 'ocr',
                                  raw_text: rawText,
                                })
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                throw new Error(data.detail || 'Failed to save scanned entry.');
                              }

                              if (window.addNotification) {
                                window.addNotification(`Saved ${suggestedEntry.entry_type.replace('_', ' ')} from scanned document.`, 'success');
                              }
                              window.dispatchEvent(new Event('smartEntryAdded'));
                              reset();
                              onClose?.();
                              setShowModal(false);
                            } catch (error) {
                              setSaveError(error.message || 'Failed to save scanned entry.');
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                          disabled={isSaving}
                          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {isSaving ? 'Saving...' : 'Save Smart Entry'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}