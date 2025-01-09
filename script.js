let currentRequest = 1;
let totalRequests = 0;
let isCaptchaResolved = false; 
let wafToken = null; 


function showMyCaptcha(onCaptchaResolved) {
    const container = document.querySelector("#my-captcha-container");

    AwsWafCaptcha.renderCaptcha(container, {
        apiKey: window.WAF_API_KEY,
        onSuccess: (token) => {
            console.log("CAPTCHA résolu avec succès !");
            wafToken = token; // Stocker le token pour les requêtes
            isCaptchaResolved = true;
            onCaptchaResolved(token);
        },
        onError: (error) => {
            console.error("Erreur CAPTCHA :", error);
        },
    });
}


async function fetchAndDisplay(index) {
    if (!isCaptchaResolved || !wafToken) {
        console.warn(`Requête ignorée : CAPTCHA non résolu ou token manquant (index ${index})`);
        return;
    }

    try {
        const response = await fetch("https://api.prod.jcloudify.com/whoami", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${wafToken}`, // Inclure le token CAPTCHA
            },
        });

        const outputDiv = document.querySelector("#output");

        if (response.status === 403) {
            const line = document.createElement("div");
            line.textContent = `${index}. Forbidden`;
            outputDiv.appendChild(line);
        } else if (response.status === 200) {
            const line = document.createElement("div");
            line.textContent = `${index}. Accès autorisé`;
            outputDiv.appendChild(line);
        } else {
            console.error(`Erreur API (status: ${response.status})`);
        }
    } catch (error) {
        console.error(`Erreur réseau à l'index ${index}:`, error);
    }
}

async function processSequence() {
    while (currentRequest <= totalRequests) {
        if (!isCaptchaResolved || !wafToken) {
            console.log("En attente de la résolution du CAPTCHA...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
        }

        await fetchAndDisplay(currentRequest);
        currentRequest++;

      
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Séquence terminée !");
}


document.querySelector("#number-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const input = document.querySelector("#number-input");
    const value = parseInt(input.value, 10);

    if (isNaN(value) || value < 1 || value > 1000) {
        alert("Veuillez entrer un nombre entre 1 et 1 000.");
        return;
    }

    totalRequests = value;
    currentRequest = 1;

    
    document.querySelector("#number-form").style.display = "none";
    document.querySelector("#output").innerHTML = "";


    if (isCaptchaResolved && wafToken) {
        processSequence();
    } else {
        showMyCaptcha(() => {
            console.log("CAPTCHA résolu, démarrage de la séquence.");
            processSequence();
        });
    }
});


window.addEventListener("captcha-required", () => {
    console.log("CAPTCHA requis. Réinitialisation du token.");
    isCaptchaResolved = false;
    wafToken = null;

    showMyCaptcha((token) => {
        console.log("CAPTCHA résolu avec succès !");
        wafToken = token;
        isCaptchaResolved = true;
    });
});
