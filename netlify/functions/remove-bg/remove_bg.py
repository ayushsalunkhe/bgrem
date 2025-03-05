from base64 import b64decode, b64encode
import json
from rembg import remove, new_session
import io
from PIL import Image

session = new_session("u2net")

def handler(event, context):
    try:
        # Parse the request body
        body = json.loads(event['body'])
        image_data = b64decode(body['image'].split(',')[1])
        
        # Process image
        output = remove(
            image_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10
        )
        
        # Convert to base64
        img = Image.open(io.BytesIO(output))
        buffered = io.BytesIO()
        img.save(buffered, format="PNG", optimize=True)
        img_str = b64encode(buffered.getvalue()).decode()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'image': f'data:image/png;base64,{img_str}'
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
