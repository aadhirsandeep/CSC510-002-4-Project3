import os
import sys
from datetime import datetime

# -- Path setup --------------------------------------------------------------
# Add project root so autodoc can import 'app'
sys.path.insert(0, os.path.abspath('../../'))

# -- Project information -----------------------------------------------------
project = 'Cafe Calories API'
author = 'Group 2'
copyright = f"{datetime.now().year}, Group 2"

# -- General configuration ---------------------------------------------------
extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx.ext.viewcode',
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# -- Options for HTML output -------------------------------------------------
html_theme = 'alabaster'
html_static_path = ['_static']
