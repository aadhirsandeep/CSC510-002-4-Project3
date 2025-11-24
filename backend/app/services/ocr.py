# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import json
import logging
import base64
import io
from typing import List, Optional
from pathlib import Path
from mistralai import Mistral
from mistralai.models import DocumentURLChunk, ImageURLChunk, TextChunk
from ..schemas import OCRMenuItem
from ..config import settings

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        """Initialize OCR service with Mistral API client."""
        self.api_key = settings.MISTRAL_API_KEY
        self.client = Mistral(api_key=self.api_key)
    
    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Extract text from an image using Mistral OCR API.
        
        Args:
            image_bytes: Image file content as bytes
            
        Returns:
            Extracted text content (markdown format)
        """
        try:
            # Encode image to base64
            encoded_image = base64.b64encode(image_bytes).decode()
            base64_data_url = f"data:image/png;base64,{encoded_image}"
            
            # Use Mistral OCR API
            logger.info("Calling Mistral OCR API for image...")
            ocr_response = self.client.ocr.process(
                document=ImageURLChunk(image_url=base64_data_url),
                model="mistral-ocr-latest"
            )
            
            # Extract markdown from all pages
            text_content = ""
            for page in ocr_response.pages:
                text_content += page.markdown + "\n\n"
            
            logger.info(f"Extracted {len(text_content)} characters from image using Mistral OCR")
            return text_content.strip()
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            raise ValueError(f"Failed to extract text from image: {str(e)}")
    
    def extract_text_from_pdf(self, file_bytes: bytes, filename: str = "menu.pdf") -> str:
        """
        Extract text from PDF using Mistral OCR API.
        
        Args:
            file_bytes: PDF file content as bytes
            filename: Filename for the PDF (optional)
            
        Returns:
            Extracted text content (markdown format)
        """
        try:
            # Upload PDF to Mistral files API
            logger.info("Uploading PDF to Mistral files API...")
            uploaded_file = self.client.files.upload(
                file={
                    "file_name": Path(filename).stem,
                    "content": file_bytes,
                },
                purpose="ocr",
            )
            
            # Get signed URL
            logger.info(f"Getting signed URL for file {uploaded_file.id}...")
            signed_url = self.client.files.get_signed_url(file_id=uploaded_file.id, expiry=1)
            
            # Use Mistral OCR API
            logger.info("Calling Mistral OCR API for PDF...")
            ocr_response = self.client.ocr.process(
                document=DocumentURLChunk(document_url=signed_url.url),
                model="mistral-ocr-latest"
            )
            
            # Extract markdown from all pages
            text_content = ""
            for page in ocr_response.pages:
                text_content += page.markdown + "\n\n"
            
            logger.info(f"Extracted {len(text_content)} characters from PDF using Mistral OCR")
            return text_content.strip()
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def extract_text_from_file(self, file_bytes: bytes, file_type: str, filename: str = "file") -> str:
        """
        Extract text from file (PDF or image) using Mistral OCR API.
        
        Args:
            file_bytes: File content as bytes
            file_type: File type ('pdf', 'png', 'jpg', 'jpeg', etc.)
            filename: Original filename (optional)
            
        Returns:
            Extracted text content (markdown format)
        """
        file_type_lower = file_type.lower()
        
        if file_type_lower == 'pdf':
            return self.extract_text_from_pdf(file_bytes, filename)
        elif file_type_lower in ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp']:
            return self.extract_text_from_image(file_bytes)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def parse_menu_with_mistral(self, ocr_text: str) -> List[OCRMenuItem]:
        """
        Use Mistral API to parse OCR text and extract structured menu items.
        Matches ItemCreate schema format.
        
        Args:
            ocr_text: Raw text content extracted from OCR (markdown format)
            
        Returns:
            List of structured menu items matching ItemCreate schema
        """
        try:
            prompt = f"""You are an expert menu parser. Extract menu items from the following restaurant menu text (extracted via OCR) and return them as a JSON array.

For each menu item, extract ALL the following fields to match the ItemCreate schema:
- name: The dish name (required, string)
- description: A brief description of the dish (optional, string)
- ingredients: Main ingredients as a comma-separated string (optional, string)
- calories: Estimated calories per serving (required, integer)
- price: Price in USD (required, float)
- quantity: Serving size/quantity (optional, string, e.g., "350ml", "1 slice", "large")
- servings: Number of servings per item (optional, float)
- veg_flag: Whether it's vegetarian (required, boolean, default true)
- kind: Category like "appetizer", "main", "dessert", "beverage", "side", etc. (optional, string)

Rules:
1. Only extract actual menu items, not headers, footers, or restaurant information
2. Estimate calories reasonably based on typical food items if not provided
3. Extract prices accurately from the text
4. Set veg_flag to false for meat/seafood items, true for vegetarian items
5. Include description if available in the menu text
6. Return ONLY a valid JSON array, no other text or explanation
7. Ensure all required fields (name, calories, price, veg_flag) are present for each item

