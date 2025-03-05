document.addEventListener("DOMContentLoaded", () => {
    const dropArea = document.getElementById("drop-area")
    const fileInput = document.getElementById("fileInput")
    const browseBtn = document.getElementById("browseBtn")
    const resultSection = document.getElementById("result-section")
    const originalImage = document.getElementById("original-image")
    const processedImage = document.getElementById("processed-image")
    const downloadBtn = document.getElementById("download-btn")
    const tryAnotherBtn = document.getElementById("try-another-btn")
    const loadingOverlay = document.getElementById("loading-overlay")
    const progressFill = document.querySelector(".progress-fill")
  
    let processedFilename = ""
  
    // Prevent default drag behaviors
    ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropArea.addEventListener(eventName, preventDefaults, false)
    })
  
    function preventDefaults(e) {
      e.preventDefault()
      e.stopPropagation()
    }
    // Highlight drop area when item is dragged over it
    ;["dragenter", "dragover"].forEach((eventName) => {
      dropArea.addEventListener(eventName, highlight, false)
    })
    ;["dragleave", "drop"].forEach((eventName) => {
      dropArea.addEventListener(eventName, unhighlight, false)
    })
  
    function highlight() {
      dropArea.classList.add("highlight")
    }
  
    function unhighlight() {
      dropArea.classList.remove("highlight")
    }
  
    // Handle dropped files
    dropArea.addEventListener("drop", handleDrop, false)
  
    function handleDrop(e) {
      const dt = e.dataTransfer
      const files = dt.files
  
      if (files.length) {
        handleFiles(files)
      }
    }
  
    // Handle browse button click
    browseBtn.addEventListener("click", () => {
      fileInput.click()
    })
  
    // Handle selected files from input
    fileInput.addEventListener("change", function () {
      if (this.files.length) {
        handleFiles(this.files)
      }
    })
  
    function handleFiles(files) {
      const file = files[0]
  
      // Check file type
      if (!file.type.match("image.*")) {
        showNotification("Please select an image file (JPG, PNG)", "error")
        return
      }
  
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification("File size exceeds 10MB limit", "error")
        return
      }
  
      uploadFile(file)
    }
  
    function uploadFile(file) {
      showLoading()
  
      // Simulate progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 10
        if (progress > 90) {
          progress = 90 // Cap at 90% until actual completion
          clearInterval(progressInterval)
        }
        progressFill.style.width = `${progress}%`
      }, 300)
  
      const formData = new FormData()
      formData.append("image", file)
  
      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok")
          }
          return response.json()
        })
        .then((data) => {
          clearInterval(progressInterval)
          progressFill.style.width = "100%"
  
          // Short delay to show 100% progress
          setTimeout(() => {
            // Display the results
            originalImage.src = data.original + "?t=" + new Date().getTime() // Prevent caching
            processedImage.src = data.processed + "?t=" + new Date().getTime()
  
            // Extract filename from processed path
            processedFilename = data.processed.split("/").pop()
  
            // Show result section with animation
            resultSection.classList.remove("hidden")
            resultSection.classList.add("animate__animated", "animate__fadeIn")
  
            // Scroll to result section
            setTimeout(() => {
              resultSection.scrollIntoView({ behavior: "smooth" })
            }, 300)
  
            hideLoading()
          }, 500)
        })
        .catch((error) => {
          clearInterval(progressInterval)
          console.error("Error:", error)
          showNotification("An error occurred while processing the image", "error")
          hideLoading()
        })
    }
  
    // Show notification
    function showNotification(message, type = "info") {
      // Create notification element
      const notification = document.createElement("div")
      notification.className = `notification ${type}`
      notification.innerHTML = message
  
      // Add to body
      document.body.appendChild(notification)
  
      // Animate in
      setTimeout(() => {
        notification.classList.add("show")
      }, 10)
  
      // Remove after 3 seconds
      setTimeout(() => {
        notification.classList.remove("show")
        setTimeout(() => {
          document.body.removeChild(notification)
        }, 300)
      }, 3000)
    }
  
    // Download button
    downloadBtn.addEventListener("click", function () {
      if (processedFilename) {
        // Add animation effect
        this.classList.add("animate__animated", "animate__pulse")
        setTimeout(() => {
          this.classList.remove("animate__animated", "animate__pulse")
        }, 1000)
  
        window.location.href = `/download/${processedFilename}`
      }
    })
  
    // Try another image button
    tryAnotherBtn.addEventListener("click", () => {
      resultSection.classList.add("animate__animated", "animate__fadeOut")
  
      setTimeout(() => {
        resultSection.classList.remove("animate__animated", "animate__fadeOut")
        resultSection.classList.add("hidden")
        fileInput.value = ""
        window.scrollTo({ top: 0, behavior: "smooth" })
      }, 500)
    })
  
    function showLoading() {
      loadingOverlay.style.display = "flex"
      progressFill.style.width = "0%"
    }
  
    function hideLoading() {
      setTimeout(() => {
        loadingOverlay.style.display = "none"
      }, 500)
    }
  
    // Add CSS for notifications
    const style = document.createElement("style")
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            max-width: 300px;
        }
  
        .notification.show {
            transform: translateX(0);
        }
  
        .notification.info {
            background: linear-gradient(45deg, #3B82F6, #10B981);
        }
  
        .notification.error {
            background: linear-gradient(45deg, #EF4444, #F59E0B);
        }
    `
    document.head.appendChild(style)
  
    // Add animated background spheres movement on mousemove
    document.addEventListener("mousemove", (e) => {
      const spheres = document.querySelectorAll(".gradient-sphere")
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
  
      spheres.forEach((sphere, index) => {
        const factor = (index + 1) * 10
        const offsetX = (x - 0.5) * factor
        const offsetY = (y - 0.5) * factor
  
        sphere.style.transform = `translate(${offsetX}px, ${offsetY}px)`
      })
    })
  })
  
  