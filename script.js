let currentRequest = 1;
let totalRequests = 0;
let isCaptchaResolved = false; // Initialisé à false
let wafToken = null; // Initialisé à null

// Fonction pour afficher le CAPTCHA
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

// Fonction pour effectuer une requête GET et afficher "Forbidden"
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

// Fonction principale pour gérer la séquence
async function processSequence() {
    while (currentRequest <= totalRequests) {
        if (!isCaptchaResolved || !wafToken) {
            // Si CAPTCHA non résolu ou token manquant, on attend avant de continuer
            console.log("En attente de la résolution du CAPTCHA...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
        }

        await fetchAndDisplay(currentRequest);
        currentRequest++;

        // Temporisation de 1 seconde entre chaque requête
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Séquence terminée !");
}

// Gestionnaire de soumission du formulaire
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

    // Supprime le formulaire et affiche la sortie
    document.querySelector("#number-form").style.display = "none";
    document.querySelector("#output").innerHTML = "";

    // Si le CAPTCHA est déjà résolu, démarre immédiatement
    if (isCaptchaResolved && wafToken) {
        processSequence();
    } else {
        // Sinon, affiche le CAPTCHA et démarre après résolution
        showMyCaptcha(() => {
            console.log("CAPTCHA résolu, démarrage de la séquence.");
            processSequence();
        });
    }
});

// Intercepte les erreurs CAPTCHA
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
