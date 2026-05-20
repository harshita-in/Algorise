FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Set work directory
WORKDIR /app

# Copy requirements file first to cache layers
COPY requirements.txt /app/requirements.txt

# Install dependencies. PyTorch CPU-only is installed via its dedicated wheel index to keep the container small.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Copy project files
COPY . /app

# Hugging Face Spaces requires running as a non-root user (UID 1000).
# Create a user and grant permissions to /app.
RUN useradd -m -u 1000 user && \
    chown -R user:user /app

USER user

# Expose Hugging Face default port
EXPOSE 7860

# Run FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
