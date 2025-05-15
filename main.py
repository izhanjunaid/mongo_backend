from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import io
from pydantic import BaseModel

app = FastAPI()

# Endpoint to apply makeup to an uploaded image
@app.post("/apply_makeup/")
async def apply_makeup(image: UploadFile = File(...), product: str = "lipstick", color: str = "255,0,0"):
    contents = await image.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    np_image = np.array(pil_image)

    # Process color and convert to tuple
    r, g, b = map(int, color.split(","))
    color_rgb = (r, g, b)

    # Simulate makeup application on the image (you could use your MTCNN model here)
    # For simplicity, this example just returns the original image

    # Convert processed image back to base64 (simulate processed image)
    processed_image = Image.fromarray(np_image)
    img_byte_arr = io.BytesIO()
    processed_image.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()
    img_base64 = base64.b64encode(img_byte_arr).decode('utf-8')

    return JSONResponse(content={"image": img_base64})
