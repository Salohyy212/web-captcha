let currentRequest = 1;
let totalRequests = 0;
let isCaptchaResolved = true;

// Fonction pour afficher le CAPTCHA
function showMyCaptcha(onCaptchaResolved) {
    const container = document.querySelector("#my-captcha-container");

    AwsWafCaptcha.renderCaptcha(container, {
        apiKey: window.WAF_API_KEY,
        onSuccess: (wafToken) => {
            isCaptchaResolved = true;
            onCaptchaResolved(wafToken);
        },
        onError: (error) => {
            console.error("Erreur CAPTCHA :", error);
        }
    });
}

// Fonction pour effectuer une requête GET et afficher "Forbidden"
async function fetchAndDisplay(index) {
    if (!isCaptchaResolved) {
        console.log("En attente de la résolution du CAPTCHA...");
        return;
    }

    try {
        const response = await fetch("https://api.prod.jcloudify.com/whoami");
        if (response.status === 403) {
            const outputDiv = document.querySelector("#output");
            const line = document.createElement("div");
            line.textContent = `${index}. Forbidden`;
            outputDiv.appendChild(line);
        } else if (response.status === 200) {
            console.log("Accès autorisé, mais réponse inattendue");
        } else {
            console.error("Erreur API :", response.status);
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
    }
}

// Fonction principale pour gérer la séquence
async function processSequence() {
    while (currentRequest <= totalRequests) {
        if (!isCaptchaResolved) {
            // Si CAPTCHA non résolu, on attend avant de continuer
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

    if (value < 1 || value > 1000) {
        alert("Veuillez entrer un nombre entre 1 et 1 000.");
        return;
    }

    totalRequests = value;
    currentRequest = 1;

    // Supprime le formulaire et affiche la sortie
    document.querySelector("#number-form").style.display = "none";
    document.querySelector("#output").innerHTML = "";

    // Démarre la séquence
    processSequence();
});

// Intercepte les erreurs CAPTCHA
window.addEventListener("captcha-required", () => {
    isCaptchaResolved = false;

    showMyCaptcha((wafToken) => {
        console.log("CAPTCHA résolu avec succès !");
        isCaptchaResolved = true;
    });
});
