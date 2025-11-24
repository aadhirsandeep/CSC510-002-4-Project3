<!--
Copyright (c) 2025 Group 2
All rights reserved.

This project and its source code are the property of Group 2:
- Aryan Tapkire
- Dilip Irala Narasimhareddy
- Sachi Vyas
- Supraj Gijre
-->

# OCR Menu Processing Service

This service provides OCR (Optical Character Recognition) functionality for processing restaurant menu files (PDFs and images) and converting them into structured JSON format using Mistral OCR API and Mistral AI.

## Features

- **Mistral OCR Processing**: Uses Mistral's `mistral-ocr-latest` model for accurate text extraction
- **Multi-Format Support**: Supports both PDF files and image formats (PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP)
- **No System Dependencies**: Pure Python implementation using Mistral AI SDK
- **Easy Setup**: Just install Python packages - no system tools needed
- **AI-Powered Parsing**: Uses Mistral AI to intelligently parse OCR text and extract structured data matching ItemCreate schema
- **Structured JSON Output**: Convert raw menu text into JSON format with standardized fields
- **RESTful API**: FastAPI endpoints for easy integration with frontend applications

## Setup

### Prerequisites

1. **Mistral API Key**: You need a valid Mistral API key to use this service
2. **Python 3.8+**: Python 3.8 or higher is required
3. **Python Dependencies**: Install required packages (that's it!)

### Installation

#### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

That's it! No system-level installations needed.

#### 2. Set Environment Variables

Set your Mistral API key:
```bash
export MISTRAL_API_KEY="your-mistral-api-key-here"
```

Or add to your `.env` file:
```
MISTRAL_API_KEY=your-mistral-api-key-here
```

### Environment Variables

- `MISTRAL_API_KEY`: Your Mistral API key (required for both OCR and LLM parsing)

## API Endpoints

### 1. Parse Menu from File (PDF or Image)

**POST** `/ocr/parse-menu`

Upload a PDF or image file containing a restaurant menu to extract structured menu items.

**Supported Formats:**
- PDF files: `.pdf`
- Image files: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.tiff`, `.webp`

**Request:**
- Content-Type: `multipart/form-data`
- Body: PDF or image file upload
- Headers: `Authorization: Bearer <your-jwt-token>`

**Response:**
```json
{
  "items": [
    {
      "name": "Grilled Chicken Sandwich",
      "description": "Tender grilled chicken breast with lettuce, tomato, and mayo",
      "calories": 450,
      "price": 12.99,
      "ingredients": "chicken breast, lettuce, tomato, mayo",
      "quantity": "1 sandwich",
      "servings": 1.0,
      "veg_flag": false,
      "kind": "main"
    }
  ]
}
```

### 2. Parse Menu from Text

**POST** `/ocr/parse-menu-text`

Parse menu items from raw text content (useful for testing or when you already have extracted text).

**Request:**
```json
{
  "text_content": "Menu text content here..."
}
```

**Response:** Same as above

### 3. Health Check

**GET** `/ocr/health`

Check if the OCR service and Mistral API are working correctly.

**Response:**
```json
{
  "status": "healthy",
  "mistral_api": "connected",
  "service": "OCR Service"
}
```

## Menu Item Schema

Each parsed menu item matches the `ItemCreate` schema and contains the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of the menu item |
| `description` | string | No | Brief description of the dish |
| `calories` | integer | Yes | Estimated calories per serving |
| `price` | float | Yes | Price in USD |
| `ingredients` | string | No | Main ingredients as comma-separated string |
| `quantity` | string | No | Serving size (e.g., "350ml", "1 slice", "large") |
| `servings` | float | No | Number of servings per item |
| `veg_flag` | boolean | Yes | Whether the item is vegetarian (default: true) |
| `kind` | string | No | Category (e.g., "appetizer", "main", "dessert", "beverage", "side") |

## Usage Examples

### Python Client Example

```python
import requests

# Upload PDF file
with open("menu.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post(
        "http://localhost:8000/ocr/parse-menu",
        files=files,
        headers={"Authorization": "Bearer your-jwt-token"}
    )

menu_data = response.json()
print(f"Parsed {len(menu_data['items'])} menu items")

# Upload image file
with open("menu.jpg", "rb") as f:
    files = {"file": f}
    response = requests.post(
        "http://localhost:8000/ocr/parse-menu",
        files=files,
        headers={"Authorization": "Bearer your-jwt-token"}
    )

menu_data = response.json()
print(f"Parsed {len(menu_data['items'])} menu items")
```

### cURL Example

```bash
# Upload PDF
curl -X POST "http://localhost:8000/ocr/parse-menu" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@menu.pdf"

# Upload Image
curl -X POST "http://localhost:8000/ocr/parse-menu" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@menu.jpg"
```

## How It Works

1. **File Upload**: The service accepts PDF or image files
2. **OCR Processing**:
   - For PDFs: Uploads PDF to Mistral files API, gets signed URL, then uses Mistral OCR API
   - For Images: Encodes image to base64 and uses Mistral OCR API directly
3. **Text Extraction**: Uses `mistral-ocr-latest` model to extract text (returns markdown format)
4. **AI Parsing**: Sends extracted OCR text to Mistral LLM (`mistral-small-latest`) for structured parsing
5. **JSON Output**: Returns structured menu items matching ItemCreate schema in JSON format

## Testing

Run the test script to verify OCR functionality:

```bash
cd proj2/backend
python test_ocr.py
```

This will test:
- Mistral API connectivity
- OCR processing
- Menu text parsing
- JSON output validation

## Error Handling

The service handles various error scenarios:

- **Invalid file format**: Only supported formats (PDF and images) are accepted
- **Empty files**: Files with no content are rejected
- **File size limits**: Files larger than 10MB are rejected
- **OCR errors**: Handles cases where text cannot be extracted
- **API errors**: Mistral API failures are handled gracefully
- **Parsing errors**: Invalid JSON responses are caught and reported

## Performance Considerations

- **File size limit**: 10MB maximum for file uploads
- **Processing time**: 
  - PDF processing: Requires file upload + OCR processing (~5-15 seconds depending on file size)
  - Image processing: Direct OCR processing (~3-8 seconds depending on image size)
  - LLM parsing: ~2-5 seconds depending on text length
- **OCR accuracy**: Mistral OCR provides excellent accuracy for menu text
- **Rate limits**: Subject to Mistral API rate limits
- **Memory usage**: Files are processed in memory

## Security

- **Authentication required**: All endpoints require valid JWT tokens
- **File validation**: Only supported file types are accepted
- **Input sanitization**: All inputs are validated and sanitized
- **File size limits**: Prevents DoS attacks via large file uploads
- **API key security**: Mistral API key is stored securely in environment variables

## Troubleshooting

### Common Issues

1. **"Mistral API key not set"**
   - Solution: Set the `MISTRAL_API_KEY` environment variable

2. **"No text content found in file"**
   - Solution: Ensure the file contains readable text. For scanned documents, ensure good image quality
   - Check if the image is clear and not too blurry
   - Verify the file is not corrupted

3. **"Failed to parse JSON response from Mistral"**
   - Solution: Check Mistral API status and try again
   - Verify your API key is valid and has sufficient credits
   - Check API rate limits

4. **"File size too large"**
   - Solution: Reduce file size or compress the file
   - For PDFs, consider splitting into smaller files
   - For images, resize or compress the image

5. **"Failed to extract text from PDF"**
   - Solution: Ensure PDF is not password-protected
   - Check that PDF is not corrupted
   - Verify Mistral API is accessible

6. **"No menu items could be extracted from the file"**
   - Solution: Ensure the file actually contains menu items
   - Check that prices and item names are clearly visible
   - Try with a clearer/higher quality image

### Debug Mode

Enable debug logging by setting the log level:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## OCR Accuracy Tips

1. **Image Quality**: Use high-resolution images (300 DPI minimum)
2. **Contrast**: Ensure good contrast between text and background
3. **Orientation**: Ensure text is right-side up and not rotated
4. **File Format**: PNG or TIFF formats generally provide better OCR results than JPEG
5. **Preprocessing**: For poor quality images, consider preprocessing before OCR

## Advantages of This Approach

✅ **No System Dependencies**: No need to install Tesseract, Poppler, or any system tools
✅ **Cross-Platform**: Works on Windows, macOS, and Linux without any changes
✅ **Easy Setup**: Just `pip install -r requirements.txt` and you're done
✅ **Excellent Accuracy**: Mistral OCR provides state-of-the-art OCR accuracy
✅ **Unified API**: Uses Mistral for both OCR and LLM parsing, simplifying setup
✅ **Cloud-Based**: OCR processing happens via API, no local model downloads

## Future Enhancements

- Support for additional languages
- Batch processing for multiple files
- Custom menu templates for different restaurant types
- Integration with existing menu management systems
- Caching for improved performance
- Support for table extraction from menus
- Enhanced error recovery
