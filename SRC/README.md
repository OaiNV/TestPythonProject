# CEC DocifyCode

Document and source code management application using FastAPI and MongoDB.

## Project Structure

```
CEC-DocifyCode/
├── main.py                 # Main entry point
├── config_gateway.py      # API Gateway configuration
├── requirements.txt       # Dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
├── plantuml.jar          # PlantUML JAR file for generating diagram images
├── CEC_DocifyCode_Common/               # Git submodule: CEC_DocifyCode_Common (MQTT and shared components)
│   ├── mqtt/             # MQTT client module
│   │   ├── mqtt_client.py
│   │   ├── api_routes.py
│   │   └── config/
│   ├── __init__.py
│   ├── setup.py
│   └── README.md
├── app/
│   ├── core/             # Core functionality
│   │   ├── database.py   # MongoDB connection
│   │   ├── security.py   # Authentication & authorization
│   │   ├── logging.py    # Logging configuration
│   │   └── gateway.py    # API Gateway core
│   ├── models/           # Database models (MongoDB)
│   │   ├── base.py       # Base model class
│   │   ├── user.py       # User model
│   │   └── project.py    # Project model
│   ├── schemas/          # Pydantic schemas (DTOs)
│   │   ├── base.py       # Base schemas
│   │   ├── user.py       # User schemas
│   │   ├── project.py    # Project schemas
│   │   └── ...           # All collection schemas
│   ├── api/              # API endpoints
│   │   ├── deps.py       # Dependencies
│   │   ├── router.py     # API router management
│   │   └── v1/           # API version 1
│   │       ├── users.py
│   │       ├── projects.py
│   │       └── ...       # All service routers
│   ├── services/         # Business logic
│   │   ├── user_service.py
│   │   ├── project_service.py
│   │   └── ...           # All service implementations
│   └── utils/            # Utility functions
│       └── helpers.py
├── design_task_service/  # MQTT-based design task processing service
│   ├── __init__.py
│   ├── README.md         # Service documentation
│   ├── config.py         # Topic routing and subscriptions
│   ├── mqtt_service.py   # MQTT service integration
│   ├── subscriber.py     # Main MQTT subscriber service
│   ├── handlers/         # Message handlers for each topic
│   │   ├── __init__.py
│   │   ├── code_generation_handler.py
│   │   ├── gitinfo_handler.py
│   │   ├── status_handler.py
│   │   ├── task_management_handler.py
│   │   └── task_registration_handler.py
│   ├── schemas/          # Pydantic schemas for message validation
│   │   ├── __init__.py
│   │   ├── code_generation_schema.py
│   │   ├── gitinfo_schema.py
│   │   ├── status_schema.py
│   │   ├── task_management_schema.py
│   │   └── task_registration_schema.py
│   └── test_*.py         # Test files
├── static/               # Static files (CSS, JS, images)
├── templates/            # HTML templates
├── mongodb-init/         # MongoDB initialization scripts
├── antlr_parser/         # ANTLR parser tools
└── tests/                # Test files (to be created)
```

## API Gateway

The application includes a comprehensive API Gateway providing:

- **Centralized Routing**: All API requests go through the gateway
- **Rate Limiting**: Configurable rate limits for each endpoint
- **Middleware Stack**: CORS, authentication, logging, error handling
- **Request Monitoring**: Comprehensive request/response logging
- **Error Handling**: Global exception handling with standardized responses



## Installation

1. **Clone repository with submodules:**

```bash
# Clone with submodules
git clone --recurse-submodules <repository-url>
# Or
git clone -b <branch-name> --recurse-submodules <repository-url>


# Or if already cloned, initialize submodules
git submodule update --init --recursive
```

2. **Install dependencies:**

```bash
# Create virtual environment
python -m venv myenv

# Activate virtual environment
# Windows:
myenv/Scripts/activate
# macOS/Linux:
source myenv/bin/activate

pip install pre-commit pylint
pip install -r requirements.txt
pre-commit install
```

2. **Install Java (Required for PlantUML):**

Java is required to run `plantuml.jar` for generating PlantUML diagram images (activity diagrams in detail design documents).

- **Windows (Local development without Docker):**
  1. Download Java 8: https://www.oracle.com/java/technologies/downloads/#java8-windows
  2. Install Java
  3. Update `.env` file: `JAVA_PATH=C:\Program Files\Java\jdk1.8.0_XXX\bin\java.exe` (or your Java installation path)

- **Mac/Linux (Local development without Docker):**
  1. Install Java: `brew install openjdk@8` (Mac) or use your package manager
  2. Update `.env` file: `JAVA_PATH=/usr/bin/java` (or your Java installation path)

- **Note:** If running with Docker, Java is already installed in the container (`openjdk-11-jre`), so you can remove `JAVA_PATH` from `.env` file.

3. **PlantUML JAR file:**

The project includes `plantuml.jar` in the root directory. This file is used to generate PNG images from PlantUML code for activity diagrams in detail design documents.

- The `plantuml.jar` file must be present in the project root directory
- Java is required to execute this JAR file (see step 2 above)
- The application automatically locates `plantuml.jar` at runtime

4. **Configure environment:**

The app uses a `.env` file in the root directory. If the `.env` file doesn't exist, create it:

```bash
# Create .env file in root directory
touch .env
```

Add the required environment variables to the `.env` file from `env.example`

