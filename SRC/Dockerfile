# Use official Python 3.11.8 slim image as a base
FROM python:3.11.8-slim-bullseye AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Create virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install system dependencies (ADD git and openjdk-11-jre HERE)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    gcc \
    openjdk-11-jre \
    wkhtmltopdf \
    fonts-noto-cjk fonts-noto-hinted \
    xfonts-75dpi xfonts-base \
    libxrender1 libxext6 libssl1.1 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy local wheel packages first
COPY ./sentan_tools_code-0.0.1-py3-none-any.whl .
COPY ./sentan_tools_utils-1.1.0-py3-none-any.whl .
COPY ./sentan_tools_nlp-0.1.1-py3-none-any.whl .

# Copy CEC_DocifyCode_Common package (needed for editable install)
COPY ./CEC_DocifyCode_Common ./CEC_DocifyCode_Common

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn[standard]

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create a non-root user to run the app
RUN addgroup --gid 1001 --system uvicorn && \
    adduser --gid 1001 --shell /bin/false --disabled-password --uid 1001 uvicorn

# Change ownership to the uvicorn user
RUN chown -R uvicorn:uvicorn /app

# Expose port
EXPOSE 8000

# Run the application with Uvicorn as the uvicorn user
CMD ["runuser", "-u", "uvicorn", "--", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--loop", "uvloop", "--reload"]
