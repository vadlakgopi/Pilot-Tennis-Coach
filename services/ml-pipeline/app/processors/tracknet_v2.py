"""
TrackNetV2 — temporal ball-detection model for tennis.

Architecture: VGG-style encoder (5 blocks) + symmetric decoder (5 upsample blocks).
Input:  (B, 9, 288, 512)  — 3 consecutive BGR frames stacked along channel axis.
Output: (B, 1, 288, 512)  — sigmoid heatmap; argmax gives raw ball position.

Reference: Huang et al., "TrackNet: A Deep Learning Network for Tracking High-speed
and Tiny Objects in Sports Applications", IJCAI 2019 (V2 extension with BN).
"""

import torch
import torch.nn as nn


def _cbr(in_ch: int, out_ch: int, kernel: int = 3, padding: int = 1) -> nn.Sequential:
    """Conv → BatchNorm → ReLU block."""
    return nn.Sequential(
        nn.Conv2d(in_ch, out_ch, kernel, padding=padding, bias=False),
        nn.BatchNorm2d(out_ch),
        nn.ReLU(inplace=True),
    )


class TrackNetV2(nn.Module):
    """
    Encoder-decoder architecture for sub-pixel ball localisation using 3 frames.

    Spatial sizes assume (H=288, W=512) input:
      enc1 → 288×512   enc2 → 144×256   enc3 → 72×128
      enc4 →  36×64    enc5 →  18×32    bottleneck →  9×16
      dec5 →  18×32    dec4 →  36×64    dec3 → 72×128
      dec2 → 144×256   dec1 → 288×512   out  → 288×512
    """

    # Fixed input resolution expected by this architecture.
    INPUT_H = 288
    INPUT_W = 512

    def __init__(self, num_frames: int = 3):
        super().__init__()
        in_ch = num_frames * 3  # 9 for 3 BGR frames

        # ── Encoder ──────────────────────────────────────────────────────────
        self.enc1 = nn.Sequential(_cbr(in_ch, 64), _cbr(64, 64))
        self.pool1 = nn.MaxPool2d(2, 2)  # → 144×256

        self.enc2 = nn.Sequential(_cbr(64, 128), _cbr(128, 128))
        self.pool2 = nn.MaxPool2d(2, 2)  # → 72×128

        self.enc3 = nn.Sequential(_cbr(128, 256), _cbr(256, 256), _cbr(256, 256))
        self.pool3 = nn.MaxPool2d(2, 2)  # → 36×64

        self.enc4 = nn.Sequential(_cbr(256, 512), _cbr(512, 512), _cbr(512, 512))
        self.pool4 = nn.MaxPool2d(2, 2)  # → 18×32

        self.enc5 = nn.Sequential(_cbr(512, 512), _cbr(512, 512), _cbr(512, 512))
        self.pool5 = nn.MaxPool2d(2, 2)  # → 9×16

        # ── Decoder ──────────────────────────────────────────────────────────
        # No skip connections (TrackNetV2 is not U-Net; lateral connections are V3+).
        self.up5 = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.dec5 = nn.Sequential(_cbr(512, 512), _cbr(512, 512))  # → 18×32

        self.up4 = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.dec4 = nn.Sequential(_cbr(512, 512), _cbr(512, 256))  # → 36×64

        self.up3 = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.dec3 = nn.Sequential(_cbr(256, 256), _cbr(256, 128))  # → 72×128

        self.up2 = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.dec2 = nn.Sequential(_cbr(128, 128), _cbr(128, 64))   # → 144×256

        self.up1 = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.dec1 = nn.Sequential(_cbr(64, 64), _cbr(64, 64))      # → 288×512

        self.head = nn.Conv2d(64, 1, kernel_size=1)  # logit map

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (B, 9, H, W) stacked frames, values in [0, 1].
        Returns:
            heatmap: (B, 1, H, W) in [0, 1].
        """
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool1(e1))
        e3 = self.enc3(self.pool2(e2))
        e4 = self.enc4(self.pool3(e3))
        e5 = self.enc5(self.pool4(e4))
        b  = self.pool5(e5)

        d5 = self.dec5(self.up5(b))
        d4 = self.dec4(self.up4(d5))
        d3 = self.dec3(self.up3(d4))
        d2 = self.dec2(self.up2(d3))
        d1 = self.dec1(self.up1(d2))

        return torch.sigmoid(self.head(d1))

    # ── Convenience helpers ───────────────────────────────────────────────────

    @staticmethod
    def preprocess_frame(bgr_frame) -> "torch.Tensor":
        """
        Convert a single OpenCV BGR frame (H×W×3 uint8) to a float32 CHW tensor
        normalised to [0, 1] and resized to (3, INPUT_H, INPUT_W).
        """
        import cv2
        import torch
        resized = cv2.resize(bgr_frame, (TrackNetV2.INPUT_W, TrackNetV2.INPUT_H))
        tensor = torch.from_numpy(resized).float().permute(2, 0, 1) / 255.0
        return tensor  # (3, 288, 512)

    @staticmethod
    def extract_ball_position(heatmap: "torch.Tensor", threshold: float = 0.5):
        """
        Locate the ball from a (1, H, W) heatmap tensor.

        Returns:
            (x_norm, y_norm, confidence) where x/y are in [0,1] of model-input space,
            or None if no peak exceeds threshold.
        """
        h = heatmap.squeeze()          # (H, W)
        confidence = float(h.max())
        if confidence < threshold:
            return None
        idx = int(h.argmax())
        H, W = h.shape
        y_norm = (idx // W) / H
        x_norm = (idx % W) / W
        return x_norm, y_norm, confidence
