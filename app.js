require('dotenv').config();

const express = require('express');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

let browser;

async function startBrowser() {
    browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ],
    });
    console.log('Puppeteer browser started.');
}

async function stopBrowser() {
    if (browser) {
        await browser.close();
        console.log('Puppeteer browser closed.');
    }
}

async function fetchWithPuppeteer(url) {
    const page = await browser.newPage();
    try {
        await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
        const bodyText = await page.evaluate(() => document.body.innerText);

        try {
            return JSON.parse(bodyText);
        } catch (error) {
            console.error(`Error parsing JSON from ${url}:`, error.message);
            console.error('Response snippet:', bodyText.slice(0, 500));
            throw new Error('Invalid JSON response from API.');
        }
    } catch (error) {
        console.error(`Puppeteer error loading ${url}:`, error.message);
        throw error;
    } finally {
        await page.close();
    }
}

async function verifyProperty(lat, lng) {
    try {
        console.log(`Verifying property at lat: ${lat}, lng: ${lng}`);
        const baseUrl = `https://epok.buenosaires.gob.ar/catastro/parcela/?lng=${lng}&lat=${lat}`;
        const data = await fetchWithPuppeteer(baseUrl);

        if (data.propiedad_horizontal === "Si") {
            const phData = await fetchWithPuppeteer(`${baseUrl}&ph`);
            if (phData.phs && phData.phs.length > 0) {
                return { status: 'success', message: 'La partida existe', phs: phData.phs };
            } else {
                return { status: 'error', message: 'La partida no existe (sin unidades funcionales)' };
            }
        } else if (data.pdamatriz) {
            return { status: 'success', message: 'La partida existe', pdamatriz: data.pdamatriz };
        }

        return { status: 'error', message: 'La partida no existe' };
    } catch (error) {
        console.error('Error verifying property:', error.message);
        throw error;
    }
}

async function fetchAblData(lat, lng) {
    try {
        console.log(`Fetching ABL data for lat: ${lat}, lng: ${lng}`);
        const baseUrl = `https://epok.buenosaires.gob.ar/catastro/parcela/?lng=${lng}&lat=${lat}`;
        const data = await fetchWithPuppeteer(baseUrl);

        if (data.propiedad_horizontal === "Si") {
            const phData = await fetchWithPuppeteer(`${baseUrl}&ph`);
            return phData.phs ? phData.phs.map(ph => ({
                pdahorizontal: ph.pdahorizontal,
                piso: ph.piso,
                dpto: ph.dpto
            })) : null;
        } else if (data.pdamatriz) {
            return data.pdamatriz;
        }

        return null;
    } catch (error) {
        console.error('Error fetching ABL data:', error.message);
        throw error;
    }
}

async function sendEmail(email, data) {
    let dataText, dataHtml;

    if (Array.isArray(data)) {
        const formatted = data.map(item => `Partida: ${item.pdahorizontal}, Piso: ${item.piso}, Dpto: ${item.dpto}`).join('\n');
        const formattedHtml = data.map(item => `<li>Partida: <b>${item.pdahorizontal}</b>, Piso: <b>${item.piso}</b>, Dpto: <b>${item.dpto}</b></li>`).join('');

        dataText = `Los números de partida son:\n${formatted}\n\nEste correo fue generado automáticamente.`;
        dataHtml = `
            <div style="padding: 1rem; text-align: center;">
                <img src="${process.env.LOGO_URL}" style="width: 100%; padding: 1rem;" alt="Logo">
                <p>Los números de partida son:</p>
                <ul style="text-align: left; padding-left: 2rem;">
                    ${formattedHtml}
                </ul>
                <hr>
                <p>Puedes utilizar esta información para realizar consultas adicionales <a href="${process.env.REFERENCE_URL}">haciendo clic acá.</a></p>
                <p style="margin-top: 1rem; font-size: 0.8rem; font-style: italic;">Este correo fue generado automáticamente.</p>
            </div>
        `;
    } else {
        dataText = `El número de partida es:\n${data}\n\nEste correo fue generado automáticamente.`;
        dataHtml = `
            <div style="padding: 1rem; text-align: center;">
                <img src="${process.env.LOGO_URL}" style="width: 100%; padding: 1rem;" alt="Logo">
                <p>El número de partida es:<br><b>${data}</b></p>
                <hr>
                <p>Puedes utilizar esta información para realizar consultas adicionales <a href="${process.env.REFERENCE_URL}">haciendo clic acá.</a></p>
                <p style="margin-top: 1rem; font-size: 0.8rem; font-style: italic;">Este correo fue generado automáticamente.</p>
            </div>
        `;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        }
    });

    const mailOptions = {
        from: `"Consultas ABL" <${process.env.SMTP_FROM}>`,
        to: email,
        bcc: process.env.SMTP_BCC,
        subject: "Consulta de ABL",
        text: dataText,
        html: dataHtml
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error.message);
        throw error;
    }
}

app.use(express.json());

app.post('/fetch-abl-data', async (req, res) => {
    const { lat, lng, email } = req.body;
    try {
        const result = await fetchAblData(lat, lng);
        if (result) {
            await sendEmail(email, result);
            res.send({ message: 'Email enviado con éxito', result });
        } else {
            res.status(500).send({ error: 'No se pudo obtener la información de la partida.' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Error procesando la solicitud' });
    }
});

app.post('/verification', async (req, res) => {
    const { lat, lng } = req.body;
    try {
        const result = await verifyProperty(lat, lng);
        res.send(result);
    } catch (error) {
        res.status(500).send({ status: 'error', message: 'Error verificando la existencia de la partida' });
    }
});

startBrowser()
    .then(() => {
        const server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

        server.setTimeout(30000);

        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await stopBrowser();
            process.exit();
        });
    })
    .catch(error => {
        console.error('Error starting Puppeteer:', error.message);
        process.exit(1);
    });