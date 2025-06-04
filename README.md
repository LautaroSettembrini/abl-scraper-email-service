# ABL Invoice Scraper (Demo Version)

This Node.js microservice automates the retrieval of ABL invoice information from a public-facing web system and sends the results via email.

🚨 **This is a demo version meant for portfolio purposes only. It contains no real credentials and is not intended for production use.**

---

## Features

- Web scraping of invoice data using Puppeteer  
- Email delivery of formatted results using Nodemailer  
- Minimal API with Express.js  
- Environment-based configuration with dotenv

---

## 📦 Technologies Used

- **Node.js** + **Express.js**
- **Puppeteer** for headless scraping
- **Nodemailer** for SMTP delivery
- **dotenv** for config
- **helmet**, **cors**, **morgan** for improved security and logging

---

## 🔧 Setup

```bash
git clone https://github.com/yourusername/abl-email-invoice-api-demo.git
cd abl-email-invoice-api-demo
npm install
```

Create a `.env` file based on `.env.example`.

---

## ▶️ Run (locally)

```bash
node app.js
```

The service will start on `http://localhost:3000` or your configured port.

---

## 🐳 Run with Docker

This project includes a Dockerfile. To build and run the container:

```bash
docker build -t abl-invoice-demo .
docker run -p 3000:3000 --env-file .env abl-invoice-demo
```

---

## License

All rights reserved.  
This code is published for **demonstration purposes only** and may **not be reused, redistributed, or modified** for commercial use or production deployments.