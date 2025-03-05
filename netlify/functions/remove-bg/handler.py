from rembg import remove, new_session
from PIL import Image
import io
import json
import base64

def handler(event, context):
    try:
        # Parse the body
        body = json.loads(event['body'])
        image_data = base64.b64decode(body['image'])
        
        # Initialize session
        session = new_session("u2net")
        
        # Process image
        output = remove(
            image_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10
        )
        
        # Convert to base64
        processed_image = base64.b64encode(output).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'processed_image': processed_image
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
