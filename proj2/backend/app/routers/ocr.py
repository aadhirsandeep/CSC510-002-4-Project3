# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List
import logging
import os
from ..schemas import OCRResult, OCRMenuItem, MenuTextRequest
from ..services.ocr import parse_menu_file
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/ocr", tags=["OCR"])
logger = logging.getLogger(__name__)

# Supported file types
SUPPORTED_IMAGE_TYPES = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'}
SUPPORTED_PDF_TYPES = {'.pdf'}
SUPPORTED_FILE_TYPES = SUPPORTED_IMAGE_TYPES | SUPPORTED_PDF_TYPES

def get_file_type(filename: str) -> str:
    """Extract file type from filename."""
    if not filename:
        raise ValueError("Filename is required")
    ext = os.path.splitext(filename.lower())[1]
    if not ext:
        raise ValueError("File must have an extension")
    return ext[1:]  # Remove the dot

@router.post("/parse-menu", response_model=OCRResult)
async def parse_menu_from_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Parse a menu file (PDF or image) and extract structured menu items using OCR and Mistral AI.
    
    Supports:
    - PDF files (.pdf)
    - Image files (.png, .jpg, .jpeg, .gif, .bmp, .tiff, .webp)
    
    Args:
        file: PDF or image file containing the menu
        current_user: Current authenticated user
        
    Returns:
        OCRResult containing list of parsed menu items in JSON format
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Filename is required"
            )
        
        file_ext = os.path.splitext(file.filename.lower())[1]
        
        if file_ext not in SUPPORTED_FILE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported formats: PDF ({', '.join(sorted(SUPPORTED_PDF_TYPES))}) and Images ({', '.join(sorted(SUPPORTED_IMAGE_TYPES))})"
            )
        
        # Read file content
        file_content = await file.read()
        
        if len(file_content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file provided"
            )
        
        # Check file size (limit to 10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size is 10MB"
            )
        
        # Get file type
        file_type = get_file_type(file.filename)
        
        logger.info(f"Processing {file_type.upper()} file: {file.filename} ({len(file_content)} bytes)")
        
        # Parse the file using OCR service
        menu_items = parse_menu_file(file_content, file_type, file.filename)
        
        logger.info(f"Successfully parsed {len(menu_items)} menu items from {file.filename}")
        
        return OCRResult(items=menu_items)
        
    except ValueError as e:
        logger.error(f"OCR parsing error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse menu: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during OCR processing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during menu parsing"
        )

@router.post("/parse-menu-text", response_model=OCRResult)
async def parse_menu_from_text(
    request: MenuTextRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Parse menu text content and extract structured menu items using Mistral AI.
    This endpoint is useful for testing or when you already have extracted text.
    
    Args:
        request: Request body containing text_content field
        current_user: Current authenticated user
        
    Returns:
        OCRResult containing list of parsed menu items
    """
    try:
        text_content = request.text_content
        
        if not text_content.strip():
            raise HTTPException(
                status_code=400,
                detail="Empty text content provided"
            )
        
        logger.info(f"Processing menu text content ({len(text_content)} characters)")
        
        # Import OCRService to use parse_menu_with_mistral directly
        from ..services.ocr import OCRService
        ocr_service = OCRService()
        
        # Parse the text using Mistral API
        menu_items = ocr_service.parse_menu_with_mistral(text_content)
        
        logger.info(f"Successfully parsed {len(menu_items)} menu items from text content")
        
        return OCRResult(items=menu_items)
        
    except ValueError as e:
        logger.error(f"Menu parsing error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse menu text: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during menu text parsing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during menu text parsing"
        )

@router.get("/health")
async def ocr_health_check():
    """
    Health check endpoint for OCR service.
    """
    try:
        # Test Mistral API connection
        from ..services.ocr import OCRService
        ocr_service = OCRService()
        
        # Simple test to verify API key is working using Mistral client
        test_response = ocr_service.client.chat.complete(
            model="mistral-small-latest",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        
        # If we get here, the API is working
        if test_response and test_response.choices:
            return {
                "status": "healthy",
                "mistral_api": "connected",
                "service": "OCR Service"
            }
        else:
            raise Exception("Invalid response from Mistral API")
        
    except Exception as e:
        logger.error(f"OCR health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "mistral_api": "disconnected",
                "error": str(e),
                "service": "OCR Service"
            }
        )
