import React from 'react';

interface CameraModalProps {
  showCamera: boolean;
  cameraError: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onCapture: () => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  showCamera,
  cameraError,
  videoRef,
  onCapture,
  onClose,
}) => {
  if (!showCamera) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[#0B1124] p-6 shadow-2xl">
        {cameraError ? (
          <p className="text-sm text-rose-400">{cameraError}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-64 w-80 rounded-2xl object-cover border border-white/10"
          />
        )}
        <div className="flex gap-3">
          {!cameraError && (
            <button
              onClick={onCapture}
              className="glass-button-primary rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-glow-indigo cursor-pointer"
            >
              Capture Photo
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
