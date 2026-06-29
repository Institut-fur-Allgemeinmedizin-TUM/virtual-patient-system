VENV := mri_env

# 2. Define the paths to the venv's python and pip executables
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
EXPO_PUBLIC_BACKEND_URL := http://localhost:8000
# 3. Default target when you just type 'make'
.PHONY: all run clean venv
all: run

# 4. Rule to create the virtual environment and install requirements
# It checks if requirements.txt is newer than the activate script to trigger an update
$(VENV)/bin/activate: requirements.txt
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	touch $(VENV)/bin/activate

# Alias to just setup the environment
setup-venv: $(VENV)/bin/activate


run-backend: setup-venv
	uvicorn app.main:app --reload

setup-frontend:
	cd mobile && npm install --exact

run-frontend: setup-frontend
	cd mobile && EXPO_PUBLIC_BACKEND_URL=$(EXPO_PUBLIC_BACKEND_URL) npm run web

format:	setup-venv setup-frontend
	black app
	cd mobile && npm run format

run-test: setup-venv
	$(PIP) install -r requirements-test.txt
	$(PYTHON) -m pytest tests/backend --cov=app/api --cov-report=term-missing --cov-report=xml --cov-fail-under=60

build-docs:
	cd docs && npm ci
	cd docs && npm run build

# 7. Clean up the environment and cached files
clean:
	rm -rf $(VENV)
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf mobile/node_modules

build-apk: setup-frontend
	cd mobile && EXPO_PUBLIC_BACKEND_URL=$(EXPO_PUBLIC_BACKEND_URL) npx expo prebuild -p android --clean
	cd mobile/android && EXPO_PUBLIC_BACKEND_URL=$(EXPO_PUBLIC_BACKEND_URL) ./gradlew assembleRelease