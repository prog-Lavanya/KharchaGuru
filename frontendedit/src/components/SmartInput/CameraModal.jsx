import { useState, useRef, useEffect } from "react";

export default function CameraModal({ isOpen, onClose, onCapture }) {
    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState("environment"); // 'user' for front, 'environment' for back
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, facingMode]);

    const startCamera = async () => {
        stopCamera();
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode },
                audio: false,
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure permissions are granted.");
            onClose();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const toggleCamera = () => {
        setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg");
            onCapture(dataUrl);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black z-[2000] flex flex-col items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />

            <div className="absolute inset-x-0 bottom-0 p-8 flex items-center justify-around bg-gradient-to-t from-black/70 to-transparent">
                <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
                >
                    <div className="w-16 h-16 rounded-full bg-white active:scale-95 transition-transform" />
                </button>

                <button
                    onClick={toggleCamera}
                    className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 16V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12m4-12v16l4-4" />
                        <path d="M2 8v12a2 2 0 0 0 2 2h10" />
                    </svg>
                </button>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
    );
}
