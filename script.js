let html5QrCode;
let currentCameraId = null;
let isScanning = false;
let torchOn = false;
let currentTrack = null;
let qrCodeInstance = null; // Store QRCode instance

// Show Generate or Scan Tab
function showTab(tab) {
  const generateSection = document.getElementById("generate-section");
  const scanSection = document.getElementById("scan-section");
  const generateTab = document.getElementById("generate-tab");
  const scanTab = document.getElementById("scan-tab");
  const scanControls = document.getElementById("scan-controls");

  if (tab === "generate") {
    generateSection.classList.remove("hidden");
    scanSection.classList.add("hidden");
    scanControls.classList.add("hidden");
    generateTab.classList.add("active");
    scanTab.classList.remove("active");
    stopScanner();
  } else {
    generateSection.classList.add("hidden");
    scanSection.classList.remove("hidden");
    scanControls.classList.remove("hidden");
    generateTab.classList.remove("active");
    scanTab.classList.add("active");
    startScanner();
  }
}

// Start QR Code Scanner
function startScanner() {
  if (isScanning) return;

  const qrRegionId = "reader";
  document.getElementById(qrRegionId).innerHTML = "";
  html5QrCode = new Html5Qrcode(qrRegionId);

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        const backCam =
          devices.find((d) => d.label.toLowerCase().includes("back")) ||
          devices[0];
        currentCameraId = backCam.id;

        html5QrCode
          .start(
            currentCameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              experimentalFeatures: { useBarCodeDetectorIfSupported: true },
            },
            (decodedText) => {
              document.getElementById("scanned-result").textContent =
                decodedText;
              stopScanner();
            },
            (error) => {}
          )
          .then(() => {
            isScanning = true;

            const video = document.querySelector("video");
            if (video && video.srcObject) {
              const track = video.srcObject.getVideoTracks()[0];
              currentTrack = track;
              if ("getCapabilities" in track) {
                const capabilities = track.getCapabilities();
                if (capabilities.torch) {
                  document
                    .getElementById("torch-btn")
                    .classList.remove("hidden");
                }
              }
            }
          })
          .catch((err) => {
            alert("Could not start camera: " + err);
          });
      } else {
        alert("No cameras found.");
      }
    })
    .catch((err) => {
      alert("Camera access error: " + err);
    });
}

// Stop Scanner
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode
      .stop()
      .then(() => {
        html5QrCode.clear();
        isScanning = false;
        torchOn = false;
        document.getElementById("torch-btn").classList.add("hidden");
      })
      .catch((err) => {
        console.error("Stop error", err);
      });
  }
}

// Torch toggle
function toggleTorch() {
  if (currentTrack) {
    torchOn = !torchOn;
    currentTrack
      .applyConstraints({
        advanced: [{ torch: torchOn }],
      })
      .then(() => {
        document.getElementById("torch-btn").textContent = torchOn
          ? "Turn Torch Off"
          : "Turn Torch On";
      })
      .catch((err) => {
        alert("Torch not supported.");
      });
  }
}

// Switch camera
let cameraDevices = [];
let currentCameraIndex = 0;

function switchCamera() {
  Html5Qrcode.getCameras().then((devices) => {
    if (devices.length < 2) {
      alert("No secondary camera found.");
      return;
    }

    // Store the list only once
    if (cameraDevices.length === 0) {
      cameraDevices = devices;
    }

    // Calculate the next camera index
    currentCameraIndex = (currentCameraIndex + 1) % cameraDevices.length;
    const newCameraId = cameraDevices[currentCameraIndex].id;

    stopScanner();

    html5QrCode
      .start(
        newCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        (decodedText) => {
          document.getElementById("scanned-result").textContent = decodedText;
          stopScanner();
        },
        (error) => {}
      )
      .then(() => {
        isScanning = true;
        currentCameraId = newCameraId;

        // Torch capability reset
        const video = document.querySelector("video");
        if (video && video.srcObject) {
          const track = video.srcObject.getVideoTracks()[0];
          currentTrack = track;
          if ("getCapabilities" in track) {
            const capabilities = track.getCapabilities();
            if (capabilities.torch) {
              document.getElementById("torch-btn").classList.remove("hidden");
            } else {
              document.getElementById("torch-btn").classList.add("hidden");
            }
          }
        }
      })
      .catch((err) => {
        console.error("Switch camera start error:", err);
        alert("Failed to switch camera.");
      });
  });
}

// Generate QR Code
function generateQRCode() {
  const textInput = document.getElementById("qr-text");
  const container = document.getElementById("qr-result");

  if (!textInput || !container) {
    alert("Required elements are missing.");
    return;
  }

  const text = textInput.value.trim();
  container.innerHTML = ""; // Clear previous QR code

  if (text === "") {
    alert("Please enter text to generate QR code.");
    return;
  }

  try {
    // Clear previous QR code instance if exists
    if (qrCodeInstance) {
      container.innerHTML = "";
      qrCodeInstance = null;
    }

    // You can optionally encode URI components if you want to safely encode URLs
    // But this is usually unnecessary and can break valid URLs in QR code
    // const safeText = encodeURIComponent(text);

    // Generate QR code with the raw input text
    qrCodeInstance = new QRCode(container, {
      text: text, // Pass text directly, supports links & special chars
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    // Show download and reset buttons
    document.getElementById("download-btn").classList.remove("hidden");
    document.getElementById("reset-btn").classList.remove("hidden");
  } catch (err) {
    console.error("QR Code generation failed:", err);
    alert("Failed to generate QR code. See console for details.");
  }
}

// Download the generated QR code image
function downloadQR() {
  const container = document.getElementById("qr-result");
  let img = container.querySelector("img");
  let canvas = container.querySelector("canvas");

  if (img) {
    const link = document.createElement("a");
    link.href = img.src;
    link.download = "qrcode.png";
    link.click();
  } else if (canvas) {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "qrcode.png";
    link.click();
  } else {
    alert("No QR code found to download.");
  }
}

// Reset QR code and input
function resetQR() {
  const container = document.getElementById("qr-result");
  container.innerHTML = ""; // Clear QR code
  document.getElementById("qr-text").value = ""; // Clear input

  // Hide download and reset buttons
  document.getElementById("download-btn").classList.add("hidden");
  document.getElementById("reset-btn").classList.add("hidden");

  qrCodeInstance = null;
}
