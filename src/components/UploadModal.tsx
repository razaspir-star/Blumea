"use client";

import Modal from "@/components/Modal";
import UploadStep from "@/components/UploadStep";
import type { Video } from "@/lib/mock-data";

type UploadModalProps = {
  video: Video;
  onClose: () => void;
};

// Standalone entry point to the Deep upload, opened later from the analysis
// page as an upgrade. The Analyze flow itself offers the same step inline,
// alongside Lite, before analysis starts (see AnalyzeModal).
export default function UploadModal({ video, onClose }: UploadModalProps) {
  return (
    <Modal
      kicker="DEEP ANALYSIS"
      title="Upload your video"
      description="Uploading lets Blumea see your visual hook, hear the audio and find exact moments. The file is used for the analysis and isn't stored."
      onClose={onClose}
    >
      <div className="mt-6">
        <UploadStep video={video} onDone={onClose} />
      </div>
    </Modal>
  );
}
