FROM python:3.10.5-slim-buster

WORKDIR /app_demo

COPY . . 
RUN pip3 install --no-cache-dir -r requirements.txt

CMD [ "uvicorn", "main:app",  "--host", "0.0.0.0", "--port", "8000" ]
