import { useState, useRef, useEffect } from "react";
import "./SmartInput.css";
import CameraModal from "./CameraModal";
import { extractTextWithLocalOcr, parseSmartEntryFromText } from "../../utils/localOcr";

export default function SmartInput({
    value = "",
    onChange,
    placeholder = "e.g. 50 for panipuri",
    multiline = false,
    className = "",
    rows = 2,
    onOCRSuccess,
    allowFileUpload = true,
    allowCameraCapture = true,
}) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const [attachedImage, setAttachedImage] = useState(null);
    const [showFullPreview, setShowFullPreview] = useState(false);

    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const valueRef = useRef(value);

    useEffect(() => { valueRef.current = value; }, [value]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results).map(r => r[0].transcript).join("");
            const newValue = valueRef.current ? `${valueRef.current} ${transcript}` : transcript;
            onChange?.(newValue);
            if (onOCRSuccess) setTimeout(() => onOCRSuccess(newValue), 500);
        };
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
        return () => recognition.stop();
    }, [onChange, onOCRSuccess]);

    const toggleVoice = () => {
        if (isListening) recognitionRef.current?.stop();
        else recognitionRef.current?.start();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAttachedImage(ev.target.result);
                executeOCR(file);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = "";
    };

    const handlePhotoCapture = async (dataUrl) => {
        setAttachedImage(dataUrl);
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        executeOCR(file);
    };
    const executeOCR = async (fileObj) => {
        setIsProcessingOCR(true);
        setUploadStatus("Processing...");
        setProgress(20);
        const formData = new FormData();
        formData.append('file', fileObj);
        try {
            // Smooth progress movement
            const simmer = setInterval(() => {
                setProgress(prev => (prev < 90 ? prev + 5 : prev));
            }, 400);

            const res = await fetch("https://kharchaguru-0cgi.onrender.com/ocr/process", {
                method: "POST",
                body: formData
            });
            clearInterval(simmer);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Server error");
            }
            const data = await res.json();
            const smartEntry = data.suggested_entry;
            const hasValidAmount = Number(smartEntry?.amount) > 0;
            const resultText = hasValidAmount
                ? `Spent ${smartEntry.amount} for ${smartEntry.description || smartEntry.category || "expense"}`
                : null;
            if (!resultText) {
                throw new Error("Could not detect a valid amount from this bill.");
            }
            
            setProgress(100);
            setUploadStatus("Ready");
            onChange?.(resultText);
            if (onOCRSuccess) onOCRSuccess(resultText);
            if (window.addNotification) window.addNotification('Bill scan complete', 'success');
        } catch (err) {
            console.error(err);
            setUploadStatus("Backend OCR failed, trying local scan...");
            try {
                const rawText = await extractTextWithLocalOcr(fileObj, (ocrProgress) => {
                    setProgress(20 + Math.round(ocrProgress * 70));
                });
                const smartEntry = await parseSmartEntryFromText(rawText);
                const fallbackText = Number(smartEntry?.amount) > 0
                    ? `Spent ${smartEntry.amount} for ${smartEntry.description || smartEntry.category || "expense"}`
                    : null;

                if (!fallbackText) {
                    throw new Error("Could not detect a valid amount from this bill.");
                }

                setProgress(100);
                setUploadStatus("Ready (local scan)");

                onChange?.(fallbackText);
                if (onOCRSuccess) onOCRSuccess(fallbackText);
                if (window.addNotification) window.addNotification('Bill scan complete using local OCR', 'success');
            } catch (fallbackErr) {
                console.error(fallbackErr);
                setUploadStatus(`Failed: ${fallbackErr.message || err.message || "Check Backend"}`);
                setProgress(0);
            }
        } finally {
            setIsProcessingOCR(false);
        }
    };

    const removeAttachment = () => {
        setAttachedImage(null);
        setProgress(0);
        setUploadStatus("");
    };

    return (
        <div className={`premium-input-wrapper ${className}`}>
            <div className="premium-input-bar">
                {allowFileUpload && (
                    <button
                        className={`input-side-btn left-action-btn ${isProcessingOCR ? "processing" : ""}`}
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingOCR}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                )}

                {multiline ? (
                    <textarea
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        placeholder={placeholder}
                        className="premium-field"
                        rows={rows}
                    />
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        placeholder={placeholder}
                        className="premium-field"
                    />
                )}

                <div className="premium-actions">
                    <button
                        onClick={toggleVoice}
                        className={`input-side-btn ${isListening ? "active-voice" : ""}`}
                        type="button"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                            <path d="M19 11a7 7 0 0 1-14 0" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
                        </svg>
                    </button>

                    {allowCameraCapture && (
                        <button
                            onClick={() => setIsCameraOpen(true)}
                            className="input-side-btn"
                            disabled={isProcessingOCR}
                            type="button"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {attachedImage && (
                <div className="attachment-chip-bottom group">
                    <img src={attachedImage} alt="receipt" className="attachment-preview" />
                    <div className="attachment-info">
                        <span className="attachment-status">{uploadStatus}</span>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        {progress === 100 && (
                            <button
                                className="preview-btn mt-1"
                                onClick={() => setShowFullPreview(true)}
                            >
                                Preview Attachment
                            </button>
                        )}
                    </div>
                    <button onClick={removeAttachment} className="remove-attachment">×</button>
                </div>
            )}

            {showFullPreview && (
                <div className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowFullPreview(false)}>
                    <div className="relative max-w-2xl w-full bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Receipt Snapshot</h3>
                            <button onClick={() => setShowFullPreview(false)} className="text-slate-500 hover:text-red-500">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-2 bg-slate-100 flex justify-center">
                            <img src={attachedImage} alt="Full preview" className="max-h-[70vh] object-contain shadow-sm rounded border" />
                        </div>
                        <div className="p-4 bg-white flex justify-end">
                            <button onClick={() => setShowFullPreview(false)} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {allowFileUpload && (
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} hidden />
            )}
            {allowCameraCapture && (
                <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handlePhotoCapture} />
            )}
        </div>
    );
}