**Important notes:**
- If running with Docker, remove `JAVA_PATH` from `.env` (Java is pre-installed in container)
- If running locally, ensure `JAVA_PATH` points to your Java executable
- Ensure `plantuml.jar` exists in the project root directory

```

5. **Run MongoDB:**

```bash
# Using Docker
docker-compose up --build -d mongodb
```

6. **Run the application:**

```bash
python main.py
```

## Running with Docker

**Run the application:**

```bash
# Ensure .env file exists in root directory
docker-compose up --build -d cec_docifycode
```

**Note:**

- Docker compose will automatically use the `.env` file from the root directory
- App runs on port 8000
- MongoDB runs on port 27017
- Uses environment variables from `.env` file with default values

**Stop services:**

```bash
docker-compose down
```

**Check logs:**

```bash
# View app logs
docker-compose logs -f cec_docifycode

# View MongoDB logs
docker-compose logs -f mongodb
```

**Rebuild and restart:**

```bash
# Rebuild image and restart
docker-compose up -d --build

# Restart app only
docker-compose restart cec_docifycode
```

## API Endpoints

### Users

- `GET /api/users/` - Get list of users (admin only)
- `GET /api/users/me` - Get current user information
- `POST /api/users/` - Create new user (admin only)

## Features

- ✅ FastAPI framework
- ✅ MongoDB with Motor (async driver)
- ✅ Pydantic for data validation
- ✅ JWT authentication (ready)
- ✅ Password hashing with bcrypt
- ✅ Logging with detailed configuration
- ✅ Rate limiting
- ✅ CORS support
- ✅ Pagination
- ✅ Soft delete
- ✅ Error handling
- ✅ PlantUML diagram generation (requires Java and plantuml.jar)

## Main Features

| Feature      | Description                                  |
| -------------- | -------------------------------------- |
| Database       | MongoDB with Motor (async driver)       |
| Framework      | FastAPI                                |
| Authentication | JWT (can integrate Azure AD)         |
| Logging        | Standard logging with detailed configuration |
| Models         | Pydantic models                        |
| Async          | Full async/await                       |
| API Gateway    | Rate limiting, CORS, middleware        |
| Frontend       | HTML templates with Jinja2              |


## IV. Coding convention

### 2. Html/Css/Javascript style

- Css class name: [hyphens]

  ```html
  <element class="my-string" ...></element>
  ```

- Element id, name: [camelCase]

  ```html
  <element id="btnShare" name="btnShare" ...></element>
  ```

- Js variable: [camelCase]

  ```javascript
  var myString = "";
  ```

### 3. Rules for using javascript

- Style based on [ES6](https://www.w3schools.com/js/js_es6.asp) (newest is ES2024):

  - The let keyword allows you to declare a variable with block scope: `let x = 2;`
  - The const keyword allows you to declare a constant (a JavaScript variable with a constant value): `const x = 2;`
  - Arrow functions allows a short syntax for writing function expressions: `const x = (x, y) => x * y;`
  - ...

- Show message: use toast for success case, else dialog

  ```javascript
  // Success case — use toast
  showAlert("...", "success");

  // Error or warning case — use dialog
  showAlert("...", "error");
  ```

- call api-request:

  ```javascript
  // Config
  const CONFIG = {
    API_BASE_URL: "/api",
    ENDPOINT: "/endpoint",
  };

  function getAuthToken() {
    return localStorage.getItem("access_token") || "";
  }
  ```

  ```javascript
  // Fetch pattern
  const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINT}`, {
    method: "GET|POST|PUT|DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data), // for POST/PUT
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  ```

- Show/hide loader

  ```javascript
  showLoading();
  hideLoading();
  ```

- Confirm modal

  ```javascript
  // Basic confirmation
  const confirmed = await confirm(
    "削除確認",
    "この項目を削除してもよろしいですか？"
  );
  if (confirmed) {
    // User clicked OK - proceed with action
  }
  ```

### 4. Rules for Python

**Backend Error Handling:**

```python
from app.core.error_messages import get_error_detail

# Standard error
raise HTTPException(
    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    detail=get_error_response(400).dict()
)

# Custom error message
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail=get_error_response(400, "ユーザーの作成に失敗しました").dict()
)
```

## Git Submodule Management

This project uses Git submodules to manage shared components (cec_common).

### Initial Setup

When cloning the repository for the first time:

```bash
# Option 1: Clone with submodules
git clone --recurse-submodules <repository-url>

# Option 2: Initialize submodules after cloning
git clone <repository-url>
cd CEC-DocifyCode
git submodule update --init --recursive
```

### Updating Submodules

To update the submodule to the latest version:

```bash
# Update to latest commit on main branch
cd common
git pull origin main
cd ..

# Stage and commit the submodule update
git add common
git commit -m "Update cec_common submodule"
git push
```

### Working with Submodules

```bash
# Check submodule status
git submodule status

# Update all submodules to their latest commits
git submodule update --remote

# Make changes in submodule
cd common
# ... make changes ...
git add .
git commit -m "Update MQTT client"
git push origin main
cd ..
git add common
git commit -m "Update cec_common submodule reference"
```

### Common Issues

**Issue:** `ModuleNotFoundError: No module named 'common'`

**Solution:** Initialize and update submodules:
```bash
git submodule update --init --recursive
```

**Issue:** Submodule shows uncommitted changes

**Solution:** This is normal if you've made changes in the submodule. Commit and push changes from within the submodule directory.

For more information about the common module, see the [cec_common README](cec_common/README.md).
