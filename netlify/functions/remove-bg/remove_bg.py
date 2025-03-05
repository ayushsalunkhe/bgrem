from flask import Flask, request, render_template, jsonify, send_file
import os
import uuid
from rembg import remove, new_session
from PIL import Image
import io
import time
import threading
import functools
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['PROCESSED_FOLDER'] = 'static/processed'
app.config['CACHE_FOLDER'] = 'static/cache'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max upload

# Create directories if they don't exist
for folder in [app.config['UPLOAD_FOLDER'], app.config['PROCESSED_FOLDER'], app.config['CACHE_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

# Initialize rembg session with u2net model for better accuracy
# You can also try other models like u2netp (smaller, faster) or silueta (specialized for human silhouettes)
session = new_session("u2net")

# Simple cache implementation
cache = {}

def compute_image_hash(img_data):
    """Compute a simple hash for image data to use as cache key"""
    import hashlib
    return hashlib.md5(img_data).hexdigest()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Read file data
        img_data = file.read()
        
        # Compute hash for caching
        img_hash = compute_image_hash(img_data)
        
        # Check if we have this image in cache
        if img_hash in cache:
            return jsonify(cache[img_hash])
        
        # Generate unique filename
        filename = secure_filename(str(uuid.uuid4()) + os.path.splitext(file.filename)[1])
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save original image
        with open(file_path, 'wb') as f:
            f.write(img_data)
        
        # Process the image
        try:
            processed_filename = process_image(img_data, filename)
            
            result = {
                'original': '/static/uploads/' + filename,
                'processed': '/static/processed/' + processed_filename,
                'timestamp': time.time()
            }
            
            # Cache the result
            cache[img_hash] = result
            
            # Clean old cache entries if cache gets too large
            if len(cache) > 100:  # Limit cache to 100 entries
                oldest_key = min(cache.keys(), key=lambda k: cache[k]['timestamp'])
                del cache[oldest_key]
            
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

def process_image(img_data, filename):
    """Process image with rembg to remove background"""
    # Remove background with optimized settings
    output = remove(
        img_data,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10
    )
    
    # Save processed image
    processed_filename = 'processed_' + filename
    processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
    
    # Save the processed image
    img = Image.open(io.BytesIO(output))
    img.save(processed_path, format="PNG", optimize=True)
    
    return processed_filename

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['PROCESSED_FOLDER'], filename), 
                     as_attachment=True,
                     download_name=f"bg_removed_{filename}")

# Clean up temporary files periodically
def cleanup_old_files():
    """Remove files older than 1 hour"""
    while True:
        current_time = time.time()
        for folder in [app.config['UPLOAD_FOLDER'], app.config['PROCESSED_FOLDER']]:
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                # If file is older than 1 hour, delete it
                if os.path.isfile(file_path) and current_time - os.path.getmtime(file_path) > 3600:
                    os.remove(file_path)
        time.sleep(3600)  # Run every hour

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