Menu text from OCR:
{ocr_text}

Return the JSON array of menu items:"""

            # Use Mistral chat API - request JSON array format
            prompt_with_format = prompt + "\n\nReturn the response as a JSON object with a single key 'items' containing the array of menu items."
            
            chat_response = self.client.chat.complete(
                model="mistral-small-latest",
                messages=[
                    {
                        "role": "user",
                        "content": prompt_with_format
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=2000
            )
            
            response_text = chat_response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                response_dict = json.loads(response_text)
                # Check if response is wrapped in an object with 'items' key
                if isinstance(response_dict, dict) and 'items' in response_dict:
                    menu_data = response_dict['items']
                elif isinstance(response_dict, dict) and 'menu_items' in response_dict:
                    menu_data = response_dict['menu_items']
                elif isinstance(response_dict, list):
                    menu_data = response_dict
                else:
                    # Try to find array in the response - check all values
                    menu_data = []
                    for key, value in response_dict.items():
                        if isinstance(value, list):
                            menu_data = value
                            break
                    if not menu_data:
                        # Try to extract array from response text
                        start_idx = response_text.find('[')
                        end_idx = response_text.rfind(']') + 1
                        if start_idx != -1 and end_idx != 0:
                            json_text = response_text[start_idx:end_idx]
                            menu_data = json.loads(json_text)
                        else:
                            raise ValueError("No valid JSON array found in Mistral response")
            except json.JSONDecodeError:
                # Try to find JSON array in the response text
                start_idx = response_text.find('[')
                end_idx = response_text.rfind(']') + 1
                if start_idx != -1 and end_idx != 0:
                    json_text = response_text[start_idx:end_idx]
                    menu_data = json.loads(json_text)
                else:
                    raise ValueError("No valid JSON array found in Mistral response")
            
            # Convert to OCRMenuItem objects
            menu_items = []
            for item_data in menu_data:
                try:
                    # Handle ingredients - convert list to string if needed
                    ingredients = item_data.get('ingredients')
                    if isinstance(ingredients, list):
                        ingredients = ', '.join(str(i) for i in ingredients)
                    elif ingredients is None:
                        ingredients = None
                    else:
                        ingredients = str(ingredients)
                    
                    menu_item = OCRMenuItem(
                        name=str(item_data.get('name', '')).strip(),
                        description=item_data.get('description'),
                        calories=int(item_data.get('calories', 0)),
                        price=float(item_data.get('price', 0.0)),
                        ingredients=ingredients,
                        quantity=item_data.get('quantity'),
                        servings=item_data.get('servings'),
                        veg_flag=bool(item_data.get('veg_flag', True)),
                        kind=item_data.get('kind')
                    )
                    
                    # Validate required fields
                    if not menu_item.name or menu_item.calories <= 0 or menu_item.price <= 0:
                        logger.warning(f"Skipping invalid menu item (missing required fields): {item_data}")
                        continue
                    
                    menu_items.append(menu_item)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Skipping invalid menu item: {item_data}, error: {str(e)}")
                    continue
            
            logger.info(f"Successfully parsed {len(menu_items)} menu items")
            return menu_items
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            raise ValueError(f"Failed to parse JSON response from Mistral: {str(e)}")
        except Exception as e:
            logger.error(f"Error parsing menu with Mistral: {str(e)}")
            raise ValueError(f"Failed to parse menu with Mistral API: {str(e)}")


def parse_menu_file(file_bytes: bytes, file_type: str, filename: str = "file") -> List[OCRMenuItem]:
    """
    Main function to parse menu file (PDF or image) and extract structured menu items.
    
    Args:
        file_bytes: File content as bytes (PDF or image)
        file_type: File type/extension (e.g., 'pdf', 'png', 'jpg')
        filename: Original filename (optional)
        
    Returns:
        List of OCRMenuItem objects matching ItemCreate schema
    """
    ocr_service = OCRService()
    
    # Extract text from file using Mistral OCR API
    ocr_text = ocr_service.extract_text_from_file(file_bytes, file_type, filename)
    
    if not ocr_text.strip():
        raise ValueError(f"No text content found in {file_type} file. Please ensure the file contains readable text.")
    
    # Parse menu using Mistral API to get structured items
    menu_items = ocr_service.parse_menu_with_mistral(ocr_text)
    
    if not menu_items:
        raise ValueError("No menu items could be extracted from the file")
    
    return menu_items


def parse_menu_pdf(file_bytes: bytes) -> List[OCRMenuItem]:
    """
    Legacy function for backward compatibility.
    Parse a menu PDF and extract structured menu items.
    
    Args:
        file_bytes: PDF file content as bytes
        
    Returns:
        List of OCRMenuItem objects
    """
    return parse_menu_file(file_bytes, 'pdf')
